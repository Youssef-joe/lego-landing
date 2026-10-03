import { describe, expect, it } from 'vitest';

import { FakeRepository } from '../testing/fake-repo';
import { createLmsService } from '../server/service';
import { completedLessonIds, countBits } from '../domain/progress';
import { curriculumId, enrollmentId, progressId } from '../domain/entities';
import type {
  Certificate,
  Course,
  CourseIndex,
  Curriculum,
  CurriculumSection,
  Enrollment,
  LessonContent,
  LessonProgress,
  LmsRepositories,
  Progress,
} from '../domain/entities';

const NOW = Date.UTC(2026, 8, 16, 9, 0, 0);
const DAY = 24 * 60 * 60_000;

let clock = NOW;
let ids = 0;
let codes = 0;

function makeRepos(): LmsRepositories {
  const at = () => new Date(clock).toISOString();
  return {
    courses: new FakeRepository<Course>(at),
    courseIndex: new FakeRepository<CourseIndex>(at),
    curricula: new FakeRepository<Curriculum>(at),
    lessonContent: new FakeRepository<LessonContent>(at),
    enrollments: new FakeRepository<Enrollment>(at),
    progress: new FakeRepository<Progress>(at),
    lessonProgress: new FakeRepository<LessonProgress>(at),
    certificates: new FakeRepository<Certificate>(at),
  };
}

const sections = (lessonIds: string[], over: Partial<{ required: boolean }> = {}): CurriculumSection[] => [
  {
    id: 's1',
    title: 'Section 1',
    lessons: lessonIds.map((id) => ({
      id,
      title: id,
      type: 'text' as const,
      durationSec: 60,
      required: over.required ?? true,
      previewable: false,
    })),
  },
];

async function setup(courseOver: Partial<Course> = {}) {
  clock = NOW;
  ids = 0;
  codes = 0;
  const repos = makeRepos();
  const service = createLmsService({
    repos,
    now: () => clock,
    newId: (p) => `${p}_${++ids}`,
    newCode: () => `CERT${++codes}`,
  });

  await repos.courses.create({
    id: 'c1',
    instructorIds: ['i1'],
    ownerId: 'i1',
    slug: 'intro',
    title: 'Intro course',
    description: '',
    tags: ['react'],
    level: 'beginner',
    language: 'en',
    priceMinor: 0,
    currency: 'EUR',
    enrollmentMode: 'free',
    prerequisiteCourseIds: [],
    status: 'draft',
    curriculumVersion: 0,
    completionRule: { kind: 'all_required', requireAssessmentsPassed: false },
    dripMode: 'none',
    certificateEnabled: true,
    enrollmentCount: 0,
    ratingCount: 0,
    ratingSum: 0,
    ...courseOver,
  } as Omit<Course, 'createdAt' | 'updatedAt' | 'version'>);

  return { repos, service };
}

describe('authoring', () => {
  it('publishes a curriculum as a new immutable version', async () => {
    const { service, repos } = await setup();
    const v1 = await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b']) });
    expect(v1.curriculumVersion).toBe(1);
    expect(v1.lessonOrder).toEqual(['a', 'b']);

    const v2 = await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b', 'c']) });
    expect(v2.curriculumVersion).toBe(2);

    // Version 1 is untouched: learners pinned to it must keep the structure
    // they started against.
    const stillV1 = await repos.curricula.get(curriculumId('c1', 1));
    expect(stillV1?.lessonOrder).toEqual(['a', 'b']);
  });

  it('refuses to publish a course with no lessons', async () => {
    const { service } = await setup();
    await expect(service.publishCourse('c1')).rejects.toThrow(/at least one lesson/);
  });

  it('publishes and indexes a course', async () => {
    const { service, repos } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a']) });
    await service.publishCourse('c1');

    const index = await repos.courseIndex.get('cidx_c1');
    expect(index?.published).toBe(true);
    expect(index?.isFree).toBe(true);
    expect(index?.facetKeys).toContain('level:beginner');
    expect(index?.facetKeys).toContain('tag:react');
  });
});

