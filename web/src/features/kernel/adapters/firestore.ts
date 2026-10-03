/**
 * The Firestore Repository.
 *
 * Ships inside the brick, alongside the in-memory one, because an adapter in a
 * separate brick would have to import this brick's types — an escaping import
 * that makes a module unresolvable once copied.
 *
 * Nothing brick-internal imports this file. Only a host's composition file does,
 * which is what keeps `firebase-admin` out of a bundle in a project that uses
 * something else. Rule R6 enforces that.
 *
 * The Firestore SDK is not imported here either. The host passes in a minimal
 * structural view of the collection API it already has configured, so this file
 * has no dependency to install, no version to agree on, and no opinion about how
 * the host authenticates to Google.
 */

import type { Entity, Page, Query, Repository } from '../host/contract';
import { QueryError, validateQuery } from '../domain/query';

/* ------------------------------------------------------------------ the seam */

/**
 * The slice of Firestore this adapter uses, described structurally.
 *
 * `admin.firestore.Firestore` satisfies this without a cast, and so does the
 * emulator, and so does a hand-written fake — which is how the conformance suite
 * runs against this file without a network.
 */
export interface FirestoreLike {
  collection(path: string): CollectionLike;
}

export interface CollectionLike {
  doc(id: string): DocumentLike;
  where(field: string, op: string, value: unknown): QueryLike;
  orderBy(field: string, direction?: 'asc' | 'desc'): QueryLike;
  limit(n: number): QueryLike;
  get(): Promise<QuerySnapshotLike>;
}

export interface QueryLike {
  where(field: string, op: string, value: unknown): QueryLike;
  orderBy(field: string, direction?: 'asc' | 'desc'): QueryLike;
  limit(n: number): QueryLike;
  startAfter(...values: unknown[]): QueryLike;
  get(): Promise<QuerySnapshotLike>;
}

export interface QuerySnapshotLike {
  docs: DocumentSnapshotLike[];
}

