import { describe, expect, it } from 'vitest';

import { availableSlots, freeIntervals, gridify, gridifyAll } from '../domain/slots';
import { toZoned } from '../domain/zone';
import type { Interval, WallClockRule } from '../domain/types';

const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';
const MIN = 60_000;

function at(iso: string): number {
  return Date.parse(iso);
}
function window(from: string, to: string): Interval {
  return { start: at(from), end: at(to) };
}
function hhmm(instant: number, tz: string): string {
  const l = toZoned(instant, tz);
  return `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}`;
}

describe('gridify', () => {
  const base: Interval = { start: at('2026-09-15T09:00:00Z'), end: at('2026-09-15T11:00:00Z') };

  it('cuts an interval into back-to-back slots by default', () => {
    const slots = gridify(base, { durationMin: 30 });
    expect(slots).toHaveLength(4);
    expect(slots.map((s) => hhmm(s.start, 'UTC'))).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('overlaps slots when granularity is finer than duration', () => {
    const slots = gridify(base, { durationMin: 60, granularityMin: 30 });
    expect(slots.map((s) => hhmm(s.start, 'UTC'))).toEqual(['09:00', '09:30', '10:00']);
  });

  it('never emits a slot that would overrun the interval', () => {
    const slots = gridify(base, { durationMin: 45 });
    expect(slots.map((s) => hhmm(s.start, 'UTC'))).toEqual(['09:00', '09:45']);
    expect(slots.every((s) => s.end <= base.end)).toBe(true);
  });

  it('returns nothing when the interval is shorter than one slot', () => {
    expect(gridify({ start: 0, end: 10 * MIN }, { durationMin: 30 })).toEqual([]);
  });

  it('lays slots out from the interval start, not an absolute grid', () => {
    const odd: Interval = { start: at('2026-09-15T09:07:00Z'), end: at('2026-09-15T10:07:00Z') };
    expect(gridify(odd, { durationMin: 30 }).map((s) => hhmm(s.start, 'UTC'))).toEqual([
      '09:07',
      '09:37',
    ]);
  });

  it('applies the notice window', () => {
    const slots = gridify(base, { durationMin: 30, notBefore: at('2026-09-15T09:45:00Z') });
    expect(slots.map((s) => hhmm(s.start, 'UTC'))).toEqual(['10:00', '10:30']);
  });

  it('rejects a nonsensical duration rather than looping', () => {
    expect(() => gridify(base, { durationMin: 0 })).toThrow(/durationMin/);
    expect(() => gridify(base, { durationMin: 30, granularityMin: 0 })).toThrow(/granularityMin/);
  });
});

describe('gridifyAll', () => {
  it('grids several intervals and returns them in order', () => {
    const slots = gridifyAll(
      [
        { start: at('2026-09-15T14:00:00Z'), end: at('2026-09-15T15:00:00Z') },
        { start: at('2026-09-15T09:00:00Z'), end: at('2026-09-15T10:00:00Z') },
      ],
      { durationMin: 60 },
    );
    expect(slots.map((s) => hhmm(s.start, 'UTC'))).toEqual(['09:00', '14:00']);
  });
});

describe('freeIntervals', () => {
  const tuesdays: WallClockRule = {
    tz: BERLIN,
    recurrence: { freq: 'WEEKLY', byDay: ['TU'] },
    startLocal: '09:00',
    endLocal: '12:00',
  };
  const day = window('2026-09-15T00:00:00Z', '2026-09-16T00:00:00Z');

  it('returns the whole rule window when nothing is booked', () => {
    const [free] = freeIntervals({ rules: [tuesdays] }, day);
    expect(free).toBeDefined();
    expect(hhmm(free!.start, BERLIN)).toBe('09:00');
    expect(hhmm(free!.end, BERLIN)).toBe('12:00');
  });

  it('subtracts a booking', () => {
    const busy = [{ start: at('2026-09-15T08:00:00Z'), end: at('2026-09-15T09:00:00Z') }];
    const free = freeIntervals({ rules: [tuesdays], busy }, day);
    // 08:00Z-09:00Z is 10:00-11:00 Berlin.
    expect(free.map((f) => `${hhmm(f.start, BERLIN)}-${hhmm(f.end, BERLIN)}`)).toEqual([
      '09:00-10:00',
      '11:00-12:00',
    ]);
  });

  it('widens what is subtracted by the buffers, not what is offered', () => {
    const busy = [{ start: at('2026-09-15T08:00:00Z'), end: at('2026-09-15T09:00:00Z') }];
    const free = freeIntervals(
      { rules: [tuesdays], busy, bufferBeforeMin: 15, bufferAfterMin: 15 },
      day,
    );
    expect(free.map((f) => `${hhmm(f.start, BERLIN)}-${hhmm(f.end, BERLIN)}`)).toEqual([
      '09:00-09:45',
      '11:15-12:00',
    ]);
  });

  it('subtracts a blackout', () => {
    const blackouts = [{ start: at('2026-09-15T00:00:00Z'), end: at('2026-09-16T00:00:00Z') }];
    expect(freeIntervals({ rules: [tuesdays], blackouts }, day)).toEqual([]);
  });

  it('adds one-off extra availability outside the rules', () => {
    const extra = [{ start: at('2026-09-15T16:00:00Z'), end: at('2026-09-15T17:00:00Z') }];
    const free = freeIntervals({ rules: [tuesdays], extra }, day);
    expect(free).toHaveLength(2);
    expect(hhmm(free[1]!.start, BERLIN)).toBe('18:00');
  });
});

describe('availableSlots — the full pipeline', () => {
  it('produces bookable slots in a viewer timezone different from the owner', () => {
    // A Berlin mentor offering Tuesdays 09:00-11:00, viewed from New York.
    const rule: WallClockRule = {
      tz: BERLIN,
      recurrence: { freq: 'WEEKLY', byDay: ['TU'] },
      startLocal: '09:00',
      endLocal: '11:00',
    };
    const slots = availableSlots(
      { rules: [rule] },
      window('2026-09-15T00:00:00Z', '2026-09-16T00:00:00Z'),
      { durationMin: 30 },
    );

    expect(slots.map((s) => hhmm(s.start, BERLIN))).toEqual(['09:00', '09:30', '10:00', '10:30']);
    // Berlin is UTC+2 in September, New York UTC-4: a six hour difference.
    expect(slots.map((s) => hhmm(s.start, NEW_YORK))).toEqual(['03:00', '03:30', '04:00', '04:30']);
  });

  it('keeps the owner local time stable across a DST transition', () => {
    const rule: WallClockRule = {
      tz: BERLIN,
      recurrence: { freq: 'WEEKLY', byDay: ['SU'] },
      startLocal: '09:00',
      endLocal: '10:00',
    };
    // The Sunday before and the Sunday of Berlin's spring-forward transition.
    const before = availableSlots(
      { rules: [rule] }, window('2026-03-22T00:00:00Z', '2026-03-23T00:00:00Z'), { durationMin: 60 },
    );
    const after = availableSlots(
      { rules: [rule] }, window('2026-03-29T00:00:00Z', '2026-03-30T00:00:00Z'), { durationMin: 60 },
    );

    expect(hhmm(before[0]!.start, BERLIN)).toBe('09:00');
    expect(hhmm(after[0]!.start, BERLIN)).toBe('09:00');
    // Same local time, one hour apart in UTC — the drift the design prevents.
    expect(hhmm(before[0]!.start, 'UTC')).toBe('08:00');
    expect(hhmm(after[0]!.start, 'UTC')).toBe('07:00');
  });

  it('excludes a slot that a booking plus its buffer makes unbookable', () => {
    const rule: WallClockRule = {
      tz: 'UTC',
      recurrence: { freq: 'DAILY' },
      startLocal: '09:00',
      endLocal: '11:00',
      effectiveFrom: '2026-09-15',
    };
    const busy = [{ start: at('2026-09-15T09:30:00Z'), end: at('2026-09-15T10:00:00Z') }];
    const slots = availableSlots(
      { rules: [rule], busy, bufferBeforeMin: 10, bufferAfterMin: 10 },
      window('2026-09-15T00:00:00Z', '2026-09-16T00:00:00Z'),
      { durationMin: 30 },
    );
    // The buffer blocks 09:20-10:10, leaving 09:00-09:20 (too short for a
    // 30-minute slot) and 10:10-11:00 (room for exactly one, since a second
    // would end at 11:10 and overrun the rule).
    expect(slots.map((s) => hhmm(s.start, 'UTC'))).toEqual(['10:10']);
  });
});
