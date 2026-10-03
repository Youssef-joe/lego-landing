import { describe, expect, it } from 'vitest';

import {
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
} from '../domain/progress';
import type { CurriculumLesson } from '../domain/entities';

const lesson = (id: string, over: Partial<CurriculumLesson> = {}): CurriculumLesson => ({
  id,
  title: id,
  type: 'text',
  durationSec: 60,
  required: true,
  previewable: false,
  ...over,
});

describe('the completion bitmap', () => {
  it('starts empty', () => {
    expect(countBits(emptyBitmap())).toBe(0);
    expect(isBitSet(emptyBitmap(), 0)).toBe(false);
  });

  it('sets and reads a bit', () => {
    const b = setBit(emptyBitmap(), 3);
    expect(isBitSet(b, 3)).toBe(true);
    expect(isBitSet(b, 2)).toBe(false);
    expect(countBits(b)).toBe(1);
  });

  it('grows to cover a high index', () => {
    const b = setBit(emptyBitmap(), 1_999);
    expect(isBitSet(b, 1_999)).toBe(true);
    expect(countBits(b)).toBe(1);
  });

  it('is idempotent', () => {
    const once = setBit(emptyBitmap(), 5);
    expect(setBit(once, 5)).toBe(once);
    expect(countBits(setBit(once, 5))).toBe(1);
  });

  it('clears a bit without touching its neighbours', () => {
    let b = setBit(setBit(setBit(emptyBitmap(), 1), 2), 3);
    b = clearBit(b, 2);
    expect(isBitSet(b, 1)).toBe(true);
    expect(isBitSet(b, 2)).toBe(false);
    expect(isBitSet(b, 3)).toBe(true);
  });

  it('stays small for a very large course', () => {
    // The reason this is a bitmap and not an array of ids: a 2,000-lesson course
    // must not carry a 60KB field toward a document size limit.
    let b = emptyBitmap();
    for (let i = 0; i < 2_000; i += 1) b = setBit(b, i);
    expect(countBits(b)).toBe(2_000);
    expect(b.length).toBeLessThan(400);
  });

  it('maps bits back to lesson ids in curriculum order', () => {
    const order = ['a', 'b', 'c', 'd'];
    const b = setBit(setBit(emptyBitmap(), 0), 2);
    expect(completedLessonIds(b, order)).toEqual(['a', 'c']);
  });

  it('survives a round trip through JSON, as a stored field must', () => {
    const b = setBit(setBit(emptyBitmap(), 7), 130);
    const restored = JSON.parse(JSON.stringify({ b })).b as string;
    expect(isBitSet(restored, 7)).toBe(true);
    expect(isBitSet(restored, 130)).toBe(true);
  });
});

describe('curriculum views', () => {
  it('derives order, required ids, count and duration', () => {
    const views = buildCurriculumViews([
      { lessons: [lesson('a'), lesson('b', { required: false, durationSec: 30 })] },
      { lessons: [lesson('c')] },
    ]);
    expect(views.lessonOrder).toEqual(['a', 'b', 'c']);
    expect(views.requiredLessonIds).toEqual(['a', 'c']);
    expect(views.lessonCount).toBe(3);
    expect(views.totalDurationSec).toBe(150);
  });

  it('rejects a duplicate lesson id, which would make progress ambiguous', () => {
    expect(() =>
      assertCurriculumValid([{ lessons: [lesson('a')] }, { lessons: [lesson('a')] }]),
    ).toThrow(/duplicate lesson id/);
  });
});

describe('evaluateCompletion', () => {
  const curriculum = {
    lessonOrder: ['a', 'b', 'c', 'd'],
    requiredLessonIds: ['a', 'b', 'c'],
    sections: [{ id: 's', title: 's', lessons: [lesson('a'), lesson('b'), lesson('c'), lesson('d', { required: false })] }],
  };

  it('counts only required lessons', () => {
    // 'd' is optional, so completing it moves nothing.
    const state = evaluateCompletion(
      curriculum,
      { completedBitmap: setBit(emptyBitmap(), 3), assessmentsPassed: [] },
      { kind: 'all_required', requireAssessmentsPassed: false },
    );
    expect(state.completedRequired).toBe(0);
    expect(state.percent).toBe(0);
    expect(state.complete).toBe(false);
  });

  it('completes when every required lesson is done', () => {
    let b = emptyBitmap();
    for (const i of [0, 1, 2]) b = setBit(b, i);
    const state = evaluateCompletion(curriculum, { completedBitmap: b, assessmentsPassed: [] }, {
      kind: 'all_required',
      requireAssessmentsPassed: false,
    });
    expect(state.complete).toBe(true);
    expect(state.percent).toBe(100);
  });

  it('supports a percentage threshold', () => {
    let b = emptyBitmap();
    for (const i of [0, 1]) b = setBit(b, i);
    const rule = { kind: 'percent' as const, percent: 60, requireAssessmentsPassed: false };
    const state = evaluateCompletion(curriculum, { completedBitmap: b, assessmentsPassed: [] }, rule);
    expect(state.percent).toBe(66);
    expect(state.complete).toBe(true);
  });

  it('holds completion back until required assessments are passed', () => {
    const withQuiz = {
      ...curriculum,
      sections: [
        {
          id: 's', title: 's',
          lessons: [lesson('a', { assessmentId: 'q1' }), lesson('b'), lesson('c'), lesson('d', { required: false })],
        },
      ],
    };
    let b = emptyBitmap();
    for (const i of [0, 1, 2]) b = setBit(b, i);
    const rule = { kind: 'all_required' as const, requireAssessmentsPassed: true };

    const blocked = evaluateCompletion(withQuiz, { completedBitmap: b, assessmentsPassed: [] }, rule);
    expect(blocked.complete).toBe(false);
    expect(blocked.blockers.some((x) => x.includes('assessment'))).toBe(true);

    const passed = evaluateCompletion(withQuiz, { completedBitmap: b, assessmentsPassed: ['q1'] }, rule);
    expect(passed.complete).toBe(true);
  });

  it('reports a course with no required lessons as complete', () => {
    const state = evaluateCompletion(
      { lessonOrder: ['a'], requiredLessonIds: [], sections: [] },
      { completedBitmap: emptyBitmap(), assessmentsPassed: [] },
      { kind: 'all_required', requireAssessmentsPassed: false },
    );
    expect(state.percent).toBe(100);
    expect(state.complete).toBe(true);
  });
});

