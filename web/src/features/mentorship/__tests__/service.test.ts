import { beforeEach, describe, expect, it } from 'vitest';

import { FakeRepository } from '../testing/fake-repo';
import { createMentorshipService } from '../server/service';
import type {
  AvailabilityRule,
  Booking,
  BookingPolicy,
  MentorIndex,
  MentorProfile,
  MentorshipRepositories,
  PersonSnap,
  Review,
  SessionType,
  SlotLock,
} from '../domain/entities';

/**
 * The service against the in-memory store.
 *
 * The memory adapter is the one every brick's suite runs against, so these
 * tests exercise the same code path a Firestore adapter will have to satisfy —
 * the conformance suite is what keeps the two honest.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const NOW = Date.UTC(2026, 8, 16, 9, 0, 0);

let clock = NOW;
let idCounter = 0;

function makeRepos(): MentorshipRepositories {
  const at = () => new Date(clock).toISOString();
  return {
    mentors: new FakeRepository<MentorProfile>(at),
    mentorIndex: new FakeRepository<MentorIndex>(at),
    sessionTypes: new FakeRepository<SessionType>(at),
    availability: new FakeRepository<AvailabilityRule>(at),
    policies: new FakeRepository<BookingPolicy>(at),
    locks: new FakeRepository<SlotLock>(at),
    bookings: new FakeRepository<Booking>(at),
    reviews: new FakeRepository<Review>(at),
  };
}

const snap = (id: string): PersonSnap => ({ userId: id, displayName: id, snapVersion: 1 });

async function setup(policyOver: Partial<BookingPolicy> = {}) {
  clock = NOW;
  idCounter = 0;
  const repos = makeRepos();

  const notifications: string[] = [];
  const service = createMentorshipService({
    repos,
    now: () => clock,
    newId: (prefix) => `${prefix}_${++idCounter}`,
    dayKeyFor: (instant) => new Date(instant).toISOString().slice(0, 10),
    notify: async (n) => {
      notifications.push(n.kind);
    },
  });

  await repos.mentors.create({
    id: 'm1',
    userId: 'u_mentor',
    slug: 'ada',
    headline: 'Staff engineer',
    bio: '',
    skills: ['Product Management', 'Design'],
    languages: ['English'],
    countries: ['DE'],
    timeZone: 'Europe/Berlin',
    status: 'active',
    verification: 'verified',
    sessionTypeIds: ['st1'],
    acceptsFree: true,
    minPriceMinor: 0,
    ratingCount: 0,
    ratingSum: 0,
    sessionsCompleted: 0,
    noShowCount: 0,
  } as Omit<MentorProfile, 'createdAt' | 'updatedAt' | 'version'>);

  await repos.sessionTypes.create({
    id: 'st1',
    mentorId: 'm1',
    title: 'Intro chat',
    description: '',
    durationMin: 30,
    priceMinor: 0,
    currency: 'EUR',
    capacity: 1,
    intakeQuestions: [],
    active: true,
    order: 0,
  } as Omit<SessionType, 'createdAt' | 'updatedAt' | 'version'>);

  await repos.policies.createIfAbsent('policy_m1', {
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
    ...policyOver,
  } as Omit<BookingPolicy, 'createdAt' | 'updatedAt' | 'version'>);

  return { repos, service, notifications };
}

const request = (startsAt: number, menteeId = 'u_mentee') => ({
  mentorId: 'm1',
  menteeId,
  menteeSnap: snap(menteeId),
  sessionTypeId: 'st1',
  startsAt,
  menteeTimeZone: 'America/New_York',
});

describe('requestBooking', () => {
  it('books a free session and auto-confirms it', async () => {
    const { service } = await setup();
    const result = await service.requestBooking(request(NOW + 5 * HOUR));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.booking.status).toBe('confirmed');
    expect(result.booking.endsAt - result.booking.startsAt).toBe(30 * MIN);
    // Both sides in one array is what lets a single index serve either party.
    expect(result.booking.participantIds.sort()).toEqual(['m1', 'u_mentee']);
  });

  it('records the timezone each side saw at booking time', async () => {
    const { service } = await setup();
    const result = await service.requestBooking(request(NOW + 5 * HOUR));
    if (!result.ok) throw new Error('expected success');
    expect(result.booking.mentorTzAtBooking).toBe('Europe/Berlin');
    expect(result.booking.menteeTzAtBooking).toBe('America/New_York');
  });

  it('claims one lock per granule the session occupies', async () => {
    const { service, repos } = await setup();
    const result = await service.requestBooking(request(NOW + 5 * HOUR));
    if (!result.ok) throw new Error('expected success');
    // 30 minutes on a 15-minute grid.
    expect(result.booking.lockIds).toHaveLength(2);
    expect(await repos.locks.get(result.booking.lockIds[0] as string)).toBeTruthy();
  });

  it('refuses a second booking that overlaps the first', async () => {
    const { service } = await setup();
    const first = await service.requestBooking(request(NOW + 5 * HOUR));
    expect(first.ok).toBe(true);

    const overlapping = await service.requestBooking(request(NOW + 5 * HOUR + 15 * MIN, 'u_other'));
    expect(overlapping.ok).toBe(false);
    if (overlapping.ok) return;
    expect(overlapping.code).toBe('slot_taken');
  });

  it('allows a back-to-back booking when there is no buffer', async () => {
    const { service } = await setup();
    await service.requestBooking(request(NOW + 5 * HOUR));
    const next = await service.requestBooking(request(NOW + 5 * HOUR + 30 * MIN, 'u_other'));
    expect(next.ok).toBe(true);
  });

  it('blocks a back-to-back booking once a buffer is configured', async () => {
    const { service } = await setup({ bufferAfterMin: 15 });
    await service.requestBooking(request(NOW + 5 * HOUR));
    const next = await service.requestBooking(request(NOW + 5 * HOUR + 30 * MIN, 'u_other'));
    expect(next.ok).toBe(false);
  });

  /**
   * The claim the whole design rests on: no transactions, no unique indexes,
   * and still exactly one winner.
   */
  it('lets exactly one of many concurrent bookers win the same slot', async () => {
    const { service, repos } = await setup();
    const startsAt = NOW + 5 * HOUR;

    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) => service.requestBooking(request(startsAt, `u_${i}`))),
    );

    const winners = results.filter((r) => r.ok);
    const losers = results.filter((r) => !r.ok);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(29);
    expect(losers.every((l) => !l.ok && l.code === 'slot_taken')).toBe(true);

    // And the store agrees: one booking, no orphaned locks.
    const bookings = await repos.bookings.list({ limit: 50 });
    expect(bookings.items.filter((b) => b.status !== 'expired')).toHaveLength(1);
  });

  it('refuses a booking inside the notice period', async () => {
    const { service } = await setup();
    const result = await service.requestBooking(request(NOW + 10 * MIN));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('too_late');
  });

  it('enforces the daily cap in the mentor local day', async () => {
    const { service } = await setup({ maxPerDay: 2 });
    await service.requestBooking(request(NOW + 5 * HOUR));
    await service.requestBooking(request(NOW + 6 * HOUR, 'u_b'));
    const third = await service.requestBooking(request(NOW + 7 * HOUR, 'u_c'));
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.code).toBe('daily_cap');
  });

  it('refuses to book an inactive session type', async () => {
    const { service, repos } = await setup();
    await repos.sessionTypes.update('st1', { active: false } as Partial<SessionType>);
    const result = await service.requestBooking(request(NOW + 5 * HOUR));
    expect(result.ok).toBe(false);
  });
});

