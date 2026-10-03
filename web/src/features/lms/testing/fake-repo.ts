/**
 * A minimal in-memory Repository, for this brick's own tests.
 *
 * The `kernel` brick has a fuller implementation, and this deliberately does
 * not import it: bricks cannot import each other under a copy-only installer,
 * so a test double that reached across would make this module fail to compile
 * the moment it was installed anywhere.
 *
 * That is a real cost of the rule and worth naming rather than hiding. It is
 * paid here because the alternative — a brick whose tests cannot run in the
 * target that received it — is worse. The surface is small, it implements the
 * same port, and any behaviour that actually matters is pinned by the kernel's
 * conformance suite rather than by this file.
 */

import type { Entity, Page, Query, Repository } from '../host/contract';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function matches(row: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;
  for (const [field, raw] of Object.entries(where)) {
    if (raw === undefined || raw === null || typeof raw !== 'object') continue;
    const cond = raw as Record<string, unknown>;
    const actual = row[field];

    if ('eq' in cond && actual !== cond['eq']) return false;
    if ('in' in cond && !(cond['in'] as unknown[]).includes(actual)) return false;
    if ('gte' in cond && compare(actual, cond['gte']) < 0) return false;
    if ('lte' in cond && compare(actual, cond['lte']) > 0) return false;
  }
  return true;
}

export class FakeRepository<T extends Entity> implements Repository<T> {
  private readonly rows = new Map<string, T>();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  async get(id: string): Promise<T | null> {
    const row = this.rows.get(id);
    return row ? clone(row) : null;
  }

  async getMany(ids: readonly string[]): Promise<T[]> {
    const out: T[] = [];
    for (const id of ids) {
      const row = this.rows.get(id);
      if (row) out.push(clone(row));
    }
    return out;
  }

  async list(query: Query<T>): Promise<Page<T>> {
    const all = [...this.rows.values()].filter((r) =>
      matches(r as unknown as Record<string, unknown>, query.where as Record<string, unknown> | undefined),
    );

    const field = query.orderBy?.field;
    const dir = query.orderBy?.dir === 'desc' ? -1 : 1;
    all.sort((a, b) => {
      if (field) {
        const cmp = compare(
          (a as unknown as Record<string, unknown>)[field],
          (b as unknown as Record<string, unknown>)[field],
        );
        if (cmp !== 0) return cmp * dir;
      }
      return compare(a.id, b.id) * dir;
    });

    return { items: all.slice(0, query.limit).map((r) => clone(r)) };
  }

  async create(value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>): Promise<T> {
    const at = this.now();
    const row = { ...clone(value), createdAt: at, updatedAt: at, version: 1 } as T;
    this.rows.set(row.id, row);
    return clone(row);
  }

  async update(id: string, patch: Partial<T>, opts?: { expectedVersion?: number }): Promise<T> {
    const current = this.rows.get(id);
    if (!current) throw new Error(`lms: ${id} not found`);
    if (opts?.expectedVersion !== undefined && opts.expectedVersion !== current.version) {
      throw new Error(`lms: ${id} was modified concurrently`);
    }
    const { id: _i, createdAt: _c, version: _v, ...safe } = patch as Partial<Entity>;
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
    this.rows.delete(id);
  }

  async createIfAbsent(
    id: string,
    value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<{ entity: T; created: boolean }> {
    const existing = this.rows.get(id);
    if (existing) return { entity: clone(existing), created: false };
    const at = this.now();
    const row = { ...clone(value), id, createdAt: at, updatedAt: at, version: 1 } as T;
    this.rows.set(id, row);
    return { entity: clone(row), created: true };
  }
}
