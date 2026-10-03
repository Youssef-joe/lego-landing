import { describe, expect, it } from 'vitest';

import { MemoryRepository } from '../adapters/memory';
import { runRepositoryConformance } from '../testing/conformance';
import type { TestEntity } from '../testing/conformance';

/**
 * The in-memory adapter against the shared conformance suite.
 *
 * A Firestore or SQL adapter runs this identical file with only `makeRepo`
 * swapped, which is what makes "portable across both stores" a checked property
 * rather than a design intention.
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
      return new MemoryRepository<TestEntity>('test', {
        // Frozen clock and counter so ordering is deterministic and a failure is
        // reproducible rather than timing-dependent.
        now: () => new Date(Date.UTC(2026, 8, 16, 12, 0, counter++)).toISOString(),
      });
    },
  },
);