describe('cancel', () => {
  it('frees the calendar so the slot can be rebooked', async () => {
    const { service } = await setup();
    const first = await service.requestBooking(request(NOW + 48 * HOUR));
    if (!first.ok) throw new Error('expected success');

    await service.cancelBooking({ bookingId: first.booking.id, cancelledBy: 'mentee' });

    const rebook = await service.requestBooking(request(NOW + 48 * HOUR, 'u_other'));
    expect(rebook.ok).toBe(true);
  });

  it('reports a full refund when the mentor cancels late', async () => {
    const { service, repos } = await setup({ refundOnCancel: 'none' });
    await repos.sessionTypes.update('st1', { priceMinor: 5_000 } as Partial<SessionType>);
    const booked = await service.requestBooking(request(NOW + 2 * HOUR));
    if (!booked.ok) throw new Error('expected success');

    const result = await service.cancelBooking({
      bookingId: booked.booking.id,
      cancelledBy: 'mentor',
    });
    expect(result.refund.reason).toBe('mentor_cancelled');
    expect(result.refundMinor).toBe(5_000);
  });

  it('refuses to cancel an already-cancelled booking', async () => {
    const { service } = await setup();
    const booked = await service.requestBooking(request(NOW + 48 * HOUR));
    if (!booked.ok) throw new Error('expected success');
    await service.cancelBooking({ bookingId: booked.booking.id, cancelledBy: 'mentee' });
    await expect(
      service.cancelBooking({ bookingId: booked.booking.id, cancelledBy: 'mentee' }),
    ).rejects.toThrow(/cannot move a booking/);
  });
});

