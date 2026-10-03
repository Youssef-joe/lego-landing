import { describe, expect, it } from 'vitest';

import {
  dayKeyInZone,
  dropPastSlots,
  durationMinutes,
  groupSlotsByDay,
  isFree,
} from '../domain/grouping';
import type { SlotView } from '../domain/types';

const slot = (id: string, startsAt: string, minutes = 30, priceMinor?: number): SlotView => ({
  id,
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + minutes * 60_000).toISOString(),
  ...(priceMinor === undefined ? {} : { priceMinor, currency: 'EUR' }),
});

describe('dayKeyInZone', () => {
  it('uses the viewer zone, not UTC', () => {
    // 23:30 UTC is already the next day in Sydney and still the previous in LA.
    const iso = '2026-09-15T23:30:00.000Z';
    expect(dayKeyInZone(iso, 'UTC')).toBe('2026-09-15');
    expect(dayKeyInZone(iso, 'Australia/Sydney')).toBe('2026-09-16');
    expect(dayKeyInZone(iso, 'America/Los_Angeles')).toBe('2026-09-15');
  });

  it('pads single-digit months and days', () => {
    expect(dayKeyInZone('2026-01-05T12:00:00.000Z', 'UTC')).toBe('2026-01-05');
  });
});

describe('groupSlotsByDay', () => {
  it('groups by the viewer day and sorts both levels ascending', () => {
    const slots = [
      slot('c', '2026-09-16T09:00:00.000Z'),
      slot('a', '2026-09-15T08:00:00.000Z'),
      slot('b', '2026-09-15T07:00:00.000Z'),
    ];
    const days = groupSlotsByDay(slots, 'UTC');

    expect(days.map((d) => d.dayKey)).toEqual(['2026-09-15', '2026-09-16']);
    expect(days[0]!.slots.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('regroups when the viewer zone moves a slot across midnight', () => {
    const slots = [slot('late', '2026-09-15T23:30:00.000Z')];

    expect(groupSlotsByDay(slots, 'UTC')[0]!.dayKey).toBe('2026-09-15');
    expect(groupSlotsByDay(slots, 'Australia/Sydney')[0]!.dayKey).toBe('2026-09-16');
  });

  it('returns nothing for no slots', () => {
    expect(groupSlotsByDay([], 'UTC')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const slots = [slot('b', '2026-09-15T09:00:00.000Z'), slot('a', '2026-09-15T08:00:00.000Z')];
    const order = slots.map((s) => s.id);
    groupSlotsByDay(slots, 'UTC');
    expect(slots.map((s) => s.id)).toEqual(order);
  });
});

describe('dropPastSlots', () => {
  it('keeps slots at or after now', () => {
    const slots = [
      slot('past', '2026-09-15T08:00:00.000Z'),
      slot('now', '2026-09-15T09:00:00.000Z'),
      slot('future', '2026-09-15T10:00:00.000Z'),
    ];
    expect(dropPastSlots(slots, '2026-09-15T09:00:00.000Z').map((s) => s.id)).toEqual([
      'now',
      'future',
    ]);
  });
});

describe('slot helpers', () => {
  it('treats a missing or zero price as free', () => {
    expect(isFree(slot('a', '2026-09-15T09:00:00.000Z'))).toBe(true);
    expect(isFree(slot('b', '2026-09-15T09:00:00.000Z', 30, 0))).toBe(true);
    expect(isFree(slot('c', '2026-09-15T09:00:00.000Z', 30, 5000))).toBe(false);
  });

  it('reports duration in whole minutes', () => {
    expect(durationMinutes(slot('a', '2026-09-15T09:00:00.000Z', 45))).toBe(45);
  });
});
