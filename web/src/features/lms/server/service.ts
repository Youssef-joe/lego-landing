/**
 * The LMS service.
 *
 * Same shape as the mentorship service: a factory over injected dependencies,
 * nothing at module scope, so the identical code runs against a test double and
 * against the host's real store.
 */

import type { Notification, Page } from '../host/contract';
import {
  assertCurriculumValid,
  buildCurriculumViews,
  countBits,
  emptyBitmap,
  evaluateCompletion,
  isBitSet,
  isLessonUnlocked,
  isVideoComplete,
  migrateProgress,
  setBit,
} from '../domain/progress';
import type { CompletionState, MigrationResult } from '../domain/progress';
import {
  curriculumId,
  enrollmentId,
  lessonProgressId,
  progressId,
} from '../domain/entities';
import type {
  Course,
  CourseIndex,
  Curriculum,
  CurriculumSection,
  Enrollment,
  Instant,
  LessonProgress,
  LmsRepositories,
  Progress,
  Certificate,
} from '../domain/entities';

export interface LmsDeps {
  repos: LmsRepositories;
  now: () => Instant;
  newId: (prefix: string) => string;
  /** Short, unguessable certificate codes; supplied so they can be deterministic in tests. */
  newCode: () => string;
  notify?: (notification: Notification) => Promise<void>;
  log?: (level: 'info' | 'warn' | 'error', message: string, fields?: Record<string, unknown>) => void;
}

export type EnrollResult =
  | { ok: true; enrollment: Enrollment }
  | { ok: false; code: 'not_published' | 'prerequisites' | 'already_enrolled'; message: string };

