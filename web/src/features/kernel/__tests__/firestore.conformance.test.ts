import { describe, expect, it } from 'vitest';

import { FirestoreRepository, requiredIndexes } from '../adapters/firestore';
import { FakeFirestore } from '../testing/fake-firestore';
import { runRepositoryConformance } from '../testing/conformance';
import type { TestEntity } from '../testing/conformance';

/**
 * The Firestore adapter against the *same* conformance suite the in-memory
 * adapter passes, with only `makeRepo` swapped.
 *
 * This is what makes "the query algebra works on a document store as well as in
 * memory" a checked property rather than a design intention — and it is the
 * reason the suite takes its test runner as an argument instead of importing one.
 */
runRepositoryConformance(
  {
    describe,
    it,
    expect: expect as never,
    async expectRejection(body) {
      try {
        await body();
      } catch (error) {
        return error;
      }
      throw new Error('expected the call to reject, but it resolved');
    },
  },
  {
    makeRepo: () => {
      let counter = 0;
      return new FirestoreRepository<TestEntity>(new FakeFirestore(), 'test', {
        now: () => new Date(Date.UTC(2026, 8, 16, 12, 0, counter++)).toISOString(),
      });
    },
  },
);

describe('Firestore specifics', () => {
  it('omits undefined rather than writing it, which Firestore rejects', async () => {
    const store = new FakeFirestore();
    const repo = new FirestoreRepository<TestEntity & { note?: string }>(store, 'test');

    await repo.createIfAbsent('a', {
      id: 'a', ownerId: 'o', title: 't', score: 1, status: 'draft', note: undefined,
    } as never);

    const row = store.data.get('test')?.get('a');
    expect(row).toBeDefined();
    expect(Object.hasOwn(row as object, 'note')).toBe(false);
  });

  it('declares the composite indexes its queries need', () => {
    const indexes = requiredIndexes();
    expect(indexes.length).toBeGreaterThan(0);

    // A missing composite index fails at runtime with a console link, which no
    // emulator test catches — so the list is emitted for a host to merge.
    const mentorBrowse = indexes.find(
      (i) => i.collectionGroup === 'mentorIndex' && i.fields.some((f) => f.fieldPath === 'rankScore'),
    );
    expect(mentorBrowse).toBeDefined();
    expect(mentorBrowse?.fields[0]?.fieldPath).toBe('active');
  });

  it('applies a collection prefix so a host can namespace the bricks', () => {
    const prefixed = requiredIndexes('swx_');
    expect(prefixed.every((i) => i.collectionGroup.startsWith('swx_'))).toBe(true);
  });
});
