import { describe, expect, it } from 'vitest';

import {
  BookingError,
  assertTransition,
  buildFacetKeys,
  canReschedule,
  canTransition,
  checkNotice,
  computeRankScore,
  evaluateRefund,
  granuleId,
  granulesFor,
  lockBlocks,
  occupiesCalendar,
  refundAmountMinor,
  slugifyToken,
} from '../domain/booking';
import type { BookingPolicy, SlotLock } from '../domain/entities';

const MIN = 60_000;
const HOUR = 60 * MIN;

const policy = (over: Partial<BookingPolicy> = {}): BookingPolicy => ({
  id: 'policy_m1',
  mentorId: 'm1',
  minNoticeMin: 60,
  maxAdvanceDays: 60,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  granularityMin: 15,
  maxPerDay: 8,
  cancellationWindowHours: 24,
  rescheduleWindowHours: 24,
  refundOnCancel: 'none',
  autoConfirm: true,
  createdAt: '', updatedAt: '', version: 1,
  ...over,
});

describe('granule locks', () => {
  it('derives a stable id from the mentor and the granule start', () => {
    expect(granuleId('m1', 1_000)).toBe('m1_1000');
    // Determinism is the whole mechanism: two racing callers must compute the
    // same id so the store decides the winner.
    expect(granuleId('m1', 1_000)).toBe(granuleId('m1', 1_000));
  });

  it('covers a booking with one granule per grid step', () => {
    const granules = granulesFor(0, 60 * MIN, policy({ granularityMin: 15 }));
    expect(granules).toEqual([0, 15 * MIN, 30 * MIN, 45 * MIN]);
  });

  it('snaps outward so a partial overlap claims the whole granule', () => {
    // 09:07-09:37 on a 15-minute grid must claim 09:00, 09:15 and 09:30.
    const granules = granulesFor(7 * MIN, 37 * MIN, policy({ granularityMin: 15 }));
    expect(granules).toEqual([0, 15 * MIN, 30 * MIN]);
  });

  it('includes buffers in the claimed range', () => {
    const granules = granulesFor(
      30 * MIN,
      60 * MIN,
      policy({ granularityMin: 15, bufferBeforeMin: 15, bufferAfterMin: 15 }),
    );
    expect(granules).toEqual([15 * MIN, 30 * MIN, 45 * MIN, 60 * MIN]);
  });

  it('makes adjacent bookings collide when a buffer separates them', () => {
    const p = policy({ granularityMin: 15, bufferAfterMin: 15 });
    const first = granulesFor(0, 30 * MIN, p);
    const second = granulesFor(30 * MIN, 60 * MIN, p);
    const overlap = first.filter((g) => second.includes(g));
    expect(overlap.length > 0).toBe(true);
  });

  it('lets back-to-back bookings coexist when there is no buffer', () => {
    const p = policy({ granularityMin: 15 });
    const first = granulesFor(0, 30 * MIN, p);
    const second = granulesFor(30 * MIN, 60 * MIN, p);
    expect(first.filter((g) => second.includes(g))).toEqual([]);
  });

  it('treats a booked lock as blocking and an expired hold as free', () => {
    const base: SlotLock = {
      id: 'l', mentorId: 'm1', granuleStart: 0, status: 'held',
      bookingId: 'b', holderId: 'u', expiresAt: 500,
      createdAt: '', updatedAt: '', version: 1,
    };
    expect(lockBlocks({ ...base, status: 'booked', expiresAt: 0 }, 1_000)).toBe(true);
    expect(lockBlocks(base, 400)).toBe(true);
    expect(lockBlocks(base, 600)).toBe(false);
  });
});

