/**
 * Pure grouping and labelling, kept out of the components so it is testable
 * without a DOM and without a test renderer — which keeps the brick's
 * dependency surface at React alone.
 */

import type { SlotDay, SlotView } from './types';

/**
 * The calendar date of an instant in a given zone, as "YYYY-MM-DD".
 *
 * `timekit` already has this, and this brick deliberately does not import it:
 * bricks cannot import each other under a copy-only installer. A little
 * duplication of a well-tested primitive is the honest price of that rule, and
 * it is cheaper than the alternative of a module that will not compile after a
 * copy. Where duplication would be expensive instead, the capability is
 * supplied through a port.
 */
export function dayKeyInZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Group slots into days in the viewer's zone, both days and slots ascending. */
export function groupSlotsByDay(slots: readonly SlotView[], timeZone: string): SlotDay[] {
  const byDay = new Map<string, SlotView[]>();

  for (const slot of slots) {
    const key = dayKeyInZone(slot.startsAt, timeZone);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(slot);
    else byDay.set(key, [slot]);
  }

  return [...byDay.entries()]
    .map(([dayKey, daySlots]) => ({
      dayKey,
      slots: daySlots
        .slice()
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)),
    }))
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
}

/** Drop slots that start before `nowISO`. */
export function dropPastSlots(slots: readonly SlotView[], nowISO: string): SlotView[] {
  const now = Date.parse(nowISO);
  return slots.filter((s) => Date.parse(s.startsAt) >= now);
}

export function isFree(slot: SlotView): boolean {
  return slot.priceMinor === undefined || slot.priceMinor === 0;
}

/** Slot length in whole minutes. */
export function durationMinutes(slot: SlotView): number {
  return Math.round((Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60_000);
}
