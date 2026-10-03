/**
 * Mentorship entities.
 *
 * Shaped for a document store, because both destination applications are
 * Firestore: ids are strings, instants are epoch milliseconds, there are no
 * nested entities (only `xxxId` references), money is minor units, and anything
 * that must be listed carries the fields it is filtered and sorted by. Nothing
 * here needs a join.
 */

import type { Entity, ISODateTime } from '../host/contract';

export type Instant = number;

/** The denormalised person snapshot embedded wherever a name must be shown. */
export interface PersonSnap {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  headline?: string;
  /** Bumped when the source profile changes, so a backfill can find stale copies. */
  snapVersion: number;
}

export type MentorStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'suspended';
export type VerificationState = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface MentorProfile extends Entity {
  userId: string;
  slug: string;
  headline: string;
  bio: string;
  company?: string;
  title?: string;
  yearsExperience?: number;
  /** Capped, because these become filter tokens. */
  skills: string[];
  languages: string[];
  countries: string[];
  timeZone: string;
  status: MentorStatus;
  verification: VerificationState;
  sessionTypeIds: string[];
  acceptsFree: boolean;
  minPriceMinor: number;
  /** Maintained by the review flow; duplicated onto MentorIndex for sorting. */
  ratingCount: number;
  ratingSum: number;
  sessionsCompleted: number;
  noShowCount: number;
  publishedAt?: Instant;
}

/**
 * The catalogue projection.
 *
 * Discovery reads only this. A document store cannot sort by a field living in
 * another collection, so everything the mentor list filters or ranks by is
 * copied here and kept current by the service. Two copies of the truth, one
 * reconcile path — which is correct for this store, not a compromise.
 */
export interface MentorIndex extends Entity {
  mentorId: string;
  displayName: string;
  avatarUrl?: string;
  headline: string;
  company?: string;
  topSkills: string[];
  /**
   * Composite filter tokens, e.g. `sk:product-management`, `lang:en`,
   * `price:free`, `rating:4plus`. A document store allows one array-contains
   * per query, so multi-facet filtering picks the most selective token and
   * narrows the page in memory.
   */
  facetKeys: string[];
  avgRating: number;
  ratingCount: number;
  sessionsCompleted: number;
  minPriceMinor: number;
  acceptsFree: boolean;
  /** Denormalised so the catalogue can show it without a per-mentor computation. */
  nextAvailableAt?: Instant;
  rankScore: number;
  active: boolean;
}

export interface SessionType extends Entity {
  mentorId: string;
  title: string;
  description: string;
  durationMin: number;
  priceMinor: number;
  currency: string;
  /** 1 for one-to-one; greater for group sessions. */
  capacity: number;
  intakeQuestions: IntakeQuestion[];
  active: boolean;
  order: number;
}

export interface IntakeQuestion {
  id: string;
  label: string;
  type: 'text' | 'longtext' | 'select';
  required: boolean;
  options?: string[];
}

/** Recurring availability, stored as wall-clock local time plus a zone. */
export interface AvailabilityRule extends Entity {
  mentorId: string;
  timeZone: string;
  /** 'MO'|'TU'|… — matches timekit's Weekday, without importing it. */
  byDay: string[];
  startLocal: string;
  endLocal: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  active: boolean;
}

export interface BookingPolicy extends Entity {
  mentorId: string;
  minNoticeMin: number;
  maxAdvanceDays: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  granularityMin: number;
  maxPerDay: number;
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  refundOnCancel: 'full' | 'partial' | 'none';
  partialRefundPercent?: number;
  autoConfirm: boolean;
}

/**
 * A granule lock.
 *
 * Document stores have no unique indexes, so double-booking is prevented by
 * giving each indivisible time granule a deterministic document id and creating
 * it with `createIfAbsent`. The first writer wins; everyone else observes the
 * existing row. A booking spanning four granules claims four locks, and the
 * first failure aborts the whole attempt.
 *
 * Buffers are included in the claimed range, so a buffer overlap is a lock
 * conflict rather than a separate check that could disagree.
 */
export interface SlotLock extends Entity {
  mentorId: string;
  granuleStart: Instant;
  status: 'held' | 'booked';
  bookingId: string;
  holderId: string;
  expiresAt: Instant;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled_by_mentor'
  | 'cancelled_by_mentee'
  | 'completed'
  | 'no_show_mentor'
  | 'no_show_mentee'
  | 'expired';

export interface Booking extends Entity {
  mentorId: string;
  menteeId: string;
  mentorSnap: PersonSnap;
  menteeSnap: PersonSnap;
  sessionTypeId: string;
  sessionTypeSnap: { title: string; durationMin: number; priceMinor: number; currency: string };
  /** Both sides in one array so a single index serves "my upcoming" for either. */
  participantIds: string[];
  startsAt: Instant;
  endsAt: Instant;
  /** The granule ids claimed, so release is exact rather than recomputed. */
  lockIds: string[];
  status: BookingStatus;
  /** Captured at booking time so a later confirmation renders the time the
   *  user actually saw, even if they have since travelled. */
  mentorTzAtBooking: string;
  menteeTzAtBooking: string;
  /** The mentor's local calendar day, for per-day caps and local-week views. */
  mentorDayKey: string;
  intakeAnswers: Record<string, string>;
  meetingUrl?: string;
  orderId?: string;
  cancelledAt?: Instant;
  cancelReason?: string;
  rescheduledFromId?: string;
  completedAt?: Instant;
  reviewedByMentee: boolean;
}

export interface Review extends Entity {
  mentorId: string;
  authorId: string;
  authorSnap: PersonSnap;
  bookingId: string;
  score: number;
  body: string;
  status: 'published' | 'pending' | 'hidden';
  createdAtMs: Instant;
}

/** Everything the service needs to persist. */
export interface MentorshipRepositories {
  mentors: import('../host/contract').Repository<MentorProfile>;
  mentorIndex: import('../host/contract').Repository<MentorIndex>;
  sessionTypes: import('../host/contract').Repository<SessionType>;
  availability: import('../host/contract').Repository<AvailabilityRule>;
  policies: import('../host/contract').Repository<BookingPolicy>;
  locks: import('../host/contract').Repository<SlotLock>;
  bookings: import('../host/contract').Repository<Booking>;
  reviews: import('../host/contract').Repository<Review>;
}

/** ISO helper kept local so the brick imports nothing for it. */
export function toISO(instant: Instant): ISODateTime {
  return new Date(instant).toISOString();
}