describe('enrollment', () => {
  async function published(courseOver: Partial<Course> = {}) {
    const ctx = await setup(courseOver);
    await ctx.service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b']) });
    await ctx.service.publishCourse('c1');
    return ctx;
  }

  it('enrols a learner and pins them to the current version', async () => {
    const { service, repos } = await published();
    const result = await service.enroll({ courseId: 'c1', userId: 'u1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.enrollment.curriculumVersion).toBe(1);

    const progress = await repos.progress.get(progressId('c1', 'u1'));
    expect(progress?.requiredTotal).toBe(2);
    expect(progress?.percent).toBe(0);
  });

  it('refuses a second enrolment, by construction rather than by check', async () => {
    const { service } = await published();
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    const again = await service.enroll({ courseId: 'c1', userId: 'u1' });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('already_enrolled');
  });

  it('refuses to enrol in an unpublished course', async () => {
    const { service } = await setup();
    const result = await service.enroll({ courseId: 'c1', userId: 'u1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_published');
  });

  it('enforces prerequisites', async () => {
    const { service, repos } = await published();
    await repos.courses.create({
      id: 'c2', instructorIds: ['i1'], ownerId: 'i1', slug: 'adv', title: 'Advanced',
      description: '', tags: [], level: 'advanced', language: 'en', priceMinor: 0, currency: 'EUR',
      enrollmentMode: 'free', prerequisiteCourseIds: ['c1'], status: 'published', curriculumVersion: 1,
      completionRule: { kind: 'all_required', requireAssessmentsPassed: false },
      dripMode: 'none', certificateEnabled: false, enrollmentCount: 0, ratingCount: 0, ratingSum: 0,
    } as Omit<Course, 'createdAt' | 'updatedAt' | 'version'>);
    await repos.curricula.create({
      id: curriculumId('c2', 1), courseId: 'c2', curriculumVersion: 1, sections: sections(['x']),
      lessonOrder: ['x'], requiredLessonIds: ['x'], lessonCount: 1, totalDurationSec: 60,
    } as Omit<Curriculum, 'createdAt' | 'updatedAt' | 'version'>);

    const blocked = await service.enroll({ courseId: 'c2', userId: 'u1' });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe('prerequisites');

    // Finish the prerequisite, then it opens.
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'b' });

    const allowed = await service.enroll({ courseId: 'c2', userId: 'u1' });
    expect(allowed.ok).toBe(true);
  });
});

describe('progress', () => {
  async function enrolled(courseOver: Partial<Course> = {}, lessonIds = ['a', 'b', 'c']) {
    const ctx = await setup(courseOver);
    await ctx.service.publishCurriculum({ courseId: 'c1', sections: sections(lessonIds) });
    await ctx.service.publishCourse('c1');
    await ctx.service.enroll({ courseId: 'c1', userId: 'u1' });
    return ctx;
  }

  it('advances the counters as lessons are completed', async () => {
    const { service } = await enrolled();
    const first = await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });
    expect('progress' in first && first.progress.percent).toBe(33);
    expect('completion' in first && first.completion.completedRequired).toBe(1);
  });

  it('is idempotent: completing twice does not double count', async () => {
    const { service, repos } = await enrolled();
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });

    const progress = await repos.progress.get(progressId('c1', 'u1'));
    expect(progress?.completedRequired).toBe(1);
    expect(countBits(progress?.completedBitmap ?? '')).toBe(1);
  });

  it('completes the course and issues a certificate once every lesson is done', async () => {
    const { service, repos } = await enrolled();
    for (const id of ['a', 'b', 'c']) {
      await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: id });
    }
    const enrollment = await repos.enrollments.get(enrollmentId('c1', 'u1'));
    expect(enrollment?.status).toBe('completed');
    expect(enrollment?.certificateId).toBe('CERT1');

    const certificate = await service.verifyCertificate('CERT1');
    expect(certificate?.courseTitleSnap).toBe('Intro course');
    expect(certificate?.curriculumVersion).toBe(1);
  });

  it('mints exactly one certificate even when completion is triggered twice', async () => {
    const { service } = await enrolled();
    for (const id of ['a', 'b', 'c']) {
      await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: id });
    }
    const again = await service.completeCourse({ courseId: 'c1', userId: 'u1' });
    expect(again.certificate?.code).toBe('CERT1');
    expect(codes).toBe(1);
  });

  it('records the furthest position, so scrubbing back does not lose progress', async () => {
    const { service } = await enrolled();
    await service.recordPosition({ courseId: 'c1', userId: 'u1', lessonId: 'a', positionSec: 95, durationSec: 100 });
    const back = await service.recordPosition({ courseId: 'c1', userId: 'u1', lessonId: 'a', positionSec: 10, durationSec: 100 });
    expect(back.positionSec).toBe(10);
    expect(back.maxPositionSec).toBe(95);
  });

  it('refuses to complete a video lesson that was skipped', async () => {
    const { service } = await enrolled();
    await service.recordPosition({ courseId: 'c1', userId: 'u1', lessonId: 'a', positionSec: 5, durationSec: 100 });
    const blocked = await service.completeLesson({
      courseId: 'c1', userId: 'u1', lessonId: 'a', verifyVideo: true,
    });
    expect('error' in blocked && blocked.error).toBe('locked');

    await service.recordPosition({ courseId: 'c1', userId: 'u1', lessonId: 'a', positionSec: 95, durationSec: 100 });
    const allowed = await service.completeLesson({
      courseId: 'c1', userId: 'u1', lessonId: 'a', verifyVideo: true,
    });
    expect('progress' in allowed).toBe(true);
  });

  it('locks a sequential course to one lesson at a time', async () => {
    const { service } = await enrolled({ dripMode: 'sequential' });
    const skipAhead = await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'c' });
    expect('error' in skipAhead && skipAhead.error).toBe('locked');

    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });
    const second = await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'b' });
    expect('progress' in second).toBe(true);
  });

  it('refuses access to somebody who is not enrolled', async () => {
    const { service } = await enrolled();
    const access = await service.canAccessLesson({ courseId: 'c1', userId: 'stranger', lessonId: 'a' });
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe('not_enrolled');
  });
});

