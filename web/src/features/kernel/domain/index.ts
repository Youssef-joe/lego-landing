/**
 * kernel — the storage seam.
 *
 * Pure entrypoint: the query algebra and its evaluator, with no I/O and no
 * framework. Adapters live under `adapters/` and are imported only by a host's
 * composition file, never by brick-internal code, so an unused adapter's SDK is
 * never pulled into a bundle.
 */

export {
  MAX_IN_VALUES,
  QueryError,
  decodeCursor,
  encodeCursor,
  evaluateQuery,
  validateQuery,
} from './query';
