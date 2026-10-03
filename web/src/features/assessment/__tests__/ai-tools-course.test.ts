import { describe, expect, it } from 'vitest';

import { FakeRepository } from '../testing/fake-repo';
import { createAssessmentService } from '../server/service';
import { questionKeyId } from '../domain/entities';
import { AI_TOOLS_ASSESSMENTS, AI_TOOLS_QUESTIONS } from '../seed/ai-tools-bank';
import type {
  Assessment,
  AssessmentRepositories,
  Attempt,
  AttemptIndex,
  Question,
  QuestionKey,
  Response,
} from '../domain/entities';

/**
 * The seeded course, exercised for real.
 *
 * This is the test that would catch a question whose key does not match its
 * options, an assessment pointing at a question id that does not exist, or a
 * pass mark nobody can reach — the failure modes of hand-written content, which
 * unit tests of the grader cannot see.
 */

const NOW = Date.UTC(2026, 8, 17, 9, 0, 0);
let clock = NOW;

async function seeded() {
  clock = NOW;
  const at = () => new Date(clock).toISOString();
  const repos: AssessmentRepositories = {
    questions: new FakeRepository<Question>(at),
    questionKeys: new FakeRepository<QuestionKey>(at),
    assessments: new FakeRepository<Assessment>(at),
    attempts: new FakeRepository<Attempt>(at),
    attemptIndex: new FakeRepository<AttemptIndex>(at),
  };

  for (const { question, key } of AI_TOOLS_QUESTIONS) {
    await repos.questions.create(question);
    await repos.questionKeys.create({
      id: questionKeyId(question.id),
      questionId: question.id,
      key,
    } as Omit<QuestionKey, 'createdAt' | 'updatedAt' | 'version'>);
  }
  for (const assessment of AI_TOOLS_ASSESSMENTS) {
    await repos.assessments.create(assessment);
  }

  const service = createAssessmentService({ repos, now: () => clock, seed: () => 7 });
  return { repos, service };
}

/** The correct answer for each seeded question, derived from its own key. */
function correctResponse(questionId: string): Response {
  const seed = AI_TOOLS_QUESTIONS.find((s) => s.question.id === questionId);
  if (!seed) throw new Error(`no seed question ${questionId}`);
  const key = seed.key;

  switch (key.kind) {
    case 'mcq_single':
      return { kind: 'mcq_single', optionId: key.correctOptionId };
    case 'mcq_multi':
      return { kind: 'mcq_multi', optionIds: [...key.correctOptionIds] };
    case 'true_false':
      return { kind: 'true_false', value: key.correct };
    case 'short_text':
      return { kind: 'short_text', text: key.accepted[0] as string };
    case 'numeric':
      return { kind: 'numeric', value: key.answer };
    case 'order':
      return { kind: 'order', order: [...key.correctOrder] };
  }
}

