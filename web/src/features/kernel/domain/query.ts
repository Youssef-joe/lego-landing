/**
 * Query evaluation and keyset pagination, shared by every storage adapter.
 *
 * The algebra is the *intersection* of a document store and SQL, never the
 * union: equality, a bounded `in`, a range on at most one field, one sort field
 * plus an id tiebreak, an opaque keyset cursor, and a required limit. Anything a
 * document store cannot do is not expressible, which is what stops an
 * unportable query being written in the first place.
 *
 * This module is pure. Adapters that can push a query down to the store (SQL,
 * Firestore) translate the same descriptor; the in-memory adapter evaluates it
 * here. Both are checked by the same conformance suite, so "works on both
 * stores" is a tested property rather than an intention.
 */

import type { Entity, Page, Query } from '../host/contract';

/** A document store's `in` is bounded; matching that bound keeps queries portable. */
export const MAX_IN_VALUES = 10;

export class QueryError extends Error {
  constructor(message: string) {
    super(`kernel: ${message}`);
    this.name = 'QueryError';
  }
}

type Condition =
  | { kind: 'eq'; value: unknown }
  | { kind: 'in'; values: readonly unknown[] }
  | { kind: 'range'; gte?: unknown; lte?: unknown };

function readCondition(raw: unknown): Condition {
  if (raw === null || typeof raw !== 'object') {
    throw new QueryError('a where clause must be an object');
  }
  const c = raw as Record<string, unknown>;

  if ('eq' in c) return { kind: 'eq', value: c['eq'] };

  if ('in' in c) {
    const values = c['in'];
    if (!Array.isArray(values)) throw new QueryError('`in` expects an array');
    if (values.length === 0) throw new QueryError('`in` expects at least one value');
    if (values.length > MAX_IN_VALUES) {
      throw new QueryError(
        `\`in\` accepts at most ${MAX_IN_VALUES} values (a document store's limit); got ${values.length}`,
      );
    }
    return { kind: 'in', values };
  }

  if ('gte' in c || 'lte' in c) {
    const range: Condition = { kind: 'range' };
    if ('gte' in c) range.gte = c['gte'];
    if ('lte' in c) range.lte = c['lte'];
    return range;
  }

  throw new QueryError('a where clause needs one of `eq`, `in`, `gte`/`lte`');
}

/**
 * Validate a query against the portable subset, throwing on anything a document
 * store would reject at runtime. Adapters call this before touching the store so
 * the failure is the same everywhere, rather than a provider-specific error that
 * only appears in production.
 */
export function validateQuery<T extends Entity>(query: Query<T>): void {
  if (!Number.isInteger(query.limit) || query.limit <= 0) {
    throw new QueryError('`limit` is required and must be a positive integer');
  }

  const where = (query.where ?? {}) as Record<string, unknown>;
  const rangeFields: string[] = [];

  for (const [field, raw] of Object.entries(where)) {
    if (raw === undefined) continue;
    if (readCondition(raw).kind === 'range') rangeFields.push(field);
  }

  if (rangeFields.length > 1) {
    throw new QueryError(
      `a range filter may be applied to at most one field; got ${rangeFields.join(', ')}`,
    );
  }

  // A document store requires the first sort key to be the range field. Rejecting
  // this here means the constraint is discovered in a unit test rather than as a
  // "missing index" error against the real store.
  const [rangeField] = rangeFields;
  if (rangeField && query.orderBy && query.orderBy.field !== rangeField) {
    throw new QueryError(
      `when filtering a range on "${rangeField}", orderBy must use that same field (got "${query.orderBy.field}")`,
    );
  }
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

// Takes the clause as a plain record: the conditions are read dynamically by
// field name, so the generic Where<T> adds no safety here and only collapses.
function matches(entity: Record<string, unknown>, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;

  for (const [field, raw] of Object.entries(where)) {
    if (raw === undefined) continue;
    const condition = readCondition(raw);
    const actual = entity[field];

    switch (condition.kind) {
      case 'eq':
        if (actual !== condition.value) return false;
        break;
      case 'in':
        if (!condition.values.includes(actual)) return false;
        break;
      case 'range':
        if (condition.gte !== undefined && compareValues(actual, condition.gte) < 0) return false;
        if (condition.lte !== undefined && compareValues(actual, condition.lte) > 0) return false;
        break;
    }
  }
  return true;
}

/**
 * Keyset cursors, never offsets.
 *
 * An offset re-reads every skipped row and drifts when rows are inserted
 * mid-pagination. A keyset cursor carries the last row's sort value and id, so
 * both a document store's `startAfter` and SQL's `WHERE (sort, id) > (…)`
 * implement it identically. The encoding is opaque on purpose: a brick that
 * inspected one would be depending on an adapter detail.
 */
export function encodeCursor(sortValue: unknown, id: string): string {
  return Buffer.from(JSON.stringify([sortValue ?? null, id]), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { sortValue: unknown; id: string } {
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

/**
 * Evaluate a query over an in-memory collection: filter, sort with an id
 * tiebreak, apply the cursor, then take one page.
 */
export function evaluateQuery<T extends Entity>(all: readonly T[], query: Query<T>): Page<T> {
  validateQuery(query);

  const filtered = all.filter((e) =>
    matches(e as unknown as Record<string, unknown>, query.where as Record<string, unknown> | undefined),
  );

  // The id tiebreak is what makes the ordering total, and a total order is what
  // makes keyset pagination correct when many rows share a sort value.
  const sortField = query.orderBy?.field;
  const descending = query.orderBy?.dir === 'desc';
  const direction = descending ? -1 : 1;

  const sorted = filtered.slice().sort((a, b) => {
    if (sortField) {
      const cmp = compareValues(
        (a as unknown as Record<string, unknown>)[sortField],
        (b as unknown as Record<string, unknown>)[sortField],
      );
      if (cmp !== 0) return cmp * direction;
    }
    return compareValues(a.id, b.id) * direction;
  });

  let start = 0;
  if (query.cursor) {
    const { sortValue, id } = decodeCursor(query.cursor);
    start = sorted.findIndex((e) => {
      if (sortField) {
        const cmp = compareValues((e as unknown as Record<string, unknown>)[sortField], sortValue);
        if (cmp !== 0) return descending ? cmp < 0 : cmp > 0;
      }
      const idCmp = compareValues(e.id, id);
      return descending ? idCmp < 0 : idCmp > 0;
    });
    if (start === -1) start = sorted.length;
  }

  const items = sorted.slice(start, start + query.limit);

  // A next cursor is only offered when more rows actually remain, so a caller
  // paginating to the end stops rather than making one empty extra round trip.
  const hasMore = start + query.limit < sorted.length;
  const last = items[items.length - 1];

  if (!hasMore || !last) return { items };

  return {
    items,
    nextCursor: encodeCursor(
      sortField ? (last as unknown as Record<string, unknown>)[sortField] : null,
      last.id,
    ),
  };
}