export function createLmsService(deps: LmsDeps) {
  const { repos, now, newId, newCode } = deps;

  async function notify(notification: Notification): Promise<void> {
    if (!deps.notify) return;
    try {
      await deps.notify(notification);
    } catch (error) {
      deps.log?.('warn', 'notification failed', { kind: notification.kind, error: String(error) });
    }
  }

  async function currentCurriculum(course: Course): Promise<Curriculum | null> {
    return repos.curricula.get(curriculumId(course.id, course.curriculumVersion));
  }

  return {
    /* ------------------------------------------------------------ authoring */

    /**
     * Publish a structure as a new immutable curriculum version.
     *
     * Never edits an existing version: learners are pinned to one, and mutating
     * it in place is exactly how a completion denominator moves under somebody.
     */
    async publishCurriculum(input: {
      courseId: string;
      sections: CurriculumSection[];
    }): Promise<Curriculum> {
      assertCurriculumValid(input.sections);

      const course = await repos.courses.get(input.courseId);
      if (!course) throw new Error(`lms: course ${input.courseId} not found`);

      const nextVersion = course.curriculumVersion + 1;
      const views = buildCurriculumViews(input.sections);

      const curriculum = await repos.curricula.create({
        id: curriculumId(course.id, nextVersion),
        courseId: course.id,
        curriculumVersion: nextVersion,
        sections: input.sections,
        ...views,
      } as Omit<Curriculum, 'createdAt' | 'updatedAt' | 'version'>);

      await repos.courses.update(course.id, {
        curriculumVersion: nextVersion,
      } as Partial<Course>);

      return curriculum;
    },

    async publishCourse(courseId: string): Promise<Course> {
      const course = await repos.courses.get(courseId);
      if (!course) throw new Error(`lms: course ${courseId} not found`);

      const curriculum = await currentCurriculum(course);
      if (!curriculum || curriculum.lessonCount === 0) {
        throw new Error('lms: a course needs a curriculum with at least one lesson to publish');
      }

      const updated = await repos.courses.update(courseId, {
        status: 'published',
        publishedAt: now(),
      } as Partial<Course>);
      await this.reindexCourse(courseId);
      return updated;
    },

    async reindexCourse(courseId: string): Promise<CourseIndex | null> {
      const course = await repos.courses.get(courseId);
      if (!course) return null;
      const curriculum = await currentCurriculum(course);

      const avgRating = course.ratingCount > 0 ? course.ratingSum / course.ratingCount : 0;
      const facetKeys = [
        `level:${course.level}`,
        `lang:${course.language.toLowerCase()}`,
        course.priceMinor === 0 ? 'price:free' : 'price:paid',
        ...course.tags.map((t) => `tag:${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
        ...(course.categoryId ? [`cat:${course.categoryId}`] : []),
      ].sort();

      const row = {
        id: `cidx_${courseId}`,
        courseId,
        title: course.title,
        slug: course.slug,
        thumbnailAssetId: course.thumbnailAssetId,
        instructorNames: [],
        categoryId: course.categoryId,
        facetKeys,
        avgRating: Math.round(avgRating * 100) / 100,
        ratingCount: course.ratingCount,
        enrollmentCount: course.enrollmentCount,
        priceMinor: course.priceMinor,
        isFree: course.priceMinor === 0,
        level: course.level,
        durationSec: curriculum?.totalDurationSec ?? 0,
        lessonCount: curriculum?.lessonCount ?? 0,
        // Damped the same way mentors are, so one rating cannot outrank volume.
        rankScore:
          Math.round(
            (avgRating * (course.ratingCount / (course.ratingCount + 5)) * 20 +
              Math.log10(1 + course.enrollmentCount) * 10) * 100,
          ) / 100,
        published: course.status === 'published',
      } as Omit<CourseIndex, 'createdAt' | 'updatedAt' | 'version'>;

      const existing = await repos.courseIndex.get(row.id);
      if (!existing) {
        const { entity } = await repos.courseIndex.createIfAbsent(row.id, row);
        return entity;
      }
      return repos.courseIndex.update(row.id, row as Partial<CourseIndex>);
    },

    async browse(input: { facet?: string; limit?: number; cursor?: string }): Promise<Page<CourseIndex>> {
      const page = await repos.courseIndex.list({
        where: { published: { eq: true } },
        orderBy: { field: 'rankScore', dir: 'desc' },
        limit: input.limit ?? 20,
        ...(input.cursor ? { cursor: input.cursor } : {}),
      });
      if (!input.facet) return page;
      return { ...page, items: page.items.filter((c) => c.facetKeys.includes(input.facet as string)) };
    },

    /* ----------------------------------------------------------- enrollment */

    /**
     * Enrol a learner, pinning them to the course's current curriculum version.
     *
     * The enrollment id is derived from the pair, so enrolling twice is not a
     * race to be detected but an outcome that cannot happen.
     */
    async enroll(input: {
      courseId: string;
      userId: string;
      source?: Enrollment['source'];
      orderId?: string;
    }): Promise<EnrollResult> {
      const course = await repos.courses.get(input.courseId);
      if (!course || course.status !== 'published') {
        return { ok: false, code: 'not_published', message: 'this course is not open for enrolment' };
      }

      if (course.prerequisiteCourseIds.length > 0) {
        const prereqIds = course.prerequisiteCourseIds.map((id) => enrollmentId(id, input.userId));
        const held = await repos.enrollments.getMany(prereqIds);
        const satisfied = held.filter((e) => e.status === 'completed').length;
        if (satisfied < course.prerequisiteCourseIds.length) {
          return {
            ok: false,
            code: 'prerequisites',
            message: 'complete the prerequisite course(s) first',
          };
        }
      }

      const at = now();
      const id = enrollmentId(input.courseId, input.userId);
      const { entity, created } = await repos.enrollments.createIfAbsent(id, {
        id,
        courseId: input.courseId,
        userId: input.userId,
        source: input.source ?? (course.priceMinor === 0 ? 'free' : 'purchase'),
        status: 'active',
        curriculumVersion: course.curriculumVersion,
        startedAt: at,
        dripAnchorAt: at,
        lastAccessedAt: at,
        orderId: input.orderId,
      } as Omit<Enrollment, 'createdAt' | 'updatedAt' | 'version'>);

      if (!created) {
        return { ok: false, code: 'already_enrolled', message: 'already enrolled in this course' };
      }

      const curriculum = await currentCurriculum(course);
      const pid = progressId(input.courseId, input.userId);
      await repos.progress.createIfAbsent(pid, {
        id: pid,
        courseId: input.courseId,
        userId: input.userId,
        curriculumVersion: course.curriculumVersion,
        completedRequired: 0,
        requiredTotal: curriculum?.requiredLessonIds.length ?? 0,
        percent: 0,
        completedBitmap: emptyBitmap(),
        timeSpentSec: 0,
        assessmentsPassed: [],
        updatedAtMs: at,
      } as Omit<Progress, 'createdAt' | 'updatedAt' | 'version'>);

      await repos.courses.update(course.id, {
        enrollmentCount: course.enrollmentCount + 1,
      } as Partial<Course>);
      await this.reindexCourse(course.id);
      await notify({ kind: 'course.enrolled', to: input.userId, courseId: input.courseId });

      return { ok: true, enrollment: entity };
    },

    /* ------------------------------------------------------------- progress */

    /** Is this lesson open to this learner yet? */
    async canAccessLesson(input: {
      courseId: string;
      userId: string;
      lessonId: string;
    }): Promise<{ allowed: boolean; reason?: 'not_enrolled' | 'locked' | 'not_found' }> {
      const enrollment = await repos.enrollments.get(enrollmentId(input.courseId, input.userId));
      if (!enrollment || enrollment.status === 'suspended') {
        return { allowed: false, reason: 'not_enrolled' };
      }

      const course = await repos.courses.get(input.courseId);
      if (!course) return { allowed: false, reason: 'not_found' };

      const curriculum = await repos.curricula.get(
        curriculumId(input.courseId, enrollment.curriculumVersion),
      );
      if (!curriculum) return { allowed: false, reason: 'not_found' };

      const index = curriculum.lessonOrder.indexOf(input.lessonId);
      if (index === -1) return { allowed: false, reason: 'not_found' };

      const lesson = curriculum.sections.flatMap((s) => s.lessons).find((l) => l.id === input.lessonId);
      if (!lesson) return { allowed: false, reason: 'not_found' };

      const progress = await repos.progress.get(progressId(input.courseId, input.userId));
      const unlocked = isLessonUnlocked(lesson, {
        dripMode: course.dripMode,
        dripAnchorAt: enrollment.dripAnchorAt,
        now: now(),
        lessonIndex: index,
        completedBitmap: progress?.completedBitmap ?? emptyBitmap(),
      });

      return unlocked ? { allowed: true } : { allowed: false, reason: 'locked' };
    },

    /**
     * Record a playback position.
     *
     * Both the latest and the furthest position are kept: resume uses the
     * latest, completion uses the furthest, so scrubbing backwards does not
     * un-complete a lesson and skipping to the end does not complete one.
     */
    async recordPosition(input: {
      courseId: string;
      userId: string;
      lessonId: string;
      positionSec: number;
      durationSec: number;
    }): Promise<LessonProgress> {
      const id = lessonProgressId(input.courseId, input.userId, input.lessonId);
      const { entity, created } = await repos.lessonProgress.createIfAbsent(id, {
        id,
        courseId: input.courseId,
        userId: input.userId,
        lessonId: input.lessonId,
        status: 'in_progress',
        positionSec: input.positionSec,
        maxPositionSec: input.positionSec,
        durationSec: input.durationSec,
      } as Omit<LessonProgress, 'createdAt' | 'updatedAt' | 'version'>);

      if (created) return entity;

      return repos.lessonProgress.update(id, {
        positionSec: input.positionSec,
        maxPositionSec: Math.max(entity.maxPositionSec, input.positionSec),
        durationSec: input.durationSec,
      } as Partial<LessonProgress>);
    },

    /**
     * Mark a lesson complete and move the counters.
     *
     * Idempotent: completing twice must not double-count, which matters because
     * a counter that drifts is a progress bar that lies.
     */
    async completeLesson(input: {
      courseId: string;
      userId: string;
      lessonId: string;
      /** For video lessons, completion is verified rather than asserted. */
      verifyVideo?: boolean;
    }): Promise<{ progress: Progress; completion: CompletionState } | { error: 'locked' | 'not_found' }> {
      const access = await this.canAccessLesson(input);
      if (!access.allowed) return { error: access.reason === 'locked' ? 'locked' : 'not_found' };

      const enrollment = await repos.enrollments.get(enrollmentId(input.courseId, input.userId));
      const course = await repos.courses.get(input.courseId);
      if (!enrollment || !course) return { error: 'not_found' };

      const curriculum = await repos.curricula.get(
        curriculumId(input.courseId, enrollment.curriculumVersion),
      );
      if (!curriculum) return { error: 'not_found' };

      const index = curriculum.lessonOrder.indexOf(input.lessonId);
      if (index === -1) return { error: 'not_found' };

      if (input.verifyVideo) {
        const lp = await repos.lessonProgress.get(
          lessonProgressId(input.courseId, input.userId, input.lessonId),
        );
        if (!lp || !isVideoComplete(lp.maxPositionSec, lp.durationSec)) {
          return { error: 'locked' };
        }
      }

      const pid = progressId(input.courseId, input.userId);
      const progress = await repos.progress.get(pid);
      if (!progress) return { error: 'not_found' };

      const at = now();

      // Already done: return the current state rather than counting it twice.
      if (isBitSet(progress.completedBitmap, index)) {
        return {
          progress,
          completion: evaluateCompletion(curriculum, progress, course.completionRule),
        };
      }

      const bitmap = setBit(progress.completedBitmap, index);
      const next = { ...progress, completedBitmap: bitmap };
      const completion = evaluateCompletion(curriculum, next, course.completionRule);

      const updated = await repos.progress.update(pid, {
        completedBitmap: bitmap,
        completedRequired: completion.completedRequired,
        requiredTotal: completion.requiredTotal,
        percent: completion.percent,
        updatedAtMs: at,
      } as Partial<Progress>);

      const lpId = lessonProgressId(input.courseId, input.userId, input.lessonId);
      const { created } = await repos.lessonProgress.createIfAbsent(lpId, {
        id: lpId,
        courseId: input.courseId,
        userId: input.userId,
        lessonId: input.lessonId,
        status: 'completed',
        positionSec: 0,
        maxPositionSec: 0,
        durationSec: 0,
        completedAt: at,
      } as Omit<LessonProgress, 'createdAt' | 'updatedAt' | 'version'>);
      if (!created) {
        await repos.lessonProgress.update(lpId, {
          status: 'completed',
          completedAt: at,
        } as Partial<LessonProgress>);
      }

      await repos.enrollments.update(enrollment.id, {
        lastAccessedAt: at,
        lastLessonId: input.lessonId,
      } as Partial<Enrollment>);

      if (completion.complete && enrollment.status === 'active') {
        await this.completeCourse({ courseId: input.courseId, userId: input.userId });
      }

      return { progress: updated, completion };
    },

    /**
     * Finish a course and issue the certificate.
     *
     * The certificate id is the code, created with createIfAbsent, so a
     * double-click cannot mint two certificates for one completion.
     */
    async completeCourse(input: {
      courseId: string;
      userId: string;
      learnerName?: string;
    }): Promise<{ enrollment: Enrollment; certificate?: Certificate }> {
      const at = now();
      const enrollment = await repos.enrollments.get(enrollmentId(input.courseId, input.userId));
      const course = await repos.courses.get(input.courseId);
      if (!enrollment || !course) throw new Error('lms: enrollment or course not found');

      const updated = await repos.enrollments.update(enrollment.id, {
        status: 'completed',
        completedAt: enrollment.completedAt ?? at,
      } as Partial<Enrollment>);

      if (!course.certificateEnabled) return { enrollment: updated };
      if (enrollment.certificateId) {
        const existing = await repos.certificates.get(enrollment.certificateId);
        if (existing) return { enrollment: updated, certificate: existing };
      }

      const code = newCode();
      const { entity } = await repos.certificates.createIfAbsent(code, {
        id: code,
        code,
        courseId: input.courseId,
        userId: input.userId,
        learnerNameSnap: input.learnerName ?? input.userId,
        courseTitleSnap: course.title,
        issuedAt: at,
        curriculumVersion: enrollment.curriculumVersion,
      } as Omit<Certificate, 'createdAt' | 'updatedAt' | 'version'>);

      const withCert = await repos.enrollments.update(enrollment.id, {
        certificateId: entity.id,
      } as Partial<Enrollment>);

      return { enrollment: withCert, certificate: entity };
    },

    /** Public verification: one read by code, no query. */
    async verifyCertificate(code: string): Promise<Certificate | null> {
      const certificate = await repos.certificates.get(code);
      if (!certificate || certificate.revokedAt) return null;
      return certificate;
    },

    /* ------------------------------------------------------------ migration */

    /**
     * Move a learner onto the course's current curriculum version.
     *
     * Completion already earned is never revoked: if they had finished under the
     * old version, the enrollment stays `completed` and the certificate stands,
     * even when the new version adds required lessons. Their percentage may fall,
     * which is honest, but their achievement does not evaporate.
     */
    async migrateEnrollment(input: {
      courseId: string;
      userId: string;
    }): Promise<MigrationResult | { error: 'not_found' | 'already_current' }> {
      const enrollment = await repos.enrollments.get(enrollmentId(input.courseId, input.userId));
      const course = await repos.courses.get(input.courseId);
      if (!enrollment || !course) return { error: 'not_found' };
      if (enrollment.curriculumVersion === course.curriculumVersion) {
        return { error: 'already_current' };
      }

      const fromCurriculum = await repos.curricula.get(
        curriculumId(input.courseId, enrollment.curriculumVersion),
      );
      const toCurriculum = await currentCurriculum(course);
      if (!fromCurriculum || !toCurriculum) return { error: 'not_found' };

      const pid = progressId(input.courseId, input.userId);
      const progress = await repos.progress.get(pid);
      if (!progress) return { error: 'not_found' };

      const wasComplete = enrollment.status === 'completed';
      const result = migrateProgress(fromCurriculum, toCurriculum, progress, wasComplete);

      await repos.progress.update(pid, {
        curriculumVersion: toCurriculum.curriculumVersion,
        completedBitmap: result.bitmap,
        completedRequired: result.completedRequired,
        requiredTotal: result.requiredTotal,
        percent: result.percent,
        updatedAtMs: now(),
      } as Partial<Progress>);

      await repos.enrollments.update(enrollment.id, {
        curriculumVersion: toCurriculum.curriculumVersion,
      } as Partial<Enrollment>);

      return result;
    },

    /**
     * Recompute a learner's counters from the durable per-lesson rows.
     *
     * Increment-maintained counters drift under retries; this is the reconcile
     * that finds it. Returns whether anything was actually wrong.
     */
    async reconcileProgress(input: {
      courseId: string;
      userId: string;
    }): Promise<{ drifted: boolean; before: number; after: number } | { error: 'not_found' }> {
      const enrollment = await repos.enrollments.get(enrollmentId(input.courseId, input.userId));
      if (!enrollment) return { error: 'not_found' };

      const curriculum = await repos.curricula.get(
        curriculumId(input.courseId, enrollment.curriculumVersion),
      );
      const pid = progressId(input.courseId, input.userId);
      const progress = await repos.progress.get(pid);
      if (!curriculum || !progress) return { error: 'not_found' };

      const rows = await repos.lessonProgress.list({
        where: { courseId: { eq: input.courseId }, userId: { eq: input.userId } },
        limit: 1_000,
      });
      const done = new Set(rows.items.filter((r) => r.status === 'completed').map((r) => r.lessonId));

      let bitmap = emptyBitmap();
      curriculum.lessonOrder.forEach((lessonId, index) => {
        if (done.has(lessonId)) bitmap = setBit(bitmap, index);
      });

      const before = countBits(progress.completedBitmap);
      const after = countBits(bitmap);
      const drifted = bitmap !== progress.completedBitmap;

      if (drifted) {
        const completedRequired = curriculum.requiredLessonIds.filter((id) => done.has(id)).length;
        const requiredTotal = curriculum.requiredLessonIds.length;
        await repos.progress.update(pid, {
          completedBitmap: bitmap,
          completedRequired,
          requiredTotal,
          percent: requiredTotal === 0 ? 100 : Math.floor((completedRequired / requiredTotal) * 100),
        } as Partial<Progress>);
        deps.log?.('warn', 'progress drift corrected', { courseId: input.courseId, before, after });
      }

      return { drifted, before, after };
    },

    /** A learner's courses, most recently touched first. */
    async myCourses(userId: string, limit = 20): Promise<Page<Enrollment>> {
      return repos.enrollments.list({
        where: { userId: { eq: userId } },
        orderBy: { field: 'lastAccessedAt', dir: 'desc' },
        limit,
      });
    },
  };
}

export type LmsService = ReturnType<typeof createLmsService>;
