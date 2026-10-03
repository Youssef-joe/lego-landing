/**
 * The mentorship service.
 *
 * A factory taking everything it needs, so nothing here is a module-level
 * singleton: the same code runs against the in-memory store in tests and
 * against the host's real store in production, and an initialisation-order bug
 * is not representable.
 */

import type { Notification, Page, Query } from '../host/contract';
import {
  BookingError,
  assertTransition,
  buildFacetKeys,
  checkNotice,
  computeRankScore,
  evaluateRefund,
  canReschedule,
  granuleId,
  granulesFor,
  lockBlocks,
  refundAmountMinor,
} from '../domain/booking';
import type { RefundDecision } from '../domain/booking';
import type {
  Booking,
  BookingPolicy,
  Instant,
  MentorIndex,
  MentorProfile,
  MentorshipRepositories,
  PersonSnap,
  Review,
  SessionType,
  SlotLock,
} from '../domain/entities';

/** How long an unconfirmed hold survives before a sweeper may reclaim it. */
export const HOLD_TTL_MS = 10 * 60_000;

export interface MentorshipDeps {
  repos: MentorshipRepositories;
  now: () => Instant;
  newId: (prefix: string) => string;
  notify?: (notification: Notification) => Promise<void>;
  /** The mentor's local calendar day for an instant; supplied by the host so the
   *  brick needs no timezone library of its own. */
  dayKeyFor: (instant: Instant, timeZone: string) => string;
  log?: (level: 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>) => void;
}

export interface RequestBookingInput {
  mentorId: string;
  menteeId: string;
  menteeSnap: PersonSnap;
  sessionTypeId: string;
  startsAt: Instant;
  menteeTimeZone: string;
  intakeAnswers?: Record<string, string>;
}

export type RequestBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; code: BookingError['code']; message: string };

