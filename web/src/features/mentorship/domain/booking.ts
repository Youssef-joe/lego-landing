/**
 * Booking rules: granule locks, the status machine, and the policy decisions.
 *
 * All pure. The service layer does the I/O; everything that decides anything
 * lives here so it can be tested without a store and reused by a host that
 * wants to show the same decision in the interface before committing to it.
 */

import type { BookingPolicy, BookingStatus, Instant, SlotLock } from './entities';

const MINUTE_MS = 60_000;

/* ------------------------------------------------------------ granule locks */

/**
 * The deterministic id of one time granule for one mentor.
 *
 * Deterministic is the whole point: two concurrent bookers computing the same
 * granule compute the same id, so the store's "create fails if the document
 * exists" decides the race. Nothing here needs a transaction, which matters
 * because the destination stores may not offer one across documents.
 */
export function granuleId(mentorId: string, granuleStart: Instant): string {
  return `${mentorId}_${granuleStart}`;
}

/**
 * Every granule a booking occupies, including its buffers.
 *
 * A 60-minute booking on a 15-minute grid claims four granules. Buffers extend
 * the claimed range, so a booking that ends where another's buffer begins
 * collides on a lock rather than passing a separate, separately-wrong check.
 *
 * The range is snapped outward to granule boundaries: a partial overlap must
 * claim the whole granule, or two bookings could share one.
 */
export function granulesFor(
  startsAt: Instant,
  endsAt: Instant,
  policy: Pick<BookingPolicy, 'granularityMin' | 'bufferBeforeMin' | 'bufferAfterMin'>,
): Instant[] {
  const step = policy.granularityMin * MINUTE_MS;
  if (step <= 0) throw new RangeError('mentorship: granularityMin must be > 0');

  const from = startsAt - policy.bufferBeforeMin * MINUTE_MS;
  const to = endsAt + policy.bufferAfterMin * MINUTE_MS;

  const first = Math.floor(from / step) * step;
  const last = Math.ceil(to / step) * step;

  const out: Instant[] = [];
  for (let g = first; g < last; g += step) out.push(g);
  return out;
}

/** A lock is only an obstacle while it is held or booked and not yet expired. */
export function lockBlocks(lock: SlotLock, now: Instant): boolean {
  if (lock.status === 'booked') return true;
  return lock.expiresAt > now;
}

/* --------------------------------------------------------- the status machine */

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled_by_mentor', 'cancelled_by_mentee', 'expired'],
  confirmed: [
    'completed',
    'cancelled_by_mentor',
    'cancelled_by_mentee',
    'no_show_mentor',
    'no_show_mentee',
  ],
  // Terminal.
  cancelled_by_mentor: [],
  cancelled_by_mentee: [],
  completed: [],
  no_show_mentor: [],
  no_show_mentee: [],
  expired: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new BookingError(`cannot move a booking from ${from} to ${to}`, 'invalid_transition');
  }
}

/** A booking still occupies the calendar only in these states. */
export function occupiesCalendar(status: BookingStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

export type BookingErrorCode =
  | 'slot_taken'
  | 'too_late'
  | 'too_far_ahead'
  | 'daily_cap'
  | 'invalid_transition'
  | 'window_closed'
  | 'not_permitted'
  | 'not_found';

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code: BookingErrorCode,
  ) {
    super(`mentorship: ${message}`);
    this.name = 'BookingError';
  }
}

/* -------------------------------------------------------------- the policies */

export interface NoticeCheck {
  ok: boolean;
  reason?: 'too_late' | 'too_far_ahead';
}

/** Is this start time inside the mentor's acceptable booking window? */
export function checkNotice(startsAt: Instant, now: Instant, policy: BookingPolicy): NoticeCheck {
  if (startsAt - now < policy.minNoticeMin * MINUTE_MS) return { ok: false, reason: 'too_late' };
  if (startsAt - now > policy.maxAdvanceDays * 24 * 60 * MINUTE_MS) {
    return { ok: false, reason: 'too_far_ahead' };
  }
  return { ok: true };
}

export interface RefundDecision {
  /** Basis points of the price, so a partial refund needs no float. */
  refundBasisPoints: number;
  reason: 'within_window' | 'outside_window' | 'mentor_cancelled' | 'free';
}