export interface DocumentSnapshotLike {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface DocumentLike {
  get(): Promise<DocumentSnapshotLike>;
  set(data: Record<string, unknown>): Promise<unknown>;
  /** Must reject when the document already exists — this is the uniqueness primitive. */
  create(data: Record<string, unknown>): Promise<unknown>;
  update(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}

export class ConflictError extends Error {
  constructor(message: string) {
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

export const MAX_GET_MANY = 10;

export interface FirestoreRepositoryOptions {
  now?: () => string;
}

/* ------------------------------------------------------------- the adapter */

export class FirestoreRepository<T extends Entity> implements Repository<T> {
  private readonly now: () => string;

  constructor(
    private readonly firestore: FirestoreLike,
    private readonly collection: string,
    options: FirestoreRepositoryOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private col(): CollectionLike {
    return this.firestore.collection(this.collection);
  }

  private toEntity(snap: DocumentSnapshotLike): T | null {
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data) return null;
    return { ...data, id: snap.id } as T;
  }

  async get(id: string): Promise<T | null> {
    return this.toEntity(await this.col().doc(id).get());
  }

  async getMany(ids: readonly string[]): Promise<T[]> {
    if (ids.length > MAX_GET_MANY) {
      throw new QueryError(
        `getMany accepts at most ${MAX_GET_MANY} ids (Firestore's limit); got ${ids.length}`,
      );
    }
    // Individual reads rather than an `in` query: `in` is capped at the same
    // bound anyway, and this keeps missing ids simply absent from the result.
    // Annotated: without it the Awaited<T> inference defeats the type predicate.
    const found: (T | null)[] = await Promise.all(ids.map((id) => this.get(id)));
    return found.filter((row): row is T => row !== null);
  }

  /**
   * Translate the portable query descriptor into a Firestore query.
   *
   * `validateQuery` runs first, so a query Firestore would reject at runtime —
   * two range fields, or a sort that disagrees with the range field — fails the
   * same way here as against the in-memory adapter, in a test rather than in
   * production against a missing index.
   */
  async list(query: Query<T>): Promise<Page<T>> {
    validateQuery(query);

    let q: QueryLike | CollectionLike = this.col();

    for (const [field, raw] of Object.entries((query.where ?? {}) as Record<string, unknown>)) {
      if (raw === null || typeof raw !== 'object') continue;
      const cond = raw as Record<string, unknown>;
      const path = fieldPath(field);

      if ('eq' in cond) q = q.where(path, '==', cond['eq']);
      else if ('in' in cond) q = q.where(path, 'in', cond['in']);
      else {
        if ('gte' in cond) q = q.where(path, '>=', cond['gte']);
        if ('lte' in cond) q = q.where(path, '<=', cond['lte']);
      }
    }

    const sortField = query.orderBy?.field;
    const dir = query.orderBy?.dir ?? 'asc';
    if (sortField && sortField !== 'id') q = q.orderBy(fieldPath(sortField), dir);
    // The id tiebreak makes the ordering total, which is what keyset pagination
    // needs when many documents share a sort value.
    q = q.orderBy('__name__', dir);

    if (query.cursor) {
      const { sortValue, id } = decodeCursorValues(query.cursor);
      q = (q as QueryLike).startAfter(...(sortField ? [sortValue, id] : [id]));
    }

    const snapshot = await q.limit(query.limit + 1).get();
    const rows = snapshot.docs.flatMap((d) => {
      const entity = this.toEntity(d);
      return entity ? [entity] : [];
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items[items.length - 1];

    if (!hasMore || !last) return { items };

    return {
      items,
      nextCursor: encodeCursorValues(
        sortField ? (last as unknown as Record<string, unknown>)[sortField] : null,
        last.id,
      ),
    };
  }

  async create(value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>): Promise<T> {
    const at = this.now();
    const row = { ...value, createdAt: at, updatedAt: at, version: 1 } as T;
    const { id, ...rest } = row as unknown as Record<string, unknown> & { id: string };
    try {
      await this.col().doc(id).create(rest);
    } catch {
      throw new ConflictError(`${this.collection}/${id} already exists`);
    }
    return row;
  }

  /**
   * Optimistic concurrency without a transaction.
   *
   * Firestore's `update` has no compare-and-set, so the version is read and
   * compared before writing. That leaves a narrow window, which is why every
   * flow in these bricks that must be exactly-once uses `createIfAbsent` on a
   * deterministic id instead of relying on this.
   */
  async update(id: string, patch: Partial<T>, opts?: { expectedVersion?: number }): Promise<T> {
    const current = await this.get(id);
    if (!current) throw new NotFoundError(this.collection, id);

    if (opts?.expectedVersion !== undefined && opts.expectedVersion !== current.version) {
      throw new ConflictError(`${this.collection}/${id} was modified concurrently`);
    }

    const { id: _i, createdAt: _c, version: _v, ...safe } = patch as Partial<Entity>;
    const next = {
      ...current,
      ...safe,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: this.now(),
      version: current.version + 1,
    } as T;

    const { id: _dropped, ...rest } = next as unknown as Record<string, unknown> & { id: string };
    await this.col().doc(id).set(stripUndefined(rest));
    return next;
  }

  async delete(id: string): Promise<void> {
    await this.col().doc(id).delete();
  }

  /**
   * The uniqueness primitive, resting on Firestore's `create` failing when the
   * document exists. No transaction, no unique index, and the store decides the
   * winner of a race between concurrent callers.
   */
  async createIfAbsent(
    id: string,
    value: Omit<T, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<{ entity: T; created: boolean }> {
    const at = this.now();
    const row = { ...value, id, createdAt: at, updatedAt: at, version: 1 } as T;
    const { id: _i, ...rest } = row as unknown as Record<string, unknown> & { id: string };

    try {
      await this.col().doc(id).create(stripUndefined(rest));
      return { entity: row, created: true };
    } catch {
      // Lost the race, or it already existed. Either way the existing row wins.
      const existing = await this.get(id);
      if (existing) return { entity: existing, created: false };
      throw new ConflictError(`${this.collection}/${id} could not be created or read back`);
    }
  }
}

/**
 * Map a portable field name onto a Firestore path.
 *
 * `id` is not a field in a document store — it is the document's name. The
 * in-memory adapter stores it as an ordinary property, so a query written
 * against one silently matched nothing against the other. The conformance suite
 * is what surfaced that, and this is the translation that resolves it.
 */
function fieldPath(field: string): string {
  return field === 'id' ? '__name__' : field;
}

/** Firestore rejects `undefined`; omitting the field is the portable equivalent. */
function stripUndefined(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function encodeCursorValues(sortValue: unknown, id: string): string {
  return Buffer.from(JSON.stringify([sortValue ?? null, id]), 'utf8').toString('base64url');
}

function decodeCursorValues(cursor: string): { sortValue: unknown; id: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new QueryError('malformed cursor');
  }
  if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[1] !== 'string') {
    throw new QueryError('malformed cursor');
  }
  return { sortValue: parsed[0], id: parsed[1] };
}

/** Build a set of Firestore repositories sharing one client and prefix. */
export function createFirestoreStore(firestore: FirestoreLike, prefix = '') {
  return {
    repo<T extends Entity>(collection: string): FirestoreRepository<T> {
      return new FirestoreRepository<T>(firestore, `${prefix}${collection}`);
    },
  };
}

/**
 * The composite indexes every query in these bricks needs.
 *
 * Firestore fails a multi-field query at runtime with a console link rather than
 * at deploy time, so a missing index is a production incident that every test
 * against the emulator will miss. Emitted here so a host can merge it into its
 * own `firestore.indexes.json` deliberately.
 */
export function requiredIndexes(prefix = ''): Array<{
  collectionGroup: string;
  queryScope: 'COLLECTION';
  fields: Array<{ fieldPath: string; order: 'ASCENDING' | 'DESCENDING' }>;
}> {
  const index = (
    collection: string,
    ...fields: Array<[string, 'ASCENDING' | 'DESCENDING']>
  ) => ({
    collectionGroup: `${prefix}${collection}`,
    queryScope: 'COLLECTION' as const,
    fields: fields.map(([fieldPath, order]) => ({ fieldPath, order })),
  });

  return [
    // mentorship: catalogue browse
    index('mentorIndex', ['active', 'ASCENDING'], ['rankScore', 'DESCENDING'], ['__name__', 'DESCENDING']),
    // mentorship: the mentor's day, for the per-day cap
    index('bookings', ['mentorId', 'ASCENDING'], ['mentorDayKey', 'ASCENDING'], ['__name__', 'ASCENDING']),
    // mentorship: upcoming sessions for either party
    index('bookings', ['startsAt', 'ASCENDING'], ['__name__', 'ASCENDING']),
    // mentorship: the hold sweeper
    index('locks', ['status', 'ASCENDING'], ['__name__', 'ASCENDING']),
    // lms: catalogue browse
    index('courseIndex', ['published', 'ASCENDING'], ['rankScore', 'DESCENDING'], ['__name__', 'DESCENDING']),
    // lms: a learner's courses
    index('enrollments', ['userId', 'ASCENDING'], ['lastAccessedAt', 'DESCENDING'], ['__name__', 'DESCENDING']),
    // lms: progress reconcile
    index('lessonProgress', ['courseId', 'ASCENDING'], ['userId', 'ASCENDING'], ['__name__', 'ASCENDING']),
    // assessment: the bank, and the overdue sweeper
    index('questions', ['bankId', 'ASCENDING'], ['__name__', 'ASCENDING']),
    index('attempts', ['status', 'ASCENDING'], ['__name__', 'ASCENDING']),
  ];
}