describe('reschedule', () => {
  it('moves a booking and frees the original time', async () => {
    const { service } = await setup();
    const booked = await service.requestBooking(request(NOW + 48 * HOUR));
    if (!booked.ok) throw new Error('expected success');

    const moved = await service.rescheduleBooking({
      bookingId: booked.booking.id,
      newStartsAt: NOW + 50 * HOUR,
    });
    expect(moved.ok).toBe(true);

    // The vacated slot is bookable again.
    const other = await service.requestBooking(request(NOW + 48 * HOUR, 'u_other'));
    expect(other.ok).toBe(true);
  });

  it('keeps the original booking intact when the new time is taken', async () => {
    const { service, repos } = await setup();
    const mine = await service.requestBooking(request(NOW + 48 * HOUR));
    const theirs = await service.requestBooking(request(NOW + 50 * HOUR, 'u_other'));
    if (!mine.ok || !theirs.ok) throw new Error('expected success');

    const moved = await service.rescheduleBooking({
      bookingId: mine.booking.id,
      newStartsAt: NOW + 50 * HOUR,
    });
    expect(moved.ok).toBe(false);

    // Claiming before releasing is what makes this safe: the original survives.
    const still = await repos.bookings.get(mine.booking.id);
    expect(still?.startsAt).toBe(NOW + 48 * HOUR);
    expect(still?.status).toBe('confirmed');
  });

  it('refuses once the reschedule window has closed', async () => {
    const { service } = await setup();
    const booked = await service.requestBooking(request(NOW + 2 * HOUR));
    if (!booked.ok) throw new Error('expected success');
    const moved = await service.rescheduleBooking({
      bookingId: booked.booking.id,
      newStartsAt: NOW + 5 * HOUR,
    });
    expect(moved.ok).toBe(false);
    if (!moved.ok) expect(moved.code).toBe('window_closed');
  });
});