export function createMentorshipService(deps: MentorshipDeps) {
  const { repos, now, newId, dayKeyFor } = deps;

  async function notify(notification: Notification): Promise<void> {
    if (!deps.notify) return;
    try {
      await deps.notify(notification);
    } catch (error) {
      // A notification failure must never lose a booking that is already
      // committed; the booking is the durable record, the message is not.
      deps.log?.('warn', 'notification failed', { kind: notification.kind, error: String(error) });
    }
  }

  async function policyFor(mentorId: string): Promise<BookingPolicy> {
    const found = await repos.policies.get(`policy_${mentorId}`);
    if (found) return found;
    // A mentor who has never configured anything still needs coherent defaults,
    // otherwise their first booking attempt fails on a missing document.
    return {
      id: `policy_${mentorId}`,
      mentorId,
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
    };
  }

  /**
   * Claim every granule a booking needs, releasing what was taken if any one
   * fails.
   *
   * Correctness rests on `createIfAbsent` and deterministic ids, not on a
   * transaction: whichever caller creates a granule first owns it, and the
   * loser sees `created: false`. Expired holds are treated as free on read, so
   * a stale lock cannot block bookings even if the sweeper is not running.
   */
  async function claimGranules(
    mentorId: string,
    granules: Instant[],
    bookingId: string,
    holderId: string,
    at: Instant,
  ): Promise<{ ok: true; lockIds: string[] } | { ok: false }> {
    const claimed: string[] = [];

    for (const granuleStart of granules) {
      const id = granuleId(mentorId, granuleStart);
      const { entity, created } = await repos.locks.createIfAbsent(id, {
        id,
        mentorId,
        granuleStart,
        status: 'held',
        bookingId,
        holderId,
        expiresAt: at + HOLD_TTL_MS,
      } as Omit<SlotLock, 'createdAt' | 'updatedAt' | 'version'>);

      if (created) {
        claimed.push(id);
        continue;
      }

      // Somebody holds it. An expired hold may be taken over; a booked granule
      // never may.
      if (lockBlocks(entity, at)) {
        await releaseGranules(claimed);
        return { ok: false };
      }

      await repos.locks.update(id, {
        status: 'held',
        bookingId,
        holderId,
        expiresAt: at + HOLD_TTL_MS,
      } as Partial<SlotLock>, { expectedVersion: entity.version });
      claimed.push(id);
    }

    return { ok: true, lockIds: claimed };
  }

  async function releaseGranules(lockIds: readonly string[]): Promise<void> {
    for (const id of lockIds) await repos.locks.delete(id);
  }

  return {
    /* ------------------------------------------------------------ discovery */

    /** Refresh the catalogue projection from the profile of record. */
    async reindexMentor(mentorId: string): Promise<MentorIndex | null> {
      const mentor = await repos.mentors.get(mentorId);
      if (!mentor) return null;

      const avgRating = mentor.ratingCount > 0 ? mentor.ratingSum / mentor.ratingCount : 0;
      const row = {
        id: `idx_${mentorId}`,
        mentorId,
        displayName: mentor.slug,
        headline: mentor.headline,
        company: mentor.company,
        topSkills: mentor.skills.slice(0, 5),
        facetKeys: buildFacetKeys({
          skills: mentor.skills,
          languages: mentor.languages,
          acceptsFree: mentor.acceptsFree,
          avgRating,
          ratingCount: mentor.ratingCount,
          yearsExperience: mentor.yearsExperience,
        }),
        avgRating: Math.round(avgRating * 100) / 100,
        ratingCount: mentor.ratingCount,
        sessionsCompleted: mentor.sessionsCompleted,
        minPriceMinor: mentor.minPriceMinor,
        acceptsFree: mentor.acceptsFree,
        rankScore: computeRankScore({
          avgRating,
          ratingCount: mentor.ratingCount,
          sessionsCompleted: mentor.sessionsCompleted,
          noShowCount: mentor.noShowCount,
          acceptsFree: mentor.acceptsFree,
        }),
        active: mentor.status === 'active',
      } as Omit<MentorIndex, 'createdAt' | 'updatedAt' | 'version'>;

      const existing = await repos.mentorIndex.get(row.id);
      if (!existing) {
        const { entity } = await repos.mentorIndex.createIfAbsent(row.id, row);
        return entity;
      }
      return repos.mentorIndex.update(row.id, row as Partial<MentorIndex>);
    },

    /** Browse the catalogue by a single facet token, ranked. */
    async discover(input: {
      facet?: string;
      limit?: number;
      cursor?: string;
    }): Promise<Page<MentorIndex>> {
      const query: Query<MentorIndex> = {
        where: { active: { eq: true } },
        orderBy: { field: 'rankScore', dir: 'desc' },
        limit: input.limit ?? 20,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      };
      const page = await repos.mentorIndex.list(query);
      if (!input.facet) return page;
      // One array-contains per query is the store's limit, so extra facets
      // narrow the page here rather than in the query.
      return { ...page, items: page.items.filter((m) => m.facetKeys.includes(input.facet as string)) };
    },

    /* -------------------------------------------------------------- booking */

    async requestBooking(input: RequestBookingInput): Promise<RequestBookingResult> {
      const at = now();

      const mentor = await repos.mentors.get(input.mentorId);
      if (!mentor || mentor.status !== 'active') {
        return { ok: false, code: 'not_found', message: 'mentor is not accepting bookings' };
      }

      const sessionType = await repos.sessionTypes.get(input.sessionTypeId);
      if (!sessionType || !sessionType.active || sessionType.mentorId !== input.mentorId) {
        return { ok: false, code: 'not_found', message: 'session type is unavailable' };
      }

      const policy = await policyFor(input.mentorId);

      const notice = checkNotice(input.startsAt, at, policy);
      if (!notice.ok) {
        return {
          ok: false,
          code: notice.reason === 'too_late' ? 'too_late' : 'too_far_ahead',
          message:
            notice.reason === 'too_late'
              ? `bookings need at least ${policy.minNoticeMin} minutes' notice`
              : `bookings cannot be made more than ${policy.maxAdvanceDays} days ahead`,
        };
      }

      const endsAt = input.startsAt + sessionType.durationMin * 60_000;
      const mentorDayKey = dayKeyFor(input.startsAt, mentor.timeZone);

      // The daily cap is checked against the mentor's own local day, which is
      // why that key is stored rather than derived from a UTC range.
      const sameDay = await repos.bookings.list({
        where: { mentorId: { eq: input.mentorId }, mentorDayKey: { eq: mentorDayKey } },
        limit: policy.maxPerDay + 1,
      });
      const activeSameDay = sameDay.items.filter(
        (b) => b.status === 'pending' || b.status === 'confirmed',
      );
      if (activeSameDay.length >= policy.maxPerDay) {
        return { ok: false, code: 'daily_cap', message: 'the mentor is fully booked that day' };
      }

      const bookingId = newId('bkg');
      const granules = granulesFor(input.startsAt, endsAt, policy);
      const claim = await claimGranules(input.mentorId, granules, bookingId, input.menteeId, at);
      if (!claim.ok) {
        return { ok: false, code: 'slot_taken', message: 'that time was just taken' };
      }

      try {
        const booking = await repos.bookings.create({
          id: bookingId,
          mentorId: input.mentorId,
          menteeId: input.menteeId,
          mentorSnap: {
            userId: mentor.userId,
            displayName: mentor.slug,
            headline: mentor.headline,
            snapVersion: 1,
          },
          menteeSnap: input.menteeSnap,
          sessionTypeId: sessionType.id,
          sessionTypeSnap: {
            title: sessionType.title,
            durationMin: sessionType.durationMin,
            priceMinor: sessionType.priceMinor,
            currency: sessionType.currency,
          },
          participantIds: [input.mentorId, input.menteeId],
          startsAt: input.startsAt,
          endsAt,
          lockIds: claim.lockIds,
          status: policy.autoConfirm && sessionType.priceMinor === 0 ? 'confirmed' : 'pending',
          mentorTzAtBooking: mentor.timeZone,
          menteeTzAtBooking: input.menteeTimeZone,
          mentorDayKey,
          intakeAnswers: input.intakeAnswers ?? {},
          reviewedByMentee: false,
        } as Omit<Booking, 'createdAt' | 'updatedAt' | 'version'>);

        // Promote the holds to bookings so they stop expiring.
        for (const lockId of claim.lockIds) {
          const lock = await repos.locks.get(lockId);
          if (lock) {
            await repos.locks.update(lockId, {
              status: booking.status === 'confirmed' ? 'booked' : 'held',
              bookingId,
            } as Partial<SlotLock>);
          }
        }

        await notify({
          kind: booking.status === 'confirmed' ? 'booking.confirmed' : 'booking.requested',
          to: input.mentorId,
          bookingId,
          startsAt: new Date(input.startsAt).toISOString(),
        });

        return { ok: true, booking };
      } catch (error) {
        // Never leave a granule claimed for a booking that does not exist.
        await releaseGranules(claim.lockIds);
        throw error;
      }
    },

    async confirmBooking(bookingId: string): Promise<Booking> {
      const booking = await repos.bookings.get(bookingId);
      if (!booking) throw new BookingError('booking not found', 'not_found');
      assertTransition(booking.status, 'confirmed');

      for (const lockId of booking.lockIds) {
        const lock = await repos.locks.get(lockId);
        if (lock) await repos.locks.update(lockId, { status: 'booked' } as Partial<SlotLock>);
      }

      const updated = await repos.bookings.update(bookingId, { status: 'confirmed' } as Partial<Booking>);
      await notify({
        kind: 'booking.confirmed',
        to: booking.menteeId,
        bookingId,
        startsAt: new Date(booking.startsAt).toISOString(),
      });
      return updated;
    },

    /** Cancel, release the calendar, and report what the refund should be. */
    async cancelBooking(input: {
      bookingId: string;
      cancelledBy: 'mentor' | 'mentee';
      reason?: string;
    }): Promise<{ booking: Booking; refund: RefundDecision; refundMinor: number }> {
      const at = now();
      const booking = await repos.bookings.get(input.bookingId);
      if (!booking) throw new BookingError('booking not found', 'not_found');

      const target = input.cancelledBy === 'mentor' ? 'cancelled_by_mentor' : 'cancelled_by_mentee';
      assertTransition(booking.status, target);

      const policy = await policyFor(booking.mentorId);
      const refund = evaluateRefund(
        {
          startsAt: booking.startsAt,
          priceMinor: booking.sessionTypeSnap.priceMinor,
          cancelledBy: input.cancelledBy,
        },
        at,
        policy,
      );

      // Release first: a cancelled booking must not keep the calendar blocked
      // even if a later write fails.
      await releaseGranules(booking.lockIds);

      const updated = await repos.bookings.update(input.bookingId, {
        status: target,
        cancelledAt: at,
        cancelReason: input.reason,
        lockIds: [],
      } as Partial<Booking>);

      await notify({
        kind: 'booking.cancelled',
        to: input.cancelledBy === 'mentor' ? booking.menteeId : booking.mentorId,
        bookingId: input.bookingId,
        reason: input.reason,
      });

      return {
        booking: updated,
        refund,
        refundMinor: refundAmountMinor(booking.sessionTypeSnap.priceMinor, refund),
      };
    },

    /**
     * Move a booking.
     *
     * Claims the new granules *before* releasing the old ones, so a failed
     * reschedule leaves the original booking intact rather than destroying a
     * confirmed slot to chase one that turns out to be taken.
     */
    async rescheduleBooking(input: {
      bookingId: string;
      newStartsAt: Instant;
    }): Promise<RequestBookingResult> {
      const at = now();
      const booking = await repos.bookings.get(input.bookingId);
      if (!booking) return { ok: false, code: 'not_found', message: 'booking not found' };

      const policy = await policyFor(booking.mentorId);
      if (!canReschedule(booking.startsAt, booking.status, at, policy)) {
        return {
          ok: false,
          code: 'window_closed',
          message: `bookings can only be moved more than ${policy.rescheduleWindowHours} hours ahead`,
        };
      }

      const notice = checkNotice(input.newStartsAt, at, policy);
      if (!notice.ok) {
        return {
          ok: false,
          code: notice.reason === 'too_late' ? 'too_late' : 'too_far_ahead',
          message: 'the new time is outside the booking window',
        };
      }

      const duration = booking.endsAt - booking.startsAt;
      const newEndsAt = input.newStartsAt + duration;
      const granules = granulesFor(input.newStartsAt, newEndsAt, policy);

      // The booking's own granules must not block its move.
      const ownLocks = new Set(booking.lockIds);
      const contested = granules
        .map((g) => granuleId(booking.mentorId, g))
        .filter((id) => !ownLocks.has(id));

      const claim = await claimGranules(
        booking.mentorId,
        granules.filter((g) => contested.includes(granuleId(booking.mentorId, g))),
        booking.id,
        booking.menteeId,
        at,
      );
      if (!claim.ok) return { ok: false, code: 'slot_taken', message: 'that time was just taken' };

      const keptLocks = granules
        .map((g) => granuleId(booking.mentorId, g))
        .filter((id) => ownLocks.has(id));
      const staleLocks = booking.lockIds.filter(
        (id) => !granules.map((g) => granuleId(booking.mentorId, g)).includes(id),
      );
      await releaseGranules(staleLocks);

      const mentor = await repos.mentors.get(booking.mentorId);
      const updated = await repos.bookings.update(booking.id, {
        startsAt: input.newStartsAt,
        endsAt: newEndsAt,
        lockIds: [...keptLocks, ...claim.lockIds],
        rescheduledFromId: booking.id,
        mentorDayKey: dayKeyFor(input.newStartsAt, mentor?.timeZone ?? booking.mentorTzAtBooking),
      } as Partial<Booking>);

      return { ok: true, booking: updated };
    },

    /** Mark a past booking complete and move the mentor's counters. */
    async completeBooking(bookingId: string): Promise<Booking> {
      const booking = await repos.bookings.get(bookingId);
      if (!booking) throw new BookingError('booking not found', 'not_found');
      assertTransition(booking.status, 'completed');

      await releaseGranules(booking.lockIds);

      const updated = await repos.bookings.update(bookingId, {
        status: 'completed',
        completedAt: now(),
        lockIds: [],
      } as Partial<Booking>);

      const mentor = await repos.mentors.get(booking.mentorId);
      if (mentor) {
        await repos.mentors.update(mentor.id, {
          sessionsCompleted: mentor.sessionsCompleted + 1,
        } as Partial<MentorProfile>);
        await this.reindexMentor(mentor.id);
      }
      return updated;
    },

    /** Everything either party has coming up, from one index. */
    async listUpcoming(userId: string, limit = 20): Promise<Page<Booking>> {
      const page = await repos.bookings.list({
        where: { startsAt: { gte: now() } },
        orderBy: { field: 'startsAt', dir: 'asc' },
        limit: limit * 4,
      });
      return {
        items: page.items
          .filter((b) => b.participantIds.includes(userId))
          .filter((b) => b.status === 'pending' || b.status === 'confirmed')
          .slice(0, limit),
      };
    },

    /* -------------------------------------------------------------- reviews */

    /**
     * Leave a review.
     *
     * Eligibility is a completed booking, and the review's id is derived from
     * the booking, so one booking can produce exactly one review with no unique
     * index and no read-then-write race.
     */
    async reviewBooking(input: {
      bookingId: string;
      authorId: string;
      authorSnap: PersonSnap;
      score: number;
      body: string;
    }): Promise<{ ok: true; review: Review } | { ok: false; code: string; message: string }> {
      if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
        return { ok: false, code: 'invalid_score', message: 'score must be a whole number from 1 to 5' };
      }

      const booking = await repos.bookings.get(input.bookingId);
      if (!booking) return { ok: false, code: 'not_found', message: 'booking not found' };
      if (booking.status !== 'completed') {
        return { ok: false, code: 'not_permitted', message: 'only a completed session can be reviewed' };
      }
      if (booking.menteeId !== input.authorId) {
        return { ok: false, code: 'not_permitted', message: 'only the mentee can review this session' };
      }

      const reviewId = `rev_${input.bookingId}`;
      const { entity, created } = await repos.reviews.createIfAbsent(reviewId, {
        id: reviewId,
        mentorId: booking.mentorId,
        authorId: input.authorId,
        authorSnap: input.authorSnap,
        bookingId: input.bookingId,
        score: input.score,
        body: input.body,
        status: 'published',
        createdAtMs: now(),
      } as Omit<Review, 'createdAt' | 'updatedAt' | 'version'>);

      if (!created) {
        return { ok: false, code: 'already_reviewed', message: 'this session has already been reviewed' };
      }

      const mentor = await repos.mentors.get(booking.mentorId);
      if (mentor) {
        await repos.mentors.update(mentor.id, {
          ratingCount: mentor.ratingCount + 1,
          ratingSum: mentor.ratingSum + input.score,
        } as Partial<MentorProfile>);
        await this.reindexMentor(mentor.id);
      }
      await repos.bookings.update(input.bookingId, { reviewedByMentee: true } as Partial<Booking>);

      return { ok: true, review: entity };
    },

    /** Reclaim holds nobody completed. Safe to run repeatedly. */
    async sweepExpiredHolds(limit = 100): Promise<number> {
      const at = now();
      const page = await repos.locks.list({
        where: { status: { eq: 'held' } },
        limit,
      });
      let released = 0;
      for (const lock of page.items) {
        if (lock.expiresAt <= at) {
          await repos.locks.delete(lock.id);
          released += 1;
        }
      }
      return released;
    },
  };
}

export type MentorshipService = ReturnType<typeof createMentorshipService>;
export type { SessionType };
