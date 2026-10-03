/**
 * Progress: the bitmap, the completion rule, drip, and curriculum migration.
 *
 * All pure, so the same functions decide "2 items left" in the interface and
 * whether a certificate may be issued on the server. One implementation, no
 * chance of the two disagreeing.
 */

import type {
  CompletionRule,
  Curriculum,
  CurriculumLesson,
  DripMode,
  Instant,
  Progress,
} from './entities';

/* ------------------------------------------------------------- the bitmap */

/**
 * Completion is stored as a bitfield over the curriculum's canonical lesson
 * order, not as a list of ids.
 *
 * A 2,000-lesson course is then 250 bytes rather than a 60KB array that would
 * eventually collide with a document size limit, and the outline's per-lesson
 * ticks come from the same single read as the progress bar.
 *
 * The encoding is base64url so it survives JSON, a document store, and a URL
 * without escaping.
 */
export function emptyBitmap(): string {
  return '';
}

function toBytes(bitmap: string): Uint8Array {
  if (!bitmap) return new Uint8Array(0);
  return Uint8Array.from(Buffer.from(bitmap, 'base64url'));
}

function toBitmap(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function isBitSet(bitmap: string, index: number): boolean {
  if (index < 0) return false;
  const bytes = toBytes(bitmap);
  const byte = bytes[index >> 3];
  if (byte === undefined) return false;
  return (byte & (1 << (index & 7))) !== 0;
}

export function setBit(bitmap: string, index: number): string {
  if (index < 0) throw new RangeError('lms: bit index must be >= 0');
  const needed = (index >> 3) + 1;
  const current = toBytes(bitmap);
  const bytes = new Uint8Array(Math.max(needed, current.length));
  bytes.set(current);
  // Non-null: the length was just sized to cover this index.
  bytes[index >> 3] = (bytes[index >> 3] as number) | (1 << (index & 7));
  return toBitmap(bytes);
}

export function clearBit(bitmap: string, index: number): string {
  const bytes = toBytes(bitmap);
  const byte = bytes[index >> 3];
  if (byte === undefined) return bitmap;
  bytes[index >> 3] = byte & ~(1 << (index & 7));
  return toBitmap(bytes);
}

export function countBits(bitmap: string): number {
  let total = 0;
  for (const byte of toBytes(bitmap)) {
    let b = byte;
    while (b) {
      b &= b - 1;
      total += 1;
    }
  }
  return total;
}

/** The ids whose bit is set, in curriculum order. */
export function completedLessonIds(bitmap: string, lessonOrder: readonly string[]): string[] {
  return lessonOrder.filter((_, index) => isBitSet(bitmap, index));
}

/* ------------------------------------------------------------- completion */

export interface CompletionState {
  complete: boolean;
  completedRequired: number;
  requiredTotal: number;
  percent: number;
  /** What is still standing in the way, for an interface to show. */
  blockers: string[];
}

/**
 * Evaluate completion against the curriculum the learner is pinned to.
 *
 * Takes the curriculum explicitly rather than reading the course's current one,
 * because the whole point of pinning is that a later edit cannot change this
 * answer for an existing learner.
 */
export function evaluateCompletion(
  curriculum: Pick<Curriculum, 'lessonOrder' | 'requiredLessonIds' | 'sections'>,
  progress: Pick<Progress, 'completedBitmap' | 'assessmentsPassed'>,
  rule: CompletionRule,
): CompletionState {
  const requiredSet = new Set(curriculum.requiredLessonIds);
  const done = new Set(completedLessonIds(progress.completedBitmap, curriculum.lessonOrder));

  const requiredTotal = curriculum.requiredLessonIds.length;
  const completedRequired = curriculum.requiredLessonIds.filter((id) => done.has(id)).length;
  const percent = requiredTotal === 0 ? 100 : Math.floor((completedRequired / requiredTotal) * 100);

  const blockers: string[] = [];

  const threshold = rule.kind === 'percent' ? (rule.percent ?? 100) : 100;
  const meetsLessons = percent >= threshold;
  if (!meetsLessons) {
    blockers.push(`${requiredTotal - completedRequired} required lesson(s) remaining`);
  }

  let meetsAssessments = true;
  if (rule.requireAssessmentsPassed) {
    const passed = new Set(progress.assessmentsPassed);
    const outstanding = curriculum.sections
      .flatMap((s) => s.lessons)
      .filter((l) => l.assessmentId && requiredSet.has(l.id) && !passed.has(l.assessmentId));
    if (outstanding.length > 0) {
      meetsAssessments = false;
      blockers.push(`${outstanding.length} assessment(s) not yet passed`);
    }
  }

  return {
    complete: meetsLessons && meetsAssessments,
    completedRequired,
    requiredTotal,
    percent,
    blockers,
  };
}

/* ------------------------------------------------------------------- drip */

/**
 * Is a lesson available to this learner yet?
 *
 * Computed rather than materialised: a per-learner release row per lesson would
 * be a write amplification with nothing to show for it, since the answer is a
 * pure function of the anchor and the lesson's own rule.
 */
export function isLessonUnlocked(
  lesson: CurriculumLesson,
  input: {
    dripMode: DripMode;
    dripAnchorAt: Instant;
    now: Instant;
    lessonIndex: number;
    completedBitmap: string;
  },
): boolean {
  if (input.dripMode === 'none') return true;

  if (input.dripMode === 'schedule') {
    const days = lesson.dripAfterDays ?? 0;
    return input.now >= input.dripAnchorAt + days * 24 * 60 * 60_000;
  }

  // Sequential: everything before it must be done. The first lesson is always
  // open, or a learner could never start.
  if (input.lessonIndex === 0) return true;
  for (let i = 0; i < input.lessonIndex; i += 1) {
    if (!isBitSet(input.completedBitmap, i)) return false;
  }
  return true;
}

/* ----------------------------------------------------------- video rules */

/** Video completion is judged on the furthest point reached, not the latest. */
export const VIDEO_COMPLETION_THRESHOLD = 0.9;

export function isVideoComplete(maxPositionSec: number, durationSec: number): boolean {
  if (durationSec <= 0) return false;
  return maxPositionSec / durationSec >= VIDEO_COMPLETION_THRESHOLD;
}

/* ------------------------------------------------------------- migration */

export interface MigrationResult {
  bitmap: string;
  completedRequired: number;
  requiredTotal: number;
  percent: number;
  /** Lessons the learner had finished that no longer exist. */
  droppedLessonIds: string[];
  /** Required lessons added by the edit that they have not done. */
  addedRequiredLessonIds: string[];
  /** True when they had completed the course under the old version. */
  wasComplete: boolean;
}

/**
 * Re-index a learner's progress onto a new curriculum version.
 *
 * Bits are keyed by position, and positions move when lessons are added or
 * removed, so the bitmap is rebuilt by *lesson id* rather than copied. A lesson
 * that survived keeps its completion; one that was deleted is dropped; one that
 * was added starts incomplete.
 *
 * `wasComplete` is reported so the caller can honour the rule that a completion
 * already earned is never taken away by somebody else's edit — the certificate
 * stands even when the new version adds required lessons.
 */
export function migrateProgress(
  from: Pick<Curriculum, 'lessonOrder' | 'requiredLessonIds'>,
  to: Pick<Curriculum, 'lessonOrder' | 'requiredLessonIds'>,
  progress: Pick<Progress, 'completedBitmap'>,
  wasComplete: boolean,
): MigrationResult {
  const done = new Set(completedLessonIds(progress.completedBitmap, from.lessonOrder));

  let bitmap = emptyBitmap();
  to.lessonOrder.forEach((lessonId, index) => {
    if (done.has(lessonId)) bitmap = setBit(bitmap, index);
  });

  const survivingIds = new Set(to.lessonOrder);
  const droppedLessonIds = [...done].filter((id) => !survivingIds.has(id)).sort();

  const previousRequired = new Set(from.requiredLessonIds);
  const addedRequiredLessonIds = to.requiredLessonIds
    .filter((id) => !previousRequired.has(id) && !done.has(id))
    .sort();

  const requiredTotal = to.requiredLessonIds.length;
  const completedRequired = to.requiredLessonIds.filter((id) => done.has(id)).length;
  const percent = requiredTotal === 0 ? 100 : Math.floor((completedRequired / requiredTotal) * 100);

  return {
    bitmap,
    completedRequired,
    requiredTotal,
    percent,
    droppedLessonIds,
    addedRequiredLessonIds,
    wasComplete,
  };
}

/* ------------------------------------------------------------ curriculum */

/** Derive the flat views a curriculum document carries alongside its sections. */
export function buildCurriculumViews(sections: readonly { lessons: CurriculumLesson[] }[]): {
  lessonOrder: string[];
  requiredLessonIds: string[];
  lessonCount: number;
  totalDurationSec: number;
} {
  const lessons = sections.flatMap((s) => s.lessons);
  return {
    lessonOrder: lessons.map((l) => l.id),
    requiredLessonIds: lessons.filter((l) => l.required).map((l) => l.id),
    lessonCount: lessons.length,
    totalDurationSec: lessons.reduce((sum, l) => sum + l.durationSec, 0),
  };
}

/** Reject a structure that would make progress ambiguous. */
export function assertCurriculumValid(sections: readonly { lessons: CurriculumLesson[] }[]): void {
  const seen = new Set<string>();
  for (const lesson of sections.flatMap((s) => s.lessons)) {
    if (seen.has(lesson.id)) {
      throw new RangeError(`lms: duplicate lesson id "${lesson.id}" in curriculum`);
    }
    seen.add(lesson.id);
  }
}