describe('curriculum migration', () => {
  /**
   * The case the whole versioning design exists for: an instructor edits a
   * published course and a learner who already finished must not be demoted.
   */
  it('never revokes a completion or a certificate earned under an older version', async () => {
    const { service, repos } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });

    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'b' });

    const before = await repos.enrollments.get(enrollmentId('c1', 'u1'));
    expect(before?.status).toBe('completed');
    expect(before?.certificateId).toBe('CERT1');

    // The instructor adds two lessons.
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b', 'c', 'd']) });
    const result = await service.migrateEnrollment({ courseId: 'c1', userId: 'u1' });

    expect('wasComplete' in result && result.wasComplete).toBe(true);
    // Their percentage honestly falls, because the course really did grow...
    expect('percent' in result && result.percent).toBe(50);

    // ...but the completion and the certificate stand.
    const after = await repos.enrollments.get(enrollmentId('c1', 'u1'));
    expect(after?.status).toBe('completed');
    expect(after?.certificateId).toBe('CERT1');
    expect(await service.verifyCertificate('CERT1')).toBeTruthy();
  });

  it('remaps completion by lesson id when positions shift', async () => {
    const { service, repos } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b', 'c']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'c' });

    // 'x' is inserted first, so every position moves by one.
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['x', 'a', 'b', 'c']) });
    await service.migrateEnrollment({ courseId: 'c1', userId: 'u1' });

    const progress = await repos.progress.get(progressId('c1', 'u1'));
    const curriculum = await repos.curricula.get(curriculumId('c1', 2));

    // Still exactly one lesson done, and still 'c' specifically — not whatever
    // now occupies the index 'c' used to sit at. Copying the bitmap positionally
    // would have credited 'b' here.
    expect(countBits(progress?.completedBitmap ?? '')).toBe(1);
    expect(
      completedLessonIds(progress?.completedBitmap ?? '', curriculum?.lessonOrder ?? []),
    ).toEqual(['c']);
    expect(progress?.curriculumVersion).toBe(2);
  });

  it('declines to migrate a learner who is already current', async () => {
    const { service } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    const result = await service.migrateEnrollment({ courseId: 'c1', userId: 'u1' });
    expect('error' in result && result.error).toBe('already_current');
  });

  it('leaves learners on the old version until they are migrated', async () => {
    const { service, repos } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b', 'c', 'd']) });

    // The denominator has not moved under them.
    const progress = await repos.progress.get(progressId('c1', 'u1'));
    expect(progress?.requiredTotal).toBe(2);
    const enrollment = await repos.enrollments.get(enrollmentId('c1', 'u1'));
    expect(enrollment?.curriculumVersion).toBe(1);
  });
});

describe('reconcile', () => {
  it('detects and corrects a drifted counter', async () => {
    const { service, repos } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a', 'b']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });

    // Simulate the drift a retried increment would cause.
    await repos.progress.update(progressId('c1', 'u1'), {
      completedBitmap: '', completedRequired: 0, percent: 0,
    } as Partial<Progress>);

    const result = await service.reconcileProgress({ courseId: 'c1', userId: 'u1' });
    expect('drifted' in result && result.drifted).toBe(true);

    const fixed = await repos.progress.get(progressId('c1', 'u1'));
    expect(countBits(fixed?.completedBitmap ?? '')).toBe(1);
  });

  it('reports no drift when the counters are sound', async () => {
    const { service } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });

    const result = await service.reconcileProgress({ courseId: 'c1', userId: 'u1' });
    expect('drifted' in result && result.drifted).toBe(false);
  });
});

describe('my courses', () => {
  it('lists a learner\'s enrolments, most recently touched first', async () => {
    const { service, repos } = await setup();
    await service.publishCurriculum({ courseId: 'c1', sections: sections(['a']) });
    await service.publishCourse('c1');
    await service.enroll({ courseId: 'c1', userId: 'u1' });

    clock = NOW + DAY;
    await service.completeLesson({ courseId: 'c1', userId: 'u1', lessonId: 'a' });

    const mine = await service.myCourses('u1');
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0]?.lastAccessedAt).toBe(NOW + DAY);

    // Somebody else's enrolments are not mine.
    await repos.enrollments.create({
      id: enrollmentId('c1', 'u2'), courseId: 'c1', userId: 'u2', source: 'free',
      status: 'active', curriculumVersion: 1, startedAt: NOW, dripAnchorAt: NOW, lastAccessedAt: NOW,
    } as Omit<Enrollment, 'createdAt' | 'updatedAt' | 'version'>);
    expect((await service.myCourses('u1')).items).toHaveLength(1);
  });
});
