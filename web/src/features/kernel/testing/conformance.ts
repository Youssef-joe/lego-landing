/**
 * The Repository conformance suite.
 *
 * Every storage adapter must pass this, unchanged. It is what converts "the
 * query algebra is expressible on both a document store and SQL" from a claim
 * into a tested property — a Firestore adapter that passes this is evidence, not
 * an intention.
 *
 * Written against a `describe`/`it`/`expect` shape passed in, rather than
 * importing a test runner, for two reasons: a brick must not declare its test
 * framework as a runtime dependency (capture writes every import into
 * `dependencies`), and an adapter living in a different project can run this
 * suite under whatever runner that project already uses.
 */

import type { Entity, Repository } from '../host/contract';

export interface TestEntity extends Entity {
  ownerId: string;
  title: string;
  score: number;
  status: 'draft' | 'published';
}

/** The minimal surface a runner must provide. */
export interface TestHarness {
  describe(name: string, body: () => void): void;
  it(name: string, body: () => Promise<void> | void): void;
  expect: (actual: unknown) => {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeNull(): void;
    toBeDefined(): void;
    toHaveLength(n: number): void;
  };
  /** Must reject; returns the rejection reason for further assertions. */
  expectRejection(body: () => Promise<unknown>): Promise<unknown>;
}

export interface ConformanceContext {
  /** A fresh, empty repository for each test. */
  makeRepo(): Promise<Repository<TestEntity>> | Repository<TestEntity>;
  /** Adapters that cannot support a capability may skip those cases. */
  supports?: { rangeQueries?: boolean; cursors?: boolean };
}

type Seed = Omit<TestEntity, 'createdAt' | 'updatedAt' | 'version'>;

const seedRow = (id: string, over: Partial<Seed> = {}): Seed => ({
  id,
  ownerId: 'owner_1',
  title: id,
  score: 0,
  status: 'draft',
  ...over,
});

