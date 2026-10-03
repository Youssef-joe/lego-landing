/**
 * Turning free intervals into offerable slots.
 *
 * The whole availability pipeline is pure and lives here, so it can be tested
 * without a database and reused by any brick that needs it:
 *
 *   rules (local + tz)
 *     -> expand over the window in the owner's zone
 *     -> subtract blackouts
 *     -> subtract booked intervals, padded by buffers
 *     -> grid into slots
 *     -> drop slots outside the notice window
 */

import { clampIntervals, mergeIntervals, padIntervals, subtractIntervals } from './intervals';
import { expandRules } from './recurrence';
import type { Interval, Slot, SlotOptions, WallClockRule } from './types';

const MINUTE_MS = 60_000;

/**
 * Cut an interval into fixed-length slots.
 *
 * Slots are laid out from the interval's own start rather than from an absolute
 * epoch grid, so a 09:00-11:00 window on a 30-minute grid yields 09:00, 09:30,
 * 10:00, 10:30 regardless of what the zone offset happens to be.
 */
export function gridify(interval: Interval, options: SlotOptions): Slot[] {
  const { durationMin } = options;
  if (durationMin <= 0) throw new RangeError('timekit: durationMin must be > 0');

  const granularityMin = options.granularityMin ?? durationMin;
  if (granularityMin <= 0) throw new RangeError('timekit: granularityMin must be > 0');

  const durationMs = durationMin * MINUTE_MS;
  const stepMs = granularityMin * MINUTE_MS;

  const out: Slot[] = [];
  for (let start = interval.start; start + durationMs <= interval.end; start += stepMs) {
    if (options.notBefore !== undefined && start < options.notBefore) continue;
    if (options.notAfter !== undefined && start > options.notAfter) break;
    out.push({ start, end: start + durationMs });
  }
  return out;
}

export function gridifyAll(intervals: readonly Interval[], options: SlotOptions): Slot[] {
  const out: Slot[] = [];
  for (const interval of intervals) out.push(...gridify(interval, options));
  return out.sort((a, b) => a.start - b.start);
}

/** Everything needed to compute what a person can actually be booked into. */
export interface AvailabilityInput {
  rules: readonly WallClockRule[];
  /** Instant ranges the person is already committed, e.g. existing bookings. */
  busy?: readonly Interval[];
  /** Ad-hoc unavailability, e.g. a blackout week. */
  blackouts?: readonly Interval[];
  /** Extra one-off availability outside the recurring rules. */
  extra?: readonly Interval[];
  /** Dead time to keep clear before and after anything booked. */
  bufferBeforeMin?: number;
  bufferAfterMin?: number;
}

/** The free intervals remaining once every constraint is applied. */
export function freeIntervals(input: AvailabilityInput, window: Interval): Interval[] {
  const base = mergeIntervals([
    ...expandRules(input.rules, window),
    ...(input.extra ?? []),
  ]);

  const bufferBeforeMs = (input.bufferBeforeMin ?? 0) * MINUTE_MS;
  const bufferAfterMs = (input.bufferAfterMin ?? 0) * MINUTE_MS;

  // Buffers widen what is subtracted, not what is offered. Widening the offer
  // instead would make back-to-back bookings impossible.
  const blocked = mergeIntervals([
    ...padIntervals(input.busy ?? [], bufferBeforeMs, bufferAfterMs),
    ...(input.blackouts ?? []),
  ]);

  return clampIntervals(subtractIntervals(base, blocked), window);
}

/** The full pipeline: constraints in, bookable slots out. */
export function availableSlots(
  input: AvailabilityInput,
  window: Interval,
  options: SlotOptions,
): Slot[] {
  return gridifyAll(freeIntervals(input, window), options);
}
