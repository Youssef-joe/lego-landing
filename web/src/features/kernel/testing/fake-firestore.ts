/**
 * An in-process stand-in for the slice of Firestore the adapter uses.
 *
 * This exists so the conformance suite can run against the *Firestore adapter's
 * own code paths* — its query translation, its cursor handling, its reliance on
 * `create` rejecting an existing document — without a network or an emulator.
 *
 * It is not a claim that the adapter works against real Firestore. It checks the
 * translation layer; the emulator checks the rest. Both matter, and this is the
 * half that can run in any target that received the brick.
 */

import type {
  CollectionLike,
  DocumentLike,
  DocumentSnapshotLike,
  FirestoreLike,
  QueryLike,
  QuerySnapshotLike,
} from '../adapters/firestore';

type Row = Record<string, unknown>;

interface Constraint {
  kind: 'where' | 'orderBy' | 'limit' | 'startAfter';
  field?: string;
  op?: string;
  value?: unknown;
  direction?: 'asc' | 'desc';
  n?: number;
  values?: unknown[];
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

export class FakeFirestore implements FirestoreLike {
  readonly data = new Map<string, Map<string, Row>>();

  collection(path: string): CollectionLike {
    let rows = this.data.get(path);
    if (!rows) {
      rows = new Map();
      this.data.set(path, rows);
    }
    return new FakeCollection(rows);
  }

  reset(): void {
    this.data.clear();
  }
}

class FakeCollection implements CollectionLike, QueryLike {
  constructor(
    private readonly rows: Map<string, Row>,
    private readonly constraints: Constraint[] = [],
  ) {}

  doc(id: string): DocumentLike {
    return new FakeDocument(this.rows, id);
  }

  where(field: string, op: string, value: unknown): QueryLike {
    return new FakeCollection(this.rows, [...this.constraints, { kind: 'where', field, op, value }]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryLike {
    return new FakeCollection(this.rows, [...this.constraints, { kind: 'orderBy', field, direction }]);
  }

  limit(n: number): QueryLike {
    return new FakeCollection(this.rows, [...this.constraints, { kind: 'limit', n }]);
  }

  startAfter(...values: unknown[]): QueryLike {
    return new FakeCollection(this.rows, [...this.constraints, { kind: 'startAfter', values }]);
  }

  async get(): Promise<QuerySnapshotLike> {
    // `__name__` is Firestore's document id; the adapter sorts by it for the
    // tiebreak, so the fake has to understand it too.
    const valueOf = (id: string, row: Row, field: string) =>
      field === '__name__' ? id : row[field];

    let entries = [...this.rows.entries()];

    for (const c of this.constraints) {
      if (c.kind !== 'where' || !c.field) continue;
      entries = entries.filter(([id, row]) => {
        const actual = valueOf(id, row, c.field as string);
        switch (c.op) {
          case '==': return actual === c.value;
          case 'in': return Array.isArray(c.value) && c.value.includes(actual);
          case '>=': return compare(actual, c.value) >= 0;
          case '<=': return compare(actual, c.value) <= 0;
          default: return true;
        }
      });
    }

    const orders = this.constraints.filter((c) => c.kind === 'orderBy');
    if (orders.length > 0) {
      entries.sort(([idA, rowA], [idB, rowB]) => {
        for (const o of orders) {
          const dir = o.direction === 'desc' ? -1 : 1;
          const cmp = compare(
            valueOf(idA, rowA, o.field as string),
            valueOf(idB, rowB, o.field as string),
          );
          if (cmp !== 0) return cmp * dir;
        }
        return 0;
      });
    }

    const after = this.constraints.find((c) => c.kind === 'startAfter');
    if (after?.values) {
      const cursorValues = after.values;
      const index = entries.findIndex(([id, row]) => {
        for (let i = 0; i < orders.length && i < cursorValues.length; i += 1) {
          const o = orders[i] as Constraint;
          const dir = o.direction === 'desc' ? -1 : 1;
          const cmp = compare(valueOf(id, row, o.field as string), cursorValues[i]) * dir;
          if (cmp !== 0) return cmp > 0;
        }
        return false;
      });
      entries = index === -1 ? [] : entries.slice(index);
    }

    const lim = this.constraints.find((c) => c.kind === 'limit');
    if (lim?.n !== undefined) entries = entries.slice(0, lim.n);

    return {
      docs: entries.map(([id, row]) => ({
        id,
        exists: true,
        data: () => structuredClone(row),
      })),
    };
  }
}

class FakeDocument implements DocumentLike {
  constructor(
    private readonly rows: Map<string, Row>,
    private readonly id: string,
  ) {}

  async get(): Promise<DocumentSnapshotLike> {
    const row = this.rows.get(this.id);
    return {
      id: this.id,
      exists: row !== undefined,
      data: () => (row ? structuredClone(row) : undefined),
    };
  }

  async set(data: Row): Promise<void> {
    this.rows.set(this.id, structuredClone(data));
  }

  /** Rejects when the document exists — the behaviour createIfAbsent rests on. */
  async create(data: Row): Promise<void> {
    if (this.rows.has(this.id)) {
      throw new Error(`ALREADY_EXISTS: ${this.id}`);
    }
    this.rows.set(this.id, structuredClone(data));
  }

  async update(data: Row): Promise<void> {
    const current = this.rows.get(this.id);
    if (!current) throw new Error(`NOT_FOUND: ${this.id}`);
    this.rows.set(this.id, { ...current, ...structuredClone(data) });
  }

  async delete(): Promise<void> {
    this.rows.delete(this.id);
  }
}
