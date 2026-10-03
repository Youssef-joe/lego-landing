import { describe, expect, it } from 'vitest';

import { expandRecurrence, expandRules } from '../domain/recurrence';
import { offsetAt, toZoned } from '../domain/zone';
import type { Interval, WallClockRule } from '../domain/types';

const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';

const HOUR = 3_600_000;

function window(fromIso: string, toIso: string): Interval {
  return { start: Date.parse(fromIso), end: Date.parse(toIso) };
}

/** Render an occurrence as local "YYYY-MM-DD HH:mm" for readable expectations. */
function localOf(instant: number, tz: string): string {
  const l = toZoned(instant, tz);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${l.year}-${p(l.month)}-${p(l.day)} ${p(l.hour)}:${p(l.minute)}`;
}

describe('expandRecurrence — weekly', () => {
  const tuesdays: WallClockRule = {
    tz: BERLIN,
    recurrence: { freq: 'WEEKLY', byDay: ['TU'] },
    startLocal: '09:00',
    endLocal: '11:00',
  };

  it('emits one occurrence per matching weekday', () => {
    const out = expandRecurrence(tuesdays, window('2026-09-01T00:00:00Z', '2026-09-29T00:00:00Z'));
    expect(out.map((i) => localOf(i.start, BERLIN))).toEqual([
      '2026-09-01 09:00',
      '2026-09-08 09:00',
      '2026-09-15 09:00',
      '2026-09-22 09:00',
    ]);
  });

  it('honours multiple weekdays', () => {
    const rule: WallClockRule = { ...tuesdays, recurrence: { freq: 'WEEKLY', byDay: ['MO', 'TH'] } };
    const out = expandRecurrence(rule, window('2026-09-01T00:00:00Z', '2026-09-12T00:00:00Z'));
    expect(out.map((i) => localOf(i.start, BERLIN))).toEqual([
      '2026-09-03 09:00',
      '2026-09-07 09:00',
      '2026-09-10 09:00',
    ]);
  });

  it('honours an interval of 2 as every other week', () => {
    const rule: WallClockRule = {
      ...tuesdays,
      effectiveFrom: '2026-09-01',
      recurrence: { freq: 'WEEKLY', byDay: ['TU'], interval: 2 },
    };
    const out = expandRecurrence(rule, window('2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'));
    expect(out.map((i) => localOf(i.start, BERLIN))).toEqual([
      '2026-09-01 09:00',
      '2026-09-15 09:00',
      '2026-09-29 09:00',
    ]);
  });

  it('respects effectiveFrom, effectiveUntil, until, count and exDates', () => {
    const base = window('2026-09-01T00:00:00Z', '2026-10-06T00:00:00Z');

    // Sept 9 is a Wednesday, so this drops the Sept 8 occurrence; the Oct 6 one
    // starts after the window ends.
    expect(
      expandRecurrence({ ...tuesdays, effectiveFrom: '2026-09-09' }, base),
    ).toHaveLength(3);

    expect(
      expandRecurrence({ ...tuesdays, effectiveUntil: '2026-09-16' }, base),
    ).toHaveLength(3);

    expect(
      expandRecurrence(
        { ...tuesdays, recurrence: { freq: 'WEEKLY', byDay: ['TU'], until: '2026-09-15' } },
        base,
      ),
    ).toHaveLength(3);

    expect(
      expandRecurrence(
        { ...tuesdays, effectiveFrom: '2026-09-01', recurrence: { freq: 'WEEKLY', byDay: ['TU'], count: 2 } },
        base,
      ),
    ).toHaveLength(2);

    const withExDate = expandRecurrence(
      { ...tuesdays, recurrence: { freq: 'WEEKLY', byDay: ['TU'], exDates: ['2026-09-08'] } },
      base,
    );
    expect(withExDate.map((i) => localOf(i.start, BERLIN))).not.toContain('2026-09-08 09:00');
  });
});

describe('expandRecurrence — daily and midnight-crossing', () => {
  it('emits every day for a DAILY rule', () => {
    const rule: WallClockRule = {
      tz: BERLIN,
      recurrence: { freq: 'DAILY' },
      startLocal: '08:00',
      endLocal: '09:00',
      effectiveFrom: '2026-09-01',
    };
    const out = expandRecurrence(rule, window('2026-09-01T00:00:00Z', '2026-09-05T00:00:00Z'));
    expect(out).toHaveLength(4);
  });

  it('treats an end before the start as crossing local midnight', () => {
    const rule: WallClockRule = {
      tz: BERLIN,
      recurrence: { freq: 'DAILY' },
      startLocal: '22:00',
      endLocal: '01:00',
      effectiveFrom: '2026-09-01',
    };
    const [first] = expandRecurrence(rule, window('2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z'));
    expect(first).toBeDefined();
    expect(localOf(first!.start, BERLIN)).toBe('2026-09-01 22:00');
    expect(localOf(first!.end, BERLIN)).toBe('2026-09-02 01:00');
    expect(first!.end - first!.start).toBe(3 * HOUR);
  });
});

describe('expandRecurrence — DST correctness', () => {
  // This is the behaviour the whole wall-clock storage rule exists to protect:
  // the local start time must not drift when the offset changes.
  it('keeps the local start time fixed across a spring-forward transition', () => {
    const rule: WallClockRule = {
      tz: BERLIN,
      recurrence: { freq: 'WEEKLY', byDay: ['SU'] },
      startLocal: '09:00',
      endLocal: '11:00',
    };
    // Berlin springs forward on 2026-03-29.
    const out = expandRecurrence(rule, window('2026-03-20T00:00:00Z', '2026-04-10T00:00:00Z'));
    const locals = out.map((i) => localOf(i.start, BERLIN));
    expect(locals).toEqual(['2026-03-22 09:00', '2026-03-29 09:00', '2026-04-05 09:00']);

    // The UTC instants differ by an hour either side of the transition, which is
    // exactly the drift that storing UTC would have hidden.
    expect(offsetAt(out[0]!.start, BERLIN)).toBe(1 * HOUR);
    expect(offsetAt(out[1]!.start, BERLIN)).toBe(2 * HOUR);
  });

  it('keeps the local start time fixed across a fall-back transition', () => {
    const rule: WallClockRule = {
      tz: NEW_YORK,
      recurrence: { freq: 'WEEKLY', byDay: ['SU'] },
      startLocal: '09:00',
      endLocal: '10:00',
    };
    // New York falls back on 2026-11-01.
    const out = expandRecurrence(rule, window('2026-10-24T00:00:00Z', '2026-11-09T00:00:00Z'));
    expect(out.map((i) => localOf(i.start, NEW_YORK))).toEqual([
      '2026-10-25 09:00',
      '2026-11-01 09:00',
      '2026-11-08 09:00',
    ]);
  });

  it('shortens rather than overruns when a transition falls inside the window', () => {
    // 02:00-04:00 local on the spring-forward day: 02:00 does not exist, so the
    // occurrence resolves forward and the real duration is less than 2h.
    const rule: WallClockRule = {
      tz: BERLIN,
      recurrence: { freq: 'DAILY' },
      startLocal: '02:00',
      endLocal: '04:00',
      effectiveFrom: '2026-03-29',
      effectiveUntil: '2026-03-29',
    };
    const [occ] = expandRecurrence(rule, window('2026-03-28T00:00:00Z', '2026-03-30T00:00:00Z'));
    expect(occ).toBeDefined();
    expect(occ!.end - occ!.start).toBe(1 * HOUR);
    expect(localOf(occ!.end, BERLIN)).toBe('2026-03-29 04:00');
  });
});

describe('expandRules', () => {
  it('unions several rules in start order', () => {
    const morning: WallClockRule = {
      tz: BERLIN, recurrence: { freq: 'WEEKLY', byDay: ['TU'] },
      startLocal: '09:00', endLocal: '10:00',
    };
    const evening: WallClockRule = {
      tz: BERLIN, recurrence: { freq: 'WEEKLY', byDay: ['TU'] },
      startLocal: '17:00', endLocal: '18:00',
    };
    const out = expandRules([evening, morning], window('2026-09-01T00:00:00Z', '2026-09-03T00:00:00Z'));
    expect(out.map((i) => localOf(i.start, BERLIN))).toEqual([
      '2026-09-01 09:00',
      '2026-09-01 17:00',
    ]);
  });

  it('returns nothing when the window precedes the rule', () => {
    const rule: WallClockRule = {
      tz: BERLIN, recurrence: { freq: 'DAILY' },
      startLocal: '09:00', endLocal: '10:00', effectiveFrom: '2027-01-01',
    };
    expect(expandRecurrence(rule, window('2026-09-01T00:00:00Z', '2026-09-05T00:00:00Z'))).toEqual([]);
  });
});