export function runRepositoryConformance(h: TestHarness, ctx: ConformanceContext): void {
  const { describe, it, expect, expectRejection } = h;
  const supportsRange = ctx.supports?.rangeQueries ?? true;
  const supportsCursors = ctx.supports?.cursors ?? true;

  describe('Repository conformance — writes', () => {
    it('create assigns timestamps and version 1', async () => {
      const repo = await ctx.makeRepo();
      const created = await repo.create(seedRow('a'));
      expect(created.id).toBe('a');
      expect(created.version).toBe(1);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    it('get returns null for an unknown id rather than throwing', async () => {
      const repo = await ctx.makeRepo();
      expect(await repo.get('missing')).toBeNull();
    });

    it('update increments version and preserves createdAt', async () => {
      const repo = await ctx.makeRepo();
      const created = await repo.create(seedRow('a', { title: 'first' }));
      const updated = await repo.update('a', { title: 'second' } as Partial<TestEntity>);
      expect(updated.title).toBe('second');
      expect(updated.version).toBe(2);
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it('update ignores attempts to patch store-owned fields', async () => {
      const repo = await ctx.makeRepo();
      await repo.create(seedRow('a'));
      const updated = await repo.update('a', {
        id: 'hijacked',
        version: 99,
      } as unknown as Partial<TestEntity>);
      expect(updated.id).toBe('a');
      expect(updated.version).toBe(2);
    });

    it('delete is idempotent', async () => {
      const repo = await ctx.makeRepo();
      await repo.create(seedRow('a'));
      await repo.delete('a');
      await repo.delete('a');
      expect(await repo.get('a')).toBeNull();
    });

    it('a returned entity is a copy: mutating it does not change the store', async () => {
      const repo = await ctx.makeRepo();
      await repo.create(seedRow('a', { title: 'original' }));
      const fetched = await repo.get('a');
      if (fetched) fetched.title = 'mutated';
      const again = await repo.get('a');
      expect(again?.title).toBe('original');
    });
  });

  describe('Repository conformance — optimistic concurrency', () => {
    it('update succeeds when expectedVersion matches', async () => {
      const repo = await ctx.makeRepo();
      await repo.create(seedRow('a'));
      const updated = await repo.update('a', { title: 'ok' } as Partial<TestEntity>, {
        expectedVersion: 1,
      });
      expect(updated.version).toBe(2);
    });

    it('update rejects when expectedVersion is stale', async () => {
      const repo = await ctx.makeRepo();
      await repo.create(seedRow('a'));
      await repo.update('a', { title: 'first' } as Partial<TestEntity>);
      await expectRejection(() =>
        repo.update('a', { title: 'second' } as Partial<TestEntity>, { expectedVersion: 1 }),
      );
    });
  });

  describe('Repository conformance — createIfAbsent', () => {
    // This is the primitive that replaces unique indexes, which document stores
    // do not have. Every uniqueness constraint in the system rests on it.
    it('creates when absent and reports created', async () => {
      const repo = await ctx.makeRepo();
      const { entity, created } = await repo.createIfAbsent('k1', seedRow('k1', { title: 'first' }));
      expect(created).toBe(true);
      expect(entity.title).toBe('first');
    });

    it('returns the existing row without overwriting it', async () => {
      const repo = await ctx.makeRepo();
      await repo.createIfAbsent('k1', seedRow('k1', { title: 'first' }));
      const second = await repo.createIfAbsent('k1', seedRow('k1', { title: 'second' }));
      expect(second.created).toBe(false);
      expect(second.entity.title).toBe('first');
    });

    it('is safe under concurrent callers: exactly one wins', async () => {
      const repo = await ctx.makeRepo();
      const attempts = await Promise.all(
        Array.from({ length: 25 }, (_, i) =>
          repo.createIfAbsent('slot_1', seedRow('slot_1', { title: `attempt_${i}` })),
        ),
      );
      const winners = attempts.filter((a) => a.created);
      expect(winners).toHaveLength(1);
      // Everyone observes the same winning row.
      const titles = new Set(attempts.map((a) => a.entity.title));
      expect(titles.size).toBe(1);
    });
  });

  describe('Repository conformance — queries', () => {
    async function seeded() {
      const repo = await ctx.makeRepo();
      await repo.create(seedRow('a', { ownerId: 'o1', score: 10, status: 'published' }));
      await repo.create(seedRow('b', { ownerId: 'o1', score: 20, status: 'draft' }));
      await repo.create(seedRow('c', { ownerId: 'o2', score: 30, status: 'published' }));
      await repo.create(seedRow('d', { ownerId: 'o2', score: 40, status: 'published' }));
      return repo;
    }

    it('filters by equality', async () => {
      const repo = await seeded();
      const page = await repo.list({ where: { ownerId: { eq: 'o1' } }, limit: 10 });
      expect(page.items.map((i) => i.id).sort()).toEqual(['a', 'b']);
    });

    it('filters by in', async () => {
      const repo = await seeded();
      const page = await repo.list({ where: { id: { in: ['a', 'c'] } }, limit: 10 });
      expect(page.items.map((i) => i.id).sort()).toEqual(['a', 'c']);
    });

    it('combines equality filters', async () => {
      const repo = await seeded();
      const page = await repo.list({
        where: { ownerId: { eq: 'o2' }, status: { eq: 'published' } },
        limit: 10,
      });
      expect(page.items.map((i) => i.id).sort()).toEqual(['c', 'd']);
    });

    it('sorts ascending and descending', async () => {
      const repo = await seeded();
      const asc = await repo.list({ orderBy: { field: 'score', dir: 'asc' }, limit: 10 });
      expect(asc.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
      const desc = await repo.list({ orderBy: { field: 'score', dir: 'desc' }, limit: 10 });
      expect(desc.items.map((i) => i.id)).toEqual(['d', 'c', 'b', 'a']);
    });

    it('honours limit', async () => {
      const repo = await seeded();
      const page = await repo.list({ orderBy: { field: 'score', dir: 'asc' }, limit: 2 });
      expect(page.items).toHaveLength(2);
    });

    it('rejects a missing or non-positive limit', async () => {
      const repo = await seeded();
      await expectRejection(async () => repo.list({ limit: 0 }));
      await expectRejection(async () => repo.list({} as never));
    });

    it('rejects an in clause beyond the portable bound', async () => {
      const repo = await seeded();
      await expectRejection(async () =>
        repo.list({ where: { id: { in: Array.from({ length: 11 }, (_, i) => `x${i}`) } }, limit: 10 }),
      );
    });

    if (supportsRange) {
      it('filters by range on a single field', async () => {
        const repo = await seeded();
        const page = await repo.list({
          where: { score: { gte: 20, lte: 30 } },
          orderBy: { field: 'score', dir: 'asc' },
          limit: 10,
        });
        expect(page.items.map((i) => i.id)).toEqual(['b', 'c']);
      });

      it('rejects range filters on two different fields', async () => {
        const repo = await seeded();
        await expectRejection(async () =>
          repo.list({ where: { score: { gte: 1 }, title: { gte: 'a' } }, limit: 10 }),
        );
      });

      it('rejects ordering by a field other than the range field', async () => {
        const repo = await seeded();
        await expectRejection(async () =>
          repo.list({
            where: { score: { gte: 1 } },
            orderBy: { field: 'title', dir: 'asc' },
            limit: 10,
          }),
        );
      });
    }

    if (supportsCursors) {
      it('paginates with a keyset cursor and reaches every row exactly once', async () => {
        const repo = await seeded();
        const seen: string[] = [];
        let cursor: string | undefined;

        for (let guard = 0; guard < 10; guard += 1) {
          const page: { items: TestEntity[]; nextCursor?: string } = await repo.list({
            orderBy: { field: 'score', dir: 'asc' },
            limit: 2,
            ...(cursor ? { cursor } : {}),
          });
          seen.push(...page.items.map((i) => i.id));
          if (!page.nextCursor) break;
          cursor = page.nextCursor;
        }

        expect(seen).toEqual(['a', 'b', 'c', 'd']);
      });

      it('stops offering a cursor on the last page', async () => {
        const repo = await seeded();
        const page = await repo.list({ orderBy: { field: 'score', dir: 'asc' }, limit: 10 });
        expect(page.nextCursor).toBe(undefined);
      });

      it('paginates correctly when many rows share a sort value', async () => {
        // The id tiebreak is what makes this terminate rather than loop.
        const repo = await ctx.makeRepo();
        for (const id of ['a', 'b', 'c', 'd', 'e']) await repo.create(seedRow(id, { score: 7 }));

        const seen: string[] = [];
        let cursor: string | undefined;
        for (let guard = 0; guard < 10; guard += 1) {
          const page: { items: TestEntity[]; nextCursor?: string } = await repo.list({
            orderBy: { field: 'score', dir: 'asc' },
            limit: 2,
            ...(cursor ? { cursor } : {}),
          });
          seen.push(...page.items.map((i) => i.id));
          if (!page.nextCursor) break;
          cursor = page.nextCursor;
        }
        expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
      });

      it('rejects a malformed cursor', async () => {
        const repo = await seeded();
        await expectRejection(async () =>
          repo.list({ orderBy: { field: 'score', dir: 'asc' }, limit: 2, cursor: 'not-a-cursor' }),
        );
      });
    }

    it('getMany returns found rows and omits missing ones', async () => {
      const repo = await seeded();
      const rows = await repo.getMany(['a', 'missing', 'c']);
      expect(rows.map((r) => r.id).sort()).toEqual(['a', 'c']);
    });

    it('getMany rejects beyond the portable bound', async () => {
      const repo = await seeded();
      await expectRejection(async () =>
        repo.getMany(Array.from({ length: 11 }, (_, i) => `x${i}`)),
      );
    });
  });
}
