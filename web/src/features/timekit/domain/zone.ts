/**
 * Time zone conversion built on `Intl`, with no dependency on a date library.
 *
 * A zero-dependency canary is a better portability test: when this brick is
 * copied into a target, there is nothing to install and nothing to resolve, so
 * a failure is unambiguously about the copy rather than about npm.
 */

import type { Instant, LocalDate, LocalDateTime, TimeZoneId, ZonedResolution } from './types';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Formatter cache. Constructing Intl.DateTimeFormat is comparatively expensive
 * and slot generation calls this on every candidate date.
 */
const formatterCache = new Map<TimeZoneId, Intl.DateTimeFormat>();

function formatterFor(tz: TimeZoneId): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Throws a clear error for an unknown zone rather than silently using UTC. */
export function assertValidTimeZone(tz: TimeZoneId): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    throw new RangeError(`timekit: unknown time zone "${tz}"`);
  }
}

/** The wall-clock time in `tz` at a given instant. */
export function toZoned(instant: Instant, tz: TimeZoneId): LocalDateTime {
  const parts = formatterFor(tz).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`timekit: missing "${type}" from Intl output for ${tz}`);
    return Number(part.value);
  };
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Treat a LocalDateTime's fields as if they were UTC. Used as a pivot only. */
function asIfUtc(local: LocalDateTime): number {
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
}

/**
 * The zone's UTC offset at a given instant, in milliseconds (local minus UTC).
 * Positive east of Greenwich.
 */
export function offsetAt(instant: Instant, tz: TimeZoneId): number {
  return asIfUtc(toZoned(instant, tz)) - instant;
}

function sameLocal(a: LocalDateTime, b: LocalDateTime): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute &&
    a.second === b.second
  );
}

/**
 * Map a wall-clock local time in `tz` onto the instant timeline.
 *
 * The offset depends on the instant, and the instant is what we are solving
 * for, so this converges by iteration: pivot on the local fields treated as
 * UTC, correct by the offset there, then correct again by the offset at the
 * corrected instant. Two passes suffice for every real zone, because offsets
 * change by at most a couple of hours and never twice within that window.
 *
 * Both DST irregularities are detected by verifying the round trip rather than
 * by consulting a transition table:
 *
 *   - if neither candidate formats back to the requested local time, the time
 *     does not exist (a spring-forward gap);
 *   - if the two candidates are valid but distinct, the time occurs twice (a
 *     fall-back overlap).
 */
export function fromZoned(local: LocalDateTime, tz: TimeZoneId): ZonedResolution {
  const pivot = asIfUtc(local);

  // Probe the offset a day either side rather than iterating from the pivot.
  // Iterating converges on a single candidate, which is fine for an unambiguous
  // local time but cannot discover the *second* occurrence of an ambiguous one.
  // Around a transition these two offsets are exactly the before and after
  // values, which is what makes both candidates constructible.
  const offsetBefore = offsetAt(pivot - DAY_MS, tz);
  const offsetAfter = offsetAt(pivot + DAY_MS, tz);

  // A fall-back reduces the offset, so subtracting the larger (pre-transition)
  // offset always yields the earlier candidate.
  const candidateEarly = pivot - offsetBefore;
  const candidateLate = pivot - offsetAfter;

  const earlyValid = sameLocal(toZoned(candidateEarly, tz), local);
  const lateValid = sameLocal(toZoned(candidateLate, tz), local);

  if (earlyValid && lateValid) {
    if (candidateEarly === candidateLate) {
      return { kind: 'exact', instant: candidateEarly };
    }
    // The clock fell back over this local time, so it happened twice.
    // Policy: take the earlier occurrence.
    return {
      kind: 'ambiguous',
      instant: Math.min(candidateEarly, candidateLate),
      alternate: Math.max(candidateEarly, candidateLate),
    };
  }

  if (earlyValid) return { kind: 'exact', instant: candidateEarly };
  if (lateValid) return { kind: 'exact', instant: candidateLate };

  // Neither round-trips: the local time was skipped by a forward transition.
  // Policy: shift forward by the width of the gap, which is what taking the
  // later-offset candidate's counterpart amounts to.
  return { kind: 'gap', instant: Math.max(candidateEarly, candidateLate) };
}

/** Convenience wrapper returning only the instant, applying the stated policies. */
export function instantFromLocal(local: LocalDateTime, tz: TimeZoneId): Instant {
  return fromZoned(local, tz).instant;
}

/** "YYYY-MM-DD" for the calendar date in `tz` at a given instant. */
export function localDateOf(instant: Instant, tz: TimeZoneId): LocalDate {
  const { year, month, day } = toZoned(instant, tz);
  return formatLocalDate(year, month, day);
}

export function formatLocalDate(year: number, month: number, day: number): LocalDate {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Parse "YYYY-MM-DD" into its parts. Throws on malformed input. */
export function parseLocalDate(date: LocalDate): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new RangeError(`timekit: malformed local date "${date}" (expected YYYY-MM-DD)`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Parse "HH:mm" into minutes since local midnight. Throws on malformed input. */
export function parseLocalTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) throw new RangeError(`timekit: malformed local time "${time}" (expected HH:mm)`);
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new RangeError(`timekit: out-of-range local time "${time}"`);
  return { hour, minute };
}

/**
 * Advance a calendar date by whole days, staying in the proleptic Gregorian
 * calendar. Done in UTC arithmetic because calendar dates carry no zone.
 */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  const { year, month, day } = parseLocalDate(date);
  const t = Date.UTC(year, month - 1, day) + days * 24 * 60 * MINUTE_MS;
  const d = new Date(t);
  return formatLocalDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

const WEEKDAY_INDEX = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

/** The weekday of a calendar date, independent of any zone. */
export function weekdayOf(date: LocalDate): (typeof WEEKDAY_INDEX)[number] {
  const { year, month, day } = parseLocalDate(date);
  const idx = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const wd = WEEKDAY_INDEX[idx];
  if (!wd) throw new Error(`timekit: unreachable weekday index ${idx}`);
  return wd;
}

/** Lexicographic comparison is correct for "YYYY-MM-DD". */
export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