describe('the seeded bank itself', () => {
  it('gives every question a key of the matching kind', () => {
    for (const { question, key } of AI_TOOLS_QUESTIONS) {
      expect(key.kind, `question ${question.id}`).toBe(question.type);
    }
  });

  it('points every multiple-choice key at options that exist', () => {
    for (const { question, key } of AI_TOOLS_QUESTIONS) {
      if (key.kind === 'mcq_single' && question.payload.kind === 'mcq_single') {
        const ids = question.payload.options.map((o) => o.id);
        expect(ids, `question ${question.id}`).toContain(key.correctOptionId);
      }
      if (key.kind === 'mcq_multi' && question.payload.kind === 'mcq_multi') {
        const ids = question.payload.options.map((o) => o.id);
        for (const correct of key.correctOptionIds) {
          expect(ids, `question ${question.id}`).toContain(correct);
        }
      }
      if (key.kind === 'order' && question.payload.kind === 'order') {
        const ids = question.payload.items.map((o) => o.id);
        expect([...key.correctOrder].sort(), `question ${question.id}`).toEqual([...ids].sort());
      }
    }
  });

  it('explains every question, since practice is where the teaching happens', () => {
    for (const { question } of AI_TOOLS_QUESTIONS) {
      expect(question.explanation, `question ${question.id}`).toBeTruthy();
    }
  });

  it('uses unique question ids', () => {
    const ids = AI_TOOLS_QUESTIONS.map((s) => s.question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('refers only to questions that exist from every fixed assessment', () => {
    const known = new Set(AI_TOOLS_QUESTIONS.map((s) => s.question.id));
    for (const assessment of AI_TOOLS_ASSESSMENTS) {
      if (assessment.selection.mode !== 'fixed') continue;
      for (const id of assessment.selection.questionIds) {
        expect(known, `assessment ${assessment.id}`).toContain(id);
      }
    }
  });

  it('draws every random assessment from a tag that has enough questions', () => {
    for (const assessment of AI_TOOLS_ASSESSMENTS) {
      if (assessment.selection.mode !== 'random') continue;
      const { tags, count } = assessment.selection;
      const pool = tags?.length
        ? AI_TOOLS_QUESTIONS.filter((s) => s.question.tags.some((t) => tags.includes(t)))
        : AI_TOOLS_QUESTIONS;
      expect(pool.length, `assessment ${assessment.id}`).toBeGreaterThanOrEqual(count);
    }
  });
});

describe('a learner taking the graded quizzes', () => {
  it('passes the foundations quiz by answering correctly', async () => {
    const { service } = await seeded();
    const started = await service.startAttempt({ assessmentId: 'as_foundations_quiz', userId: 'u1' });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const responses: Record<string, Response> = {};
    for (const item of started.attempt.servedItems) {
      responses[item.questionId] = correctResponse(item.questionId);
    }

    const result = await service.submitAttempt({ attemptId: started.attempt.id, responses });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt.percent).toBe(100);
    expect(result.attempt.passed).toBe(true);
  });

  it('fails the foundations quiz when it answers nothing', async () => {
    const { service } = await seeded();
    const started = await service.startAttempt({ assessmentId: 'as_foundations_quiz', userId: 'u2' });
    if (!started.ok) return;
    const result = await service.submitAttempt({ attemptId: started.attempt.id });
    if (!result.ok) return;
    expect(result.attempt.passed).toBe(false);
    expect(result.showFeedback).toBe(true);
    // Feedback carries the explanations, which is the point of failing safely.
    expect(result.graded.every((g) => g.explanation)).toBe(true);
  });

  it('passes the final quiz, which draws from the whole bank', async () => {
    const { service } = await seeded();
    const started = await service.startAttempt({ assessmentId: 'as_final_quiz', userId: 'u1' });
    if (!started.ok) return;
    expect(started.attempt.servedItems).toHaveLength(8);
    expect(started.attempt.dueAt).toBe(NOW + 900_000);

    const responses: Record<string, Response> = {};
    for (const item of started.attempt.servedItems) {
      responses[item.questionId] = correctResponse(item.questionId);
    }
    const result = await service.submitAttempt({ attemptId: started.attempt.id, responses });
    if (!result.ok) return;
    expect(result.attempt.percent).toBe(100);
    expect(result.attempt.passed).toBe(true);
  });

  it('reaches the 75% pass mark on the final without a perfect score', async () => {
    // A pass mark nobody can reach except by perfection is a badly set one.
    const { service } = await seeded();
    const started = await service.startAttempt({ assessmentId: 'as_final_quiz', userId: 'u3' });
    if (!started.ok) return;

    const responses: Record<string, Response> = {};
    started.attempt.servedItems.forEach((item, i) => {
      // Get the last one wrong on purpose.
      if (i < started.attempt.servedItems.length - 1) {
        responses[item.questionId] = correctResponse(item.questionId);
      }
    });

    const result = await service.submitAttempt({ attemptId: started.attempt.id, responses });
    if (!result.ok) return;
    expect(result.attempt.percent).toBeGreaterThanOrEqual(75);
    expect(result.attempt.passed).toBe(true);
  });

  it('allows a retake after a failure, and keeps the better result', async () => {
    const { service } = await seeded();

    const first = await service.startAttempt({ assessmentId: 'as_grounding_quiz', userId: 'u4' });
    if (!first.ok) return;
    await service.submitAttempt({ attemptId: first.attempt.id });

    const second = await service.startAttempt({ assessmentId: 'as_grounding_quiz', userId: 'u4' });
    if (!second.ok) return;
    const responses: Record<string, Response> = {};
    for (const item of second.attempt.servedItems) {
      responses[item.questionId] = correctResponse(item.questionId);
    }
    await service.submitAttempt({ attemptId: second.attempt.id, responses });

    const status = await service.attemptStatus('as_grounding_quiz', 'u4');
    expect(status?.attemptCount).toBe(2);
    expect(status?.bestPercent).toBe(100);
    expect(status?.passed).toBe(true);
  });
});

describe('a learner using the practices', () => {
  it('checks an answer immediately and is told why', async () => {
    const { service } = await seeded();
    const wrong = await service.checkAnswer({
      assessmentId: 'as_foundations_practice',
      questionId: 'q_next_token',
      response: { kind: 'mcq_single', optionId: 'a' },
    });
    expect(wrong.ok).toBe(true);
    if (!wrong.ok) return;
    expect(wrong.correct).toBe(false);
    expect(wrong.explanation).toContain('plausible continuation');

    const right = await service.checkAnswer({
      assessmentId: 'as_foundations_practice',
      questionId: 'q_next_token',
      response: correctResponse('q_next_token'),
    });
    if (!right.ok) return;
    expect(right.correct).toBe(true);
  });

  it('can be retried without limit', async () => {
    const { service } = await seeded();
    for (let i = 0; i < 8; i += 1) {
      const started = await service.startAttempt({
        assessmentId: 'as_automation_practice',
        userId: 'u1',
      });
      expect(started.ok, `attempt ${i + 1}`).toBe(true);
    }
  });

  it('draws only from the tags it is scoped to', async () => {
    const { service } = await seeded();
    const started = await service.startAttempt({ assessmentId: 'as_grounding_practice', userId: 'u1' });
    if (!started.ok) return;

    const groundingIds = AI_TOOLS_QUESTIONS.filter((s) => s.question.tags.includes('grounding')).map(
      (s) => s.question.id,
    );
    for (const item of started.attempt.servedItems) {
      expect(groundingIds).toContain(item.questionId);
    }
  });

  it('grades a practice exactly as the quiz would', async () => {
    const { service } = await seeded();
    const practice = await service.checkAnswer({
      assessmentId: 'as_grounding_practice',
      questionId: 'q_chunking',
      response: correctResponse('q_chunking'),
    });
    if (!practice.ok) return;

    const quiz = await service.startAttempt({ assessmentId: 'as_grounding_quiz', userId: 'u9' });
    if (!quiz.ok) return;
    const submitted = await service.submitAttempt({
      attemptId: quiz.attempt.id,
      responses: { q_chunking: correctResponse('q_chunking') },
    });
    if (!submitted.ok) return;

    const graded = submitted.attempt.graded.find((g) => g.questionId === 'q_chunking');
    expect(graded?.correct).toBe(practice.correct);
  });
});
