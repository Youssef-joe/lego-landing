/**
 * timekit — pure time zone, recurrence and slot math.
 *
 * Zero runtime dependencies and zero I/O. Nothing here reads the environment,
 * touches a database, or imports a framework, which is what makes it safe to
 * copy into any project and what makes its tests fully deterministic.
 */

export type {
  Instant,
  Interval,
  LocalDate,
  LocalDateTime,
  LocalTime,
  RecurrenceRule,
  Slot,
  SlotOptions,
  TimeZoneId,
  WallClockRule,
  Weekday,
  ZonedResolution,
  ZonedResolutionKind,
} from './types';

export {
  addLocalDays,
  assertValidTimeZone,
  compareLocalDates,
  formatLocalDate,
  fromZoned,
  instantFromLocal,
  localDateOf,
  offsetAt,
  parseLocalDate,
  parseLocalTime,
  toZoned,
  weekdayOf,
} from './zone';

export {
  clampIntervals,
  intervalsOverlap,
  mergeIntervals,
  padIntervals,
  subtractIntervals,
  totalDurationMs,
} from './intervals';

export { expandRecurrence, expandRules } from './recurrence';

export type { AvailabilityInput } from './slots';
export { availableSlots, freeIntervals, gridify, gridifyAll } from './slots';
