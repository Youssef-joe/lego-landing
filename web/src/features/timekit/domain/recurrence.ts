/**
 * Recurrence expansion.
 *
 * The rule walks *local calendar dates*, and only the final start/end pair is
 * converted to instants. That ordering is the whole point: "Tuesdays 9-11am"
 * stays 9am local across a DST transition, whereas expanding in UTC and adding
 * 24h repeatedly would drift by an hour twice a year.
 */

import {
  addLocalDays,
  compareLocalDates,
  formatLocalDate,
  instantFromLocal,
  localDateOf,
  parseLocalDate,
  parseLocalTime,
  weekdayOf,
} from './zone';
import type { Interval, Instant, LocalDate, WallClockRule } from './types';

/** Guard against a malformed rule producing an unbounded walk. */
const MAX_DAYS_SCANNED = 366 * 5;

function ruleWindowDates(fromDate: LocalDate, toDate: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  let cursor = fromDate;
  let guard = 0;
  while (compareLocalDates(cursor, toDate) <= 0) {
    out.push(cursor);
    cursor = addLocalDays(cursor, 1);
    if (++guard > MAX_DAYS_SCANNED) {
      throw new RangeError('timekit: recurrence window exceeds the supported range');
    }
  }
  return out;
}

/** Whole days between two calendar dates. */
function daysBetween(from: LocalDate, to: LocalDate): number {
  const a = parseLocalDate(from);
  const b = parseLocalDate(to);
  const ms =
    Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day);
  return Math.round(ms / 86_400_000);
}

function matchesRecurrence(rule: WallClockRule, date: LocalDate, anchor: LocalDate): boolean {
  const { recurrence } = rule;
  const interval = recurrence.interval ?? 1;
  if (interval < 1) throw new RangeError('timekit: recurrence interval must be >= 1');

  if (recurrence.exDates?.includes(date)) return false;
  if (recurrence.until && compareLocalDates(date, recurrence.until) > 0) return false;

  if (recurrence.freq === 'DAILY') {
    const delta = daysBetween(anchor, date);
    return delta >= 0 && delta % interval === 0;
  }

  // WEEKLY
  const byDay = recurrence.byDay;
  if (byDay && byDay.length > 0 && !byDay.includes(weekdayOf(date))) return false;

  // Week alignment is measured from the anchor's own week, using a Monday start
  // so that an interval of 2 means "every other week" in the usual sense.
  const anchorWeekStart = startOfIsoWeek(anchor);
  const dateWeekStart = startOfIsoWeek(date);
  const weeks = Math.round(daysBetween(anchorWeekStart, dateWeekStart) / 7);
  return weeks >= 0 && weeks % interval === 0;
}

function startOfIsoWeek(date: LocalDate): LocalDate {
  const order = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
  const idx = order.indexOf(weekdayOf(date));
  return addLocalDays(date, -idx);
}

/**
 * Expand a wall-clock rule into concrete instant intervals overlapping
 * `window`.
 *
 * Returned intervals are clipped to nothing — they are whole occurrences, and
 * the caller clamps. That keeps this function total and lets a caller decide
 * whether a partially-overlapping occurrence counts.
 *
 * A rule whose `endLocal` is at or before its `startLocal` crosses local
 * midnight and ends the next day.
 */
export function expandRecurrence(rule: WallClockRule, window: Interval): Interval[] {
  const { tz, startLocal, endLocal } = rule;
  const start = parseLocalTime(startLocal);
  const end = parseLocalTime(endLocal);
  const crossesMidnight =
    end.hour < start.hour || (end.hour === start.hour && end.minute <= start.minute);

  // Widen the scanned date range by a day on each side so an occurrence that
  // starts before the window but runs into it is still produced.
  const firstDate = addLocalDays(localDateOf(window.start, tz), -1);
  const lastDate = addLocalDays(localDateOf(window.end, tz), 1);

  const anchor = rule.effectiveFrom ?? firstDate;
  const scanFrom = compareLocalDates(firstDate, anchor) < 0 ? anchor : firstDate;
  if (compareLocalDates(scanFrom, lastDate) > 0) return [];

  const out: Interval[] = [];
  let emitted = 0;

  for (const date of ruleWindowDates(scanFrom, lastDate)) {
    if (rule.effectiveFrom && compareLocalDates(date, rule.effectiveFrom) < 0) continue;
    if (rule.effectiveUntil && compareLocalDates(date, rule.effectiveUntil) > 0) break;
    if (!matchesRecurrence(rule, date, anchor)) continue;

    const startInstant = localInstant(date, start.hour, start.minute, tz);
    const endDate = crossesMidnight ? addLocalDays(date, 1) : date;
    const endInstant = localInstant(endDate, end.hour, end.minute, tz);

    // A forward DST transition can swallow the start, the end, or both. Taking
    // the resolved instants as-is means the occurrence shortens across the
    // transition rather than silently extending past its intended local end.
    if (endInstant > startInstant) {
      out.push({ start: startInstant, end: endInstant });
      emitted += 1;
    }

    if (rule.recurrence.count !== undefined && emitted >= rule.recurrence.count) break;
  }

  return out.filter((i) => i.end > window.start && i.start < window.end);
}

function localInstant(date: LocalDate, hour: number, minute: number, tz: string): Instant {
  const { year, month, day } = parseLocalDate(date);
  return instantFromLocal({ year, month, day, hour, minute, second: 0 }, tz);
}

/** Expand several rules and return their union, merged. */
export function expandRules(rules: readonly WallClockRule[], window: Interval): Interval[] {
  const all: Interval[] = [];
  for (const rule of rules) all.push(...expandRecurrence(rule, window));
  return all.sort((a, b) => a.start - b.start || a.end - b.end);
}

export { formatLocalDate };