describe('the status machine', () => {
  it('allows the real paths', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'completed')).toBe(true);
    expect(canTransition('confirmed', 'no_show_mentee')).toBe(true);
  });

  it('refuses to resurrect a terminal booking', () => {
    expect(canTransition('completed', 'confirmed')).toBe(false);
    expect(canTransition('cancelled_by_mentee', 'confirmed')).toBe(false);
    expect(() => assertTransition('completed', 'pending')).toThrow(BookingError);
  });

  it('refuses to complete a booking that was never confirmed', () => {
    expect(canTransition('pending', 'completed')).toBe(false);
  });

  it('knows which states still hold the calendar', () => {
    expect(occupiesCalendar('pending')).toBe(true);
    expect(occupiesCalendar('confirmed')).toBe(true);
    expect(occupiesCalendar('cancelled_by_mentee')).toBe(false);
    expect(occupiesCalendar('completed')).toBe(false);
  });
});

describe('notice window', () => {
  const now = 1_000 * HOUR;

  it('rejects a booking inside the notice period', () => {
    expect(checkNotice(now + 30 * MIN, now, policy({ minNoticeMin: 60 }))).toEqual({
      ok: false,
      reason: 'too_late',
    });
  });

  it('rejects a booking beyond the horizon', () => {
    expect(checkNotice(now + 90 * 24 * HOUR, now, policy({ maxAdvanceDays: 60 })).reason).toBe(
      'too_far_ahead',
    );
  });

  it('accepts one inside the window', () => {
    expect(checkNotice(now + 5 * HOUR, now, policy()).ok).toBe(true);
  });
});

describe('refund policy', () => {
  const now = 1_000 * HOUR;
  const startsAt = now + 48 * HOUR;

  it('refunds nothing for a free session', () => {
    const d = evaluateRefund({ startsAt, priceMinor: 0, cancelledBy: 'mentee' }, now, policy());
    expect(d.reason).toBe('free');
    expect(d.refundBasisPoints).toBe(0);
  });

  it('always refunds in full when the mentor cancels, even late', () => {
    const late = now + 1 * HOUR;
    const d = evaluateRefund(
      { startsAt: late, priceMinor: 5_000, cancelledBy: 'mentor' },
      now,
      policy({ refundOnCancel: 'none' }),
    );
    expect(d.reason).toBe('mentor_cancelled');
    expect(refundAmountMinor(5_000, d)).toBe(5_000);
  });

  it('refunds in full when the mentee cancels inside the window', () => {
    const d = evaluateRefund({ startsAt, priceMinor: 5_000, cancelledBy: 'mentee' }, now, policy());
    expect(d.reason).toBe('within_window');
    expect(refundAmountMinor(5_000, d)).toBe(5_000);
  });

  it('applies the mentor policy when the mentee cancels late', () => {
    const late = now + 2 * HOUR;
    const none = evaluateRefund(
      { startsAt: late, priceMinor: 5_000, cancelledBy: 'mentee' },
      now,
      policy({ refundOnCancel: 'none' }),
    );
    expect(refundAmountMinor(5_000, none)).toBe(0);

    const partial = evaluateRefund(
      { startsAt: late, priceMinor: 5_000, cancelledBy: 'mentee' },
      now,
      policy({ refundOnCancel: 'partial', partialRefundPercent: 50 }),
    );
    expect(refundAmountMinor(5_000, partial)).toBe(2_500);

    const full = evaluateRefund(
      { startsAt: late, priceMinor: 5_000, cancelledBy: 'mentee' },
      now,
      policy({ refundOnCancel: 'full' }),
    );
    expect(refundAmountMinor(5_000, full)).toBe(5_000);
  });

  it('computes a partial refund without floating point drift', () => {
    const d = evaluateRefund(
      { startsAt: now + HOUR, priceMinor: 3_333, cancelledBy: 'mentee' },
      now,
      policy({ refundOnCancel: 'partial', partialRefundPercent: 33 }),
    );
    const amount = refundAmountMinor(3_333, d);
    expect(Number.isInteger(amount)).toBe(true);
    expect(amount).toBe(1_100);
  });
});

