/**
 * The in-memory Repository.
 *
 * Three jobs: it is the test double every brick's suite runs against, it lets a
 * brick be demoed in a project with no database at all, and it is the reference
 * that pins down what the conformance suite means. A Firestore or SQL adapter is
 * correct exactly when it passes the same suite.
 *
 * Deliberately behaves like a *document store*, not like a JavaScript object
 * graph: reads and writes deep-clone, so a caller mutating a returned entity
 * cannot corrupt the store the way it never could across a network.
 */

import type { Entity, ISODateTime, Page, Query, Repository } from '../host/contract';
import { QueryError, evaluateQuery, validateQuery } from '../domain/query';

export class ConflictError extends Error {
  constructor(
    message: string,
    readonly expectedVersion: number,
    readonly actualVersion: number,
  ) {
    super(`kernel: ${message}`);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(collection: string, id: string) {
    super(`kernel: ${collection}/${id} not found`);
    this.name = 'NotFoundError';
  }
}

/** A document store's `getMany` is bounded by the same limit as `in`. */
export const MAX_GET_MANY = 10;

export interface MemoryRepositoryOptions {
  /** Injected so tests are deterministic and fixtures reproducible. */
  now?: () => ISODateTime;
  /** Injected so ids are deterministic in tests. */
  nextId?: () => string;
  /** Rows to start from, e.g. seed data. */
  seed?: readonly Entity[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

let autoId = 0;

export class MemoryRepository<T extends Entity> implements Repository<T> {
  private readonly rows = new Map<string, T>();
  private readonly now: () => ISODateTime;
  private readonly nextId: () => string;

  constructor(
    private readonly collection: string,
    options: MemoryRepositoryOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.nextId = options.nextId ?? (() => `${collection}_${++autoId}`);
    for (const row of options.seed ?? []) this.rows.set(row.id, clone(row) as T);
  }

  async get(id: string): Promise<T | null> {
    const row = this.rows.get(id);
    return row ? clone(row) : null;
  }

  async getMany(ids: readonly string[]): Promise<T[]> {
    if (ids.length > MAX_GET_MANY) {
      throw new QueryError(
        `getMany accepts at most ${MAX_GET_MANY} ids (a document store's limit); got ${ids.length}`,
      );
    }
    // Unordered and sparse, exactly like a document store's batch read: missing
    // ids are omitted rather than returned as null, so callers cannot rely on
    // positional correspondence.
    const out: T[] = [];
    for (const id of ids) {
      const row = this.rows.get(id);
      if (row) out.push(clone(row));
    }
    return out;
  }

  async list(query: Query<T>): Promise<Page<T>> {
    const page = evaluateQuery([...this.rows.values()], query);
    return { ...page, items: page.items.map((i) => clone(i)) };
  }

  async create(value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>): Promise<T> {
    const id = value.id || this.nextId();
    if (this.rows.has(id)) {
      throw new ConflictError(`${this.collection}/${id} already exists`, 0, 1);
    }
    const timestamp = this.now();
    const row = { ...clone(value), id, createdAt: timestamp, updatedAt: timestamp, version: 1 } as T;
    this.rows.set(id, row);
    return clone(row);
  }

  async update(id: string, patch: Partial<T>, opts?: { expectedVersion?: number }): Promise<T> {
    const current = this.rows.get(id);
    if (!current) throw new NotFoundError(this.collection, id);

    if (opts?.expectedVersion !== undefined && opts.expectedVersion !== current.version) {
      throw new ConflictError(
        `${this.collection}/${id} was modified concurrently`,
        opts.expectedVersion,
        current.version,
      );
    }

    // id, createdAt and version are owned by the store, never by a patch.
    const { id: _id, createdAt: _createdAt, version: _version, ...safe } = patch as Partial<Entity>;
    const next = {
      ...current,
      ...clone(safe),
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: this.now(),
      version: current.version + 1,
    } as T;

    this.rows.set(id, next);
    return clone(next);
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id); // idempotent, like a document store's delete
  }

  /**
   * The portable uniqueness primitive.
   *
   * Document stores have no unique indexes, so every uniqueness constraint in
   * this system becomes a deterministic id plus this call. It maps onto a
   * document store's create-fails-if-exists and SQL's ON CONFLICT DO NOTHING,
   * and it is what lets a booking flow prevent double-booking without requiring
   * transactions the target's store may not offer.
   */
  async createIfAbsent(
    id: string,
    value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<{ entity: T; created: boolean }> {
    const existing = this.rows.get(id);
    if (existing) return { entity: clone(existing), created: false };

    const timestamp = this.now();
    const row = { ...clone(value), id, createdAt: timestamp, updatedAt: timestamp, version: 1 } as T;
    this.rows.set(id, row);
    return { entity: clone(row), created: true };
  }

  /** Test affordance; not part of the port. */
  async _all(): Promise<T[]> {
    return [...this.rows.values()].map((r) => clone(r));
  }

  /** Test affordance; not part of the port. */
  _clear(): void {
    this.rows.clear();
  }
}

/** Build a set of repositories sharing one clock and id generator. */
export function createMemoryStore(options: MemoryRepositoryOptions = {}) {
  const repos = new Map<string, MemoryRepository<Entity>>();
  return {
    repo<T extends Entity>(collection: string): MemoryRepository<T> {
      let existing = repos.get(collection);
      if (!existing) {
        existing = new MemoryRepository<Entity>(collection, options);
        repos.set(collection, existing);
      }
      return existing as unknown as MemoryRepository<T>;
    },
    reset() {
      for (const repo of repos.values()) repo._clear();
    },
  };
}

export { QueryError, validateQuery };