describe('complete and review', () => {
  async function completed() {
    const ctx = await setup();
    const booked = await ctx.service.requestBooking(request(NOW + 5 * HOUR));
    if (!booked.ok) throw new Error('expected success');
    clock = NOW + 6 * HOUR;
    await ctx.service.completeBooking(booked.booking.id);
    return { ...ctx, bookingId: booked.booking.id };
  }

  it('counts a completed session on the mentor profile', async () => {
    const { repos, bookingId } = await completed();
    expect((await repos.bookings.get(bookingId))?.status).toBe('completed');
    expect((await repos.mentors.get('m1'))?.sessionsCompleted).toBe(1);
  });

  it('accepts one review per booking and moves the rating', async () => {
    const { service, repos, bookingId } = await completed();
    const result = await service.reviewBooking({
      bookingId, authorId: 'u_mentee', authorSnap: snap('u_mentee'), score: 5, body: 'great',
    });
    expect(result.ok).toBe(true);

    const mentor = await repos.mentors.get('m1');
    expect(mentor?.ratingCount).toBe(1);
    expect(mentor?.ratingSum).toBe(5);

    const index = await repos.mentorIndex.get('idx_m1');
    expect(index?.avgRating).toBe(5);
  });

  it('refuses a second review of the same booking', async () => {
    const { service, bookingId } = await completed();
    await service.reviewBooking({
      bookingId, authorId: 'u_mentee', authorSnap: snap('u_mentee'), score: 5, body: 'a',
    });
    const again = await service.reviewBooking({
      bookingId, authorId: 'u_mentee', authorSnap: snap('u_mentee'), score: 1, body: 'b',
    });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('already_reviewed');
  });

  it('refuses a review from anyone but the mentee', async () => {
    const { service, bookingId } = await completed();
    const result = await service.reviewBooking({
      bookingId, authorId: 'u_stranger', authorSnap: snap('u_stranger'), score: 5, body: 'x',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_permitted');
  });

  it('refuses a review of a session that never happened', async () => {
    const { service } = await setup();
    const booked = await service.requestBooking(request(NOW + 5 * HOUR));
    if (!booked.ok) throw new Error('expected success');
    const result = await service.reviewBooking({
      bookingId: booked.booking.id, authorId: 'u_mentee', authorSnap: snap('u_mentee'),
      score: 5, body: 'x',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_permitted');
  });

  it('rejects an out-of-range score', async () => {
    const { service, bookingId } = await completed();
    for (const score of [0, 6, 4.5]) {
      const r = await service.reviewBooking({
        bookingId, authorId: 'u_mentee', authorSnap: snap('u_mentee'), score, body: 'x',
      });
      expect(r.ok).toBe(false);
    }
  });
});

describe('holds', () => {
  it('reclaims an expired hold so the slot becomes bookable again', async () => {
    const { service, repos } = await setup();
    // A hold with nothing behind it, as a crashed checkout would leave.
    await repos.locks.createIfAbsent('m1_stale', {
      id: 'm1_stale', mentorId: 'm1', granuleStart: NOW + 5 * HOUR,
      status: 'held', bookingId: 'gone', holderId: 'u', expiresAt: NOW - 1,
    } as Omit<SlotLock, 'createdAt' | 'updatedAt' | 'version'>);

    expect(await service.sweepExpiredHolds()).toBe(1);
    expect(await repos.locks.get('m1_stale')).toBeNull();
  });

  it('leaves live holds alone', async () => {
    const { service, repos } = await setup();
    await repos.locks.createIfAbsent('m1_live', {
      id: 'm1_live', mentorId: 'm1', granuleStart: NOW + 5 * HOUR,
      status: 'held', bookingId: 'b', holderId: 'u', expiresAt: NOW + HOUR,
    } as Omit<SlotLock, 'createdAt' | 'updatedAt' | 'version'>);
    expect(await service.sweepExpiredHolds()).toBe(0);
  });
});

describe('discovery', () => {
  it('ranks active mentors and excludes inactive ones', async () => {
    const { service, repos } = await setup();
    await service.reindexMentor('m1');

    let page = await service.discover({});
    expect(page.items.map((m) => m.mentorId)).toEqual(['m1']);

    await repos.mentors.update('m1', { status: 'paused' } as Partial<MentorProfile>);
    await service.reindexMentor('m1');
    page = await service.discover({});
    expect(page.items).toHaveLength(0);
  });

  it('filters by a facet token', async () => {
    const { service } = await setup();
    await service.reindexMentor('m1');
    expect((await service.discover({ facet: 'sk:design' })).items).toHaveLength(1);
    expect((await service.discover({ facet: 'sk:rust' })).items).toHaveLength(0);
  });
});

describe('listUpcoming', () => {
  beforeEach(() => {
    clock = NOW;
  });

  it('returns future bookings for either party, soonest first', async () => {
    const { service } = await setup();
    await service.requestBooking(request(NOW + 8 * HOUR));
    await service.requestBooking(request(NOW + 5 * HOUR, 'u_mentee'));

    const mentee = await service.listUpcoming('u_mentee');
    expect(mentee.items.map((b) => b.startsAt)).toEqual([NOW + 5 * HOUR, NOW + 8 * HOUR]);

    // The same index serves the mentor.
    const mentor = await service.listUpcoming('m1');
    expect(mentor.items).toHaveLength(2);
  });

  it('omits cancelled bookings and other people\'s', async () => {
    const { service } = await setup();
    const a = await service.requestBooking(request(NOW + 5 * HOUR, 'u_a'));
    await service.requestBooking(request(NOW + 8 * HOUR, 'u_b'));
    if (!a.ok) throw new Error('expected success');
    await service.cancelBooking({ bookingId: a.booking.id, cancelledBy: 'mentee' });

    expect(await service.listUpcoming('u_a').then((p) => p.items)).toHaveLength(0);
    expect(await service.listUpcoming('u_b').then((p) => p.items)).toHaveLength(1);
  });
});
