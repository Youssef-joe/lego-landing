/**
 * Storage adapters.
 *
 * Only a host's composition file imports from here. No brick-internal module
 * may, which is what keeps a Firestore SDK out of a project that uses SQL —
 * `brick-lint` rule R6 enforces it.
 */

export {
  ConflictError,
  MAX_GET_MANY,
  MemoryRepository,
  NotFoundError,
  createMemoryStore,
} from './memory';
export type { MemoryRepositoryOptions } from './memory';
