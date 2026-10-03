/**
 * LMS entities.
 *
 * The load-bearing decision is that a course's structure is **one immutable,
 * versioned document**, not a collection of lesson rows.
 *
 * Rendering an outline is then a single read whatever the course's size, and —
 * more importantly — an enrollment pins the version it started against, so a
 * learner's completion denominator cannot move under them when an instructor
 * edits the course. Editing produces a new version; existing learners migrate
 * deliberately, and nobody's completion is ever revoked by someone else's edit.
 */

import type { Entity } from '../host/contract';

export type Instant = number;

export type LessonType = 'video' | 'text' | 'file' | 'embed' | 'live';

/** A lesson as it appears in the structure: light, and ordered. */
export interface CurriculumLesson {
  id: string;
  title: string;
  type: LessonType;
  durationSec: number;
  /** Only required lessons count toward completion. */
  required: boolean;
  /** Visible before enrolling, for a course preview. */
  previewable: boolean;
  /** Days after the drip anchor before this unlocks. */
  dripAfterDays?: number;
  /** An assessment that must be passed for this lesson to count. */
  assessmentId?: string;
}

export interface CurriculumSection {
  id: string;
  title: string;
  lessons: CurriculumLesson[];
}

/**
 * An immutable snapshot of a course's structure.
 *
 * Never updated in place: publishing an edit writes a new version. `lessonOrder`
 * is the canonical ordering that the progress bitmap indexes into, so it must
 * stay fixed for the life of a version.
 */
export interface Curriculum extends Entity {
  courseId: string;
  /**
   * The curriculum's own version. Deliberately NOT called `version`: that name
   * belongs to Entity's optimistic-concurrency counter, which the store owns
   * and overwrites on every write.
   */
  curriculumVersion: number;
  sections: CurriculumSection[];
  /** Canonical lesson ordering; the bitmap's index space. */
  lessonOrder: string[];
  requiredLessonIds: string[];
  lessonCount: number;
  totalDurationSec: number;
}

export type CourseStatus = 'draft' | 'review' | 'published' | 'archived';
export type EnrollmentMode = 'free' | 'paid' | 'invite' | 'cohort';
export type DripMode = 'none' | 'schedule' | 'sequential';

export interface CompletionRule {
  kind: 'all_required' | 'percent';
  /** For `percent`: the share of required lessons needed, 0-100. */
  percent?: number;
  requireAssessmentsPassed: boolean;
}

export interface Course extends Entity {
  instructorIds: string[];
  ownerId: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  categoryId?: string;
  tags: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  thumbnailAssetId?: string;
  priceMinor: number;
  currency: string;
  enrollmentMode: EnrollmentMode;
  prerequisiteCourseIds: string[];
  status: CourseStatus;
  /** The version a new enrollment is pinned to. */
  curriculumVersion: number;
  completionRule: CompletionRule;
  dripMode: DripMode;
  certificateEnabled: boolean;
  enrollmentCount: number;
  ratingCount: number;
  ratingSum: number;
  publishedAt?: Instant;
}

/** The catalogue projection, for the same reason mentorship has one. */
export interface CourseIndex extends Entity {
  courseId: string;
  title: string;
  slug: string;
  thumbnailAssetId?: string;
  instructorNames: string[];
  categoryId?: string;
  facetKeys: string[];
  avgRating: number;
  ratingCount: number;
  enrollmentCount: number;
  priceMinor: number;
  isFree: boolean;
  level: string;
  durationSec: number;
  lessonCount: number;
  rankScore: number;
  published: boolean;
}

/** The heavy body, kept out of the curriculum so the outline stays one small read. */
export interface LessonContent extends Entity {
  courseId: string;
  lessonId: string;
  type: LessonType;
  body?: string;
  videoAssetId?: string;
  attachmentAssetIds: string[];
  embedUrl?: string;
  liveStartsAt?: Instant;
  liveJoinUrl?: string;
}

export type EnrollmentStatus = 'active' | 'completed' | 'expired' | 'refunded' | 'suspended';

export interface Enrollment extends Entity {
  courseId: string;
  userId: string;
  source: 'purchase' | 'free' | 'invite' | 'admin';
  status: EnrollmentStatus;
  /** Pins the denominator. An instructor's edit cannot move it. */
  curriculumVersion: number;
  startedAt: Instant;
  /** Drip is measured from here. */
  dripAnchorAt: Instant;
  lastAccessedAt: Instant;
  lastLessonId?: string;
  completedAt?: Instant;
  certificateId?: string;
  orderId?: string;
}

/**
 * The learner's progress, as one document.
 *
 * Counters rather than a count query: a 200-lesson course must not cost 200
 * reads to render a progress bar. `completedBitmap` indexes into the pinned
 * curriculum's `lessonOrder`, so per-lesson ticks in the outline come from the
 * same single read — a 2,000-lesson course is a few hundred bytes.
 */
export interface Progress extends Entity {
  courseId: string;
  userId: string;
  curriculumVersion: number;
  completedRequired: number;
  requiredTotal: number;
  percent: number;
  /** base64url of a bitfield over the curriculum's canonical lesson order. */
  completedBitmap: string;
  timeSpentSec: number;
  assessmentsPassed: string[];
  updatedAtMs: Instant;
}

/** Durable per-lesson truth, and the source a reconcile recomputes from. */
export interface LessonProgress extends Entity {
  courseId: string;
  userId: string;
  lessonId: string;
  status: 'in_progress' | 'completed';
  positionSec: number;
  /** Furthest reached, which is what completion is judged on — not the latest
   *  position, which a learner can scrub backwards. */
  maxPositionSec: number;
  durationSec: number;
  completedAt?: Instant;
}

/** Immutable once issued. Completion is never revoked by a later course edit. */
export interface Certificate extends Entity {
  code: string;
  courseId: string;
  userId: string;
  learnerNameSnap: string;
  courseTitleSnap: string;
  issuedAt: Instant;
  curriculumVersion: number;
  revokedAt?: Instant;
}

export interface LmsRepositories {
  courses: import('../host/contract').Repository<Course>;
  courseIndex: import('../host/contract').Repository<CourseIndex>;
  curricula: import('../host/contract').Repository<Curriculum>;
  lessonContent: import('../host/contract').Repository<LessonContent>;
  enrollments: import('../host/contract').Repository<Enrollment>;
  progress: import('../host/contract').Repository<Progress>;
  lessonProgress: import('../host/contract').Repository<LessonProgress>;
  certificates: import('../host/contract').Repository<Certificate>;
}

/* ------------------------------------------------------- deterministic ids */

/**
 * Composite ids, so uniqueness needs no unique index and a read needs no query.
 * One enrollment per learner per course falls out of the id itself.
 */
export const enrollmentId = (courseId: string, userId: string) => `enr_${courseId}_${userId}`;
export const progressId = (courseId: string, userId: string) => `prg_${courseId}_${userId}`;
export const lessonProgressId = (courseId: string, userId: string, lessonId: string) =>
  `lp_${courseId}_${userId}_${lessonId}`;
export const curriculumId = (courseId: string, version: number) => `cur_${courseId}_v${version}`;
