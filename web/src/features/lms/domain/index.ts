/** lms — pure entrypoint: entities and the rules that decide progress. */

export type {
  Certificate,
  CompletionRule,
  Course,
  CourseIndex,
  CourseStatus,
  Curriculum,
  CurriculumLesson,
  CurriculumSection,
  DripMode,
  Enrollment,
  EnrollmentMode,
  EnrollmentStatus,
  Instant,
  LessonContent,
  LessonProgress,
  LessonType,
  LmsRepositories,
  Progress,
} from './entities';
export { curriculumId, enrollmentId, lessonProgressId, progressId } from './entities';

export type { CompletionState, MigrationResult } from './progress';
export {
  VIDEO_COMPLETION_THRESHOLD,
  assertCurriculumValid,
  buildCurriculumViews,
  clearBit,
  completedLessonIds,
  countBits,
  emptyBitmap,
  evaluateCompletion,
  isBitSet,
  isLessonUnlocked,
  isVideoComplete,
  migrateProgress,
  setBit,
} from './progress';
