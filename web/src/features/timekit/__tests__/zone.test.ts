import { describe, expect, it } from 'vitest';

import {
  addLocalDays,
  fromZoned,
  instantFromLocal,
  localDateOf,
  offsetAt,
  toZoned,
  weekdayOf,
} from '../domain/zone';

const BERLIN = 'Europe/Berlin';
const NEW_YORK = 'America/New_York';
const SYDNEY = 'Australia/Sydney';
const KOLKATA = 'Asia/Kolkata';

describe('toZoned', () => {
  it('renders an instant as wall-clock time in the target zone', () => {
    // 2026-01-15T12:00:00Z
    const instant = Date.UTC(2026, 0, 15, 12, 0, 0);
    expect(toZoned(instant, BERLIN)).toEqual({
      year: 2026, month: 1, day: 15, hour: 13, minute: 0, second: 0,
    });
    expect(toZoned(instant, NEW_YORK)).toEqual({
      year: 2026, month: 1, day: 15, hour: 7, minute: 0, second: 0,
    });
  });

  it('handles a zone with a half-hour offset', () => {
    const instant = Date.UTC(2026, 0, 15, 12, 0, 0);
    expect(toZoned(instant, KOLKATA)).toEqual({
      year: 2026, month: 1, day: 15, hour: 17, minute: 30, second: 0,
    });
  });

  it('rolls the date when the zone is far enough ahead', () => {
    const instant = Date.UTC(2026, 0, 15, 22, 0, 0);
    const local = toZoned(instant, SYDNEY);
    expect(local.day).toBe(16);
    expect(local.hour).toBe(9);
  });
});

describe('offsetAt', () => {
  it('reports standard and summer offsets for a northern zone', () => {
    const winter = Date.UTC(2026, 0, 15, 12);
    const summer = Date.UTC(2026, 6, 15, 12);
    expect(offsetAt(winter, BERLIN) / 3_600_000).toBe(1);
    expect(offsetAt(summer, BERLIN) / 3_600_000).toBe(2);
  });

  it('reports inverted seasons for a southern zone', () => {
    const jan = Date.UTC(2026, 0, 15, 12);
    const jul = Date.UTC(2026, 6, 15, 12);
    expect(offsetAt(jan, SYDNEY) / 3_600_000).toBe(11);
    expect(offsetAt(jul, SYDNEY) / 3_600_000).toBe(10);
  });
});

describe('fromZoned — the ordinary case', () => {
  it('round-trips a local time that exists exactly once', () => {
    const local = { year: 2026, month: 5, day: 12, hour: 9, minute: 0, second: 0 };
    const res = fromZoned(local, BERLIN);
    expect(res.kind).toBe('exact');
    expect(toZoned(res.instant, BERLIN)).toEqual(local);
  });

  it('round-trips across many zones and dates', () => {
    for (const tz of [BERLIN, NEW_YORK, SYDNEY, KOLKATA, 'UTC']) {
      for (const month of [1, 4, 7, 10]) {
        const local = { year: 2026, month, day: 20, hour: 14, minute: 30, second: 0 };
        const res = fromZoned(local, tz);
        expect(toZoned(res.instant, tz), `${tz} month ${month}`).toEqual(local);
      }
    }
  });
});

describe('fromZoned — DST spring forward (nonexistent local time)', () => {
  // Europe/Berlin 2026-03-29: clocks jump 02:00 -> 03:00 local.
  it('reports a gap and shifts forward to the first valid instant', () => {
    const skipped = { year: 2026, month: 3, day: 29, hour: 2, minute: 30, second: 0 };
    const res = fromZoned(skipped, BERLIN);

    expect(res.kind).toBe('gap');
    // The resolved instant must be real, and must be at or after the transition.
    const rendered = toZoned(res.instant, BERLIN);
    expect(rendered.hour).toBeGreaterThanOrEqual(3);
    expect(rendered.day).toBe(29);
  });

  it('reports a gap for America/New_York, which transitions on a different date', () => {
    // 2026-03-08: clocks jump 02:00 -> 03:00 local.
    const skipped = { year: 2026, month: 3, day: 8, hour: 2, minute: 30, second: 0 };
    const res = fromZoned(skipped, NEW_YORK);
    expect(res.kind).toBe('gap');
    expect(toZoned(res.instant, NEW_YORK).hour).toBeGreaterThanOrEqual(3);
  });

  it('leaves times just outside the gap untouched', () => {
    const before = { year: 2026, month: 3, day: 29, hour: 1, minute: 30, second: 0 };
    const after = { year: 2026, month: 3, day: 29, hour: 3, minute: 30, second: 0 };
    expect(fromZoned(before, BERLIN).kind).toBe('exact');
    expect(fromZoned(after, BERLIN).kind).toBe('exact');
  });
});

describe('fromZoned — DST fall back (ambiguous local time)', () => {
  // Europe/Berlin 2026-10-25: clocks fall 03:00 -> 02:00 local, so 02:30 twice.
  it('reports ambiguity and takes the earlier occurrence', () => {
    const twice = { year: 2026, month: 10, day: 25, hour: 2, minute: 30, second: 0 };
    const res = fromZoned(twice, BERLIN);

    expect(res.kind).toBe('ambiguous');
    expect(res.alternate).toBeDefined();
    expect(res.instant).toBeLessThan(res.alternate as number);
    // Both candidates render back to the requested wall-clock time.
    expect(toZoned(res.instant, BERLIN)).toEqual(twice);
    expect(toZoned(res.alternate as number, BERLIN)).toEqual(twice);
    // They are exactly one hour apart.
    expect((res.alternate as number) - res.instant).toBe(3_600_000);
  });

  it('reports ambiguity for America/New_York on its own transition date', () => {
    // 2026-11-01: clocks fall 02:00 -> 01:00 local.
    const twice = { year: 2026, month: 11, day: 1, hour: 1, minute: 30, second: 0 };
    const res = fromZoned(twice, NEW_YORK);
    expect(res.kind).toBe('ambiguous');
    expect((res.alternate as number) - res.instant).toBe(3_600_000);
  });

  it('reports ambiguity in a southern-hemisphere zone', () => {
    // Australia/Sydney 2026-04-05: clocks fall 03:00 -> 02:00 local.
    const twice = { year: 2026, month: 4, day: 5, hour: 2, minute: 30, second: 0 };
    expect(fromZoned(twice, SYDNEY).kind).toBe('ambiguous');
  });
});

describe('calendar helpers', () => {
  it('advances dates across a month boundary', () => {
    expect(addLocalDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addLocalDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('advances dates across a leap day', () => {
    expect(addLocalDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addLocalDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('computes weekdays independently of any zone', () => {
    expect(weekdayOf('2026-09-16')).toBe('WE');
    expect(weekdayOf('2026-09-20')).toBe('SU');
  });

  it('reports the local calendar date for an instant', () => {
    // 23:30 UTC is already the next day in Sydney.
    const instant = Date.UTC(2026, 8, 15, 23, 30);
    expect(localDateOf(instant, 'UTC')).toBe('2026-09-15');
    expect(localDateOf(instant, SYDNEY)).toBe('2026-09-16');
  });

  it('rejects malformed input rather than guessing', () => {
    expect(() => addLocalDays('15/09/2026', 1)).toThrow(/malformed/);
    expect(() => instantFromLocal(
      { year: 2026, month: 9, day: 16, hour: 9, minute: 0, second: 0 },
      'Not/AZone',
    )).toThrow();
  });
});
