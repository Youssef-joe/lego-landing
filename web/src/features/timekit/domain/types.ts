/**
 * timekit domain types.
 *
 * Two representations, deliberately kept distinct, because conflating them is
 * the single most common bug in scheduling software:
 *
 *   - Recurring *intent* is wall-clock local time plus an IANA zone. A mentor
 *     who says "Tuesdays 9-11am" means 9am in their zone forever, including
 *     after a DST shift. Storing that as UTC silently moves their availability
 *     by an hour twice a year.
 *
 *   - A concrete *occurrence* is a fixed instant, stored as UTC epoch
 *     milliseconds, because the person may relocate and the appointment must
 *     not move with them.
 */

/** An IANA time zone identifier, e.g. "Europe/Berlin". */
export type TimeZoneId = string;

/** UTC epoch milliseconds. The only instant representation in this brick. */
export type Instant = number;

/** A wall-clock date and time with no zone attached. */
export interface LocalDateTime {
  year: number;
  /** 1-12, not the 0-11 that Date uses. */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** A calendar date in a zone, as "YYYY-MM-DD". */
export type LocalDate = string;

/** A wall-clock time of day, as "HH:mm". */
export type LocalTime = string;

/** A half-open instant range: start inclusive, end exclusive. */
export interface Interval {
  start: Instant;
  end: Instant;
}

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

/** The RRULE subset this brick supports. Deliberately small and total. */
export interface RecurrenceRule {
  freq: 'DAILY' | 'WEEKLY';
  /** Repeat every N periods. Defaults to 1. */
  interval?: number;
  /** For WEEKLY: which days. Ignored for DAILY. */
  byDay?: readonly Weekday[];
  /** Stop after this many occurrences. */
  count?: number;
  /** Stop on or before this local date (inclusive). */
  until?: LocalDate;
  /** Local dates to skip entirely. */
  exDates?: readonly LocalDate[];
}

/**
 * Recurring availability expressed the only way that survives DST: wall-clock
 * local times plus the zone they are meant in.
 *
 * `endLocal` may be earlier than `startLocal`, which means the window crosses
 * local midnight and ends on the following day.
 */
export interface WallClockRule {
  tz: TimeZoneId;
  recurrence: RecurrenceRule;
  startLocal: LocalTime;
  endLocal: LocalTime;
  /** First local date the rule is active. */
  effectiveFrom?: LocalDate;
  /** Last local date the rule is active, inclusive. */
  effectiveUntil?: LocalDate;
}

/**
 * How a local wall-clock time mapped onto the instant timeline.
 *
 * DST makes this a three-way outcome, and both irregular cases are product
 * decisions rather than implementation details:
 *
 *   - `gap`     the local time does not exist (clocks sprang forward over it).
 *               Policy: shift forward to the first valid instant.
 *   - `ambiguous` the local time occurs twice (clocks fell back over it).
 *               Policy: take the first (pre-transition) occurrence.
 */
export type ZonedResolutionKind = 'exact' | 'gap' | 'ambiguous';

export interface ZonedResolution {
  kind: ZonedResolutionKind;
  instant: Instant;
  /** For `ambiguous`, the later of the two candidate instants. */
  alternate?: Instant;
}

/** A bookable slot produced by gridding an availability interval. */
export interface Slot {
  start: Instant;
  end: Instant;
}

/** Constraints applied when turning free intervals into offerable slots. */
export interface SlotOptions {
  /** Length of each slot, in minutes. */
  durationMin: number;
  /**
   * Spacing between candidate slot starts, in minutes. Defaults to
   * `durationMin`, which produces back-to-back slots.
   */
  granularityMin?: number;
  /** Earliest instant a slot may start; slots before it are dropped. */
  notBefore?: Instant;
  /** Latest instant a slot may start. */
  notAfter?: Instant;
}