describe('reschedule window', () => {
  const now = 1_000 * HOUR;

  it('allows a move well ahead of the session', () => {
    expect(canReschedule(now + 48 * HOUR, 'confirmed', now, policy())).toBe(true);
  });

  it('refuses a move once the window has closed', () => {
    expect(canReschedule(now + 2 * HOUR, 'confirmed', now, policy())).toBe(false);
  });

  it('refuses to move a booking that no longer holds the calendar', () => {
    expect(canReschedule(now + 48 * HOUR, 'completed', now, policy())).toBe(false);
    expect(canReschedule(now + 48 * HOUR, 'cancelled_by_mentee', now, policy())).toBe(false);
  });
});

describe('discovery facets', () => {
  it('slugifies skills into stable tokens', () => {
    expect(slugifyToken('Product Management')).toBe('product-management');
    expect(slugifyToken('  C++  ')).toBe('c');
    expect(slugifyToken('Café')).toBe('cafe');
  });

  it('builds skill, language and price tokens', () => {
    const keys = buildFacetKeys({
      skills: ['Product Management', 'Design'],
      languages: ['English'],
      acceptsFree: true,
      avgRating: 0,
      ratingCount: 0,
    });
    expect(keys).toContain('sk:product-management');
    expect(keys).toContain('sk:design');
    expect(keys).toContain('lang:english');
    expect(keys).toContain('price:free');
  });

  it('withholds a rating token until there is enough signal', () => {
    const thin = buildFacetKeys({
      skills: [], languages: [], acceptsFree: false, avgRating: 5, ratingCount: 1,
    });
    expect(thin.some((k) => k.startsWith('rating:'))).toBe(false);

    const solid = buildFacetKeys({
      skills: [], languages: [], acceptsFree: false, avgRating: 4.6, ratingCount: 12,
    });
    expect(solid).toContain('rating:4plus');
    expect(solid).toContain('rating:45plus');
  });

  it('buckets experience', () => {
    const at = (years: number) =>
      buildFacetKeys({ skills: [], languages: [], acceptsFree: false, avgRating: 0, ratingCount: 0, yearsExperience: years });
    expect(at(1).some((k) => k.startsWith('exp:'))).toBe(false);
    expect(at(3)).toContain('exp:mid');
    expect(at(7)).toContain('exp:senior');
    expect(at(12)).toContain('exp:principal');
  });

  it('deduplicates and sorts so the token list is stable', () => {
    const keys = buildFacetKeys({
      skills: ['Design', 'design'], languages: [], acceptsFree: false, avgRating: 0, ratingCount: 0,
    });
    expect(keys.filter((k) => k === 'sk:design')).toHaveLength(1);
    expect([...keys].sort()).toEqual(keys);
  });
});

describe('rank score', () => {
  const base = { avgRating: 0, ratingCount: 0, sessionsCompleted: 0, noShowCount: 0, acceptsFree: false };

  it('damps a high rating that rests on one review', () => {
    const thin = computeRankScore({ ...base, avgRating: 5, ratingCount: 1 });
    const solid = computeRankScore({ ...base, avgRating: 4.6, ratingCount: 50 });
    expect(solid).toBeGreaterThan(thin);
  });

  it('rewards completed sessions with diminishing returns', () => {
    const at = (n: number) => computeRankScore({ ...base, sessionsCompleted: n });
    expect(at(100)).toBeGreaterThan(at(10));

    // The same absolute increase is worth less at a higher baseline, which is
    // the property that stops volume dominating the ranking outright.
    const earlyGain = at(10) - at(0);
    const lateGain = at(110) - at(100);
    expect(lateGain).toBeLessThan(earlyGain);
  });

  it('penalises no-shows', () => {
    const reliable = computeRankScore({ ...base, sessionsCompleted: 20, noShowCount: 0 });
    const flaky = computeRankScore({ ...base, sessionsCompleted: 20, noShowCount: 10 });
    expect(reliable).toBeGreaterThan(flaky);
  });
});