/**
 * What a cancellation is worth, as a pure decision.
 *
 * Returned rather than applied: the brick decides, and the host's payments
 * integration moves the money. That boundary is what keeps a portable module
 * from needing to know which provider the target uses.
 */
export function evaluateRefund(
  input: {
    startsAt: Instant;
    priceMinor: number;
    cancelledBy: 'mentor' | 'mentee';
  },
  now: Instant,
  policy: BookingPolicy,
): RefundDecision {
  if (input.priceMinor === 0) return { refundBasisPoints: 0, reason: 'free' };

  // A mentor cancelling is never the mentee's fault, whatever the window says.
  if (input.cancelledBy === 'mentor') {
    return { refundBasisPoints: 10_000, reason: 'mentor_cancelled' };
  }

  const hoursUntil = (input.startsAt - now) / (60 * MINUTE_MS);
  if (hoursUntil >= policy.cancellationWindowHours) {
    return { refundBasisPoints: 10_000, reason: 'within_window' };
  }

  switch (policy.refundOnCancel) {
    case 'full':
      return { refundBasisPoints: 10_000, reason: 'outside_window' };
    case 'partial':
      return {
        refundBasisPoints: Math.round((policy.partialRefundPercent ?? 50) * 100),
        reason: 'outside_window',
      };
    case 'none':
      return { refundBasisPoints: 0, reason: 'outside_window' };
  }
}

export function refundAmountMinor(priceMinor: number, decision: RefundDecision): number {
  return Math.round((priceMinor * decision.refundBasisPoints) / 10_000);
}

/** May this booking still be moved? */
export function canReschedule(
  startsAt: Instant,
  status: BookingStatus,
  now: Instant,
  policy: BookingPolicy,
): boolean {
  if (!occupiesCalendar(status)) return false;
  return (startsAt - now) / (60 * MINUTE_MS) >= policy.rescheduleWindowHours;
}

/* ---------------------------------------------------------------- discovery */

/** Lowercase, hyphenated, ASCII-safe token body. */
export function slugifyToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The filter tokens a mentor is discoverable by.
 *
 * A document store permits one `array-contains` per query, so multi-facet
 * filtering selects the most selective token and narrows the resulting page in
 * memory. Precomputing the tokens is what makes that one query fast.
 */
export function buildFacetKeys(input: {
  skills: readonly string[];
  languages: readonly string[];
  acceptsFree: boolean;
  avgRating: number;
  ratingCount: number;
  yearsExperience?: number;
}): string[] {
  const keys = new Set<string>();

  for (const skill of input.skills) {
    const token = slugifyToken(skill);
    if (token) keys.add(`sk:${token}`);
  }
  for (const lang of input.languages) {
    const token = slugifyToken(lang);
    if (token) keys.add(`lang:${token}`);
  }

  keys.add(input.acceptsFree ? 'price:free' : 'price:paid');

  // Rating buckets only once there is enough signal to mean anything.
  if (input.ratingCount >= 3) {
    if (input.avgRating >= 4.5) keys.add('rating:45plus');
    if (input.avgRating >= 4) keys.add('rating:4plus');
  }

  const years = input.yearsExperience ?? 0;
  if (years >= 10) keys.add('exp:principal');
  else if (years >= 6) keys.add('exp:senior');
  else if (years >= 2) keys.add('exp:mid');

  return [...keys].sort();
}

/**
 * Catalogue ranking.
 *
 * A document store cannot order by a computed expression, so the score is
 * materialised on the index row and sorted directly. Rating is damped by volume
 * so one five-star review does not outrank a mentor with fifty.
 */
export function computeRankScore(input: {
  avgRating: number;
  ratingCount: number;
  sessionsCompleted: number;
  noShowCount: number;
  acceptsFree: boolean;
}): number {
  const confidence = input.ratingCount / (input.ratingCount + 5);
  const rating = input.avgRating * confidence;

  const experience = Math.log10(1 + input.sessionsCompleted);
  const reliability = input.sessionsCompleted > 0
    ? 1 - Math.min(input.noShowCount / input.sessionsCompleted, 1)
    : 1;

  const score = rating * 20 + experience * 10 + reliability * 5 + (input.acceptsFree ? 2 : 0);
  return Math.round(score * 100) / 100;
}