describe('drip', () => {
  const anchor = Date.UTC(2026, 0, 1);
  const day = 24 * 60 * 60_000;

  it('opens everything when drip is off', () => {
    expect(
      isLessonUnlocked(lesson('a', { dripAfterDays: 30 }), {
        dripMode: 'none', dripAnchorAt: anchor, now: anchor, lessonIndex: 5, completedBitmap: emptyBitmap(),
      }),
    ).toBe(true);
  });

  it('releases a scheduled lesson on its day', () => {
    const l = lesson('a', { dripAfterDays: 7 });
    const base = { dripMode: 'schedule' as const, dripAnchorAt: anchor, lessonIndex: 3, completedBitmap: emptyBitmap() };
    expect(isLessonUnlocked(l, { ...base, now: anchor + 6 * day })).toBe(false);
    expect(isLessonUnlocked(l, { ...base, now: anchor + 7 * day })).toBe(true);
  });

  it('opens the first lesson of a sequential course immediately', () => {
    expect(
      isLessonUnlocked(lesson('a'), {
        dripMode: 'sequential', dripAnchorAt: anchor, now: anchor, lessonIndex: 0, completedBitmap: emptyBitmap(),
      }),
    ).toBe(true);
  });

  it('gates a sequential lesson on everything before it', () => {
    const base = { dripMode: 'sequential' as const, dripAnchorAt: anchor, now: anchor, lessonIndex: 2 };
    expect(isLessonUnlocked(lesson('c'), { ...base, completedBitmap: setBit(emptyBitmap(), 0) })).toBe(false);
    const both = setBit(setBit(emptyBitmap(), 0), 1);
    expect(isLessonUnlocked(lesson('c'), { ...base, completedBitmap: both })).toBe(true);
  });
});

describe('video completion', () => {
  it('needs most of the video, not merely a visit', () => {
    expect(isVideoComplete(10, 100)).toBe(false);
    expect(isVideoComplete(89, 100)).toBe(false);
    expect(isVideoComplete(90, 100)).toBe(true);
  });

  it('refuses to divide by a zero duration', () => {
    expect(isVideoComplete(50, 0)).toBe(false);
  });
});

describe('migrateProgress', () => {
  const from = { lessonOrder: ['a', 'b', 'c'], requiredLessonIds: ['a', 'b', 'c'] };

  it('keeps completion for lessons that survived, by id not by position', () => {
    // 'a' and 'c' done; the new version inserts 'x' between them, so every
    // position shifts. Copying the bitmap would silently mark the wrong lessons.
    let b = setBit(emptyBitmap(), 0);
    b = setBit(b, 2);
    const to = { lessonOrder: ['a', 'x', 'b', 'c'], requiredLessonIds: ['a', 'x', 'b', 'c'] };

    const result = migrateProgress(from, to, { completedBitmap: b }, false);
    expect(completedLessonIds(result.bitmap, to.lessonOrder)).toEqual(['a', 'c']);
    expect(result.completedRequired).toBe(2);
    expect(result.requiredTotal).toBe(4);
    expect(result.addedRequiredLessonIds).toEqual(['x']);
  });

  it('reports lessons that were deleted out from under a learner', () => {
    const b = setBit(setBit(emptyBitmap(), 0), 1);
    const to = { lessonOrder: ['a'], requiredLessonIds: ['a'] };
    const result = migrateProgress(from, to, { completedBitmap: b }, false);
    expect(result.droppedLessonIds).toEqual(['b']);
    expect(result.percent).toBe(100);
  });

  it('carries the fact that a learner had already finished', () => {
    // The caller uses this to refuse to revoke a certificate.
    let b = emptyBitmap();
    for (const i of [0, 1, 2]) b = setBit(b, i);
    const to = { lessonOrder: ['a', 'b', 'c', 'new'], requiredLessonIds: ['a', 'b', 'c', 'new'] };
    const result = migrateProgress(from, to, { completedBitmap: b }, true);

    expect(result.wasComplete).toBe(true);
    // Their percentage honestly falls, because the course really did grow.
    expect(result.percent).toBe(75);
  });

  it('handles a learner who had done nothing', () => {
    const to = { lessonOrder: ['a', 'b'], requiredLessonIds: ['a', 'b'] };
    const result = migrateProgress(from, to, { completedBitmap: emptyBitmap() }, false);
    expect(countBits(result.bitmap)).toBe(0);
    expect(result.percent).toBe(0);
  });
});
