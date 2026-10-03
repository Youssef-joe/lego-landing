/**
 * Half-open interval algebra. All intervals are [start, end) so that adjacent
 * intervals never overlap at the boundary — which is what makes back-to-back
 * bookings representable without off-by-one errors.
 */

import type { Interval } from './types';

/** Intervals with zero or negative length carry no information. */
function isNonEmpty(i: Interval): boolean {
  return i.end > i.start;
}

function byStart(a: Interval, b: Interval): number {
  return a.start - b.start || a.end - b.end;
}

/**
 * Sort, drop empties, and coalesce overlapping or touching intervals.
 * Touching intervals are merged: [9,10) and [10,11) become [9,11).
 */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = intervals.filter(isNonEmpty).slice().sort(byStart);
  const out: Interval[] = [];

  for (const cur of sorted) {
    const last = out[out.length - 1];
    if (last && cur.start <= last.end) {
      if (cur.end > last.end) last.end = cur.end;
    } else {
      out.push({ start: cur.start, end: cur.end });
    }
  }
  return out;
}

/** Remove `holes` from `base`, returning the remaining free intervals. */
export function subtractIntervals(
  base: readonly Interval[],
  holes: readonly Interval[],
): Interval[] {
  const merged = mergeIntervals(base);
  const cuts = mergeIntervals(holes);
  if (cuts.length === 0) return merged;

  const out: Interval[] = [];

  for (const region of merged) {
    let cursor = region.start;

    for (const cut of cuts) {
      if (cut.end <= cursor) continue; // entirely before the remaining region
      if (cut.start >= region.end) break; // cuts are sorted; nothing else applies

      if (cut.start > cursor) out.push({ start: cursor, end: cut.start });
      cursor = Math.max(cursor, cut.end);
      if (cursor >= region.end) break;
    }

    if (cursor < region.end) out.push({ start: cursor, end: region.end });
  }

  return out;
}

/** Restrict intervals to a window, dropping anything outside it. */
export function clampIntervals(
  intervals: readonly Interval[],
  window: Interval,
): Interval[] {
  const out: Interval[] = [];
  for (const i of intervals) {
    const start = Math.max(i.start, window.start);
    const end = Math.min(i.end, window.end);
    if (end > start) out.push({ start, end });
  }
  return out;
}

/**
 * Widen each interval outward. Used to apply booking buffers: a booked slot is
 * subtracted expanded by the buffer, so the buffer blocks neighbouring slots
 * without shrinking the slot being offered.
 */
export function padIntervals(
  intervals: readonly Interval[],
  beforeMs: number,
  afterMs: number,
): Interval[] {
  return mergeIntervals(
    intervals.map((i) => ({ start: i.start - beforeMs, end: i.end + afterMs })),
  );
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function totalDurationMs(intervals: readonly Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, i) => sum + (i.end - i.start), 0);
}
