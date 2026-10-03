import { describe, expect, it } from 'vitest';

import { FakeRepository } from '../testing/fake-repo';
import { createAssessmentService } from '../server/service';
import { attemptIndexId, questionKeyId } from '../domain/entities';
import type {
  Assessment,
  AssessmentRepositories,
  Attempt,
  AttemptIndex,
  Question,
  QuestionKey,
} from '../domain/entities';

const NOW = Date.UTC(2026, 8, 16, 9, 0, 0);
let clock = NOW;

function makeRepos(): AssessmentRepositories {
  const at = () => new Date(clock).toISOString();
  return {
    questions: new FakeRepository<Question>(at),
    questionKeys: new FakeRepository<QuestionKey>(at),
    assessments: new FakeRepository<Assessment>(at),
    attempts: new FakeRepository<Attempt>(at),
    attemptIndex: new FakeRepository<AttemptIndex>(at),
  };
}

async function setup(over: Partial<Assessment> = {}) {
  clock = NOW;
  const repos = makeRepos();
  const service = createAssessmentService({ repos, now: () => clock, seed: () => 11 });

  await repos.questions.create({
    id: 'q1', bankId: 'ai', type: 'mcq_single', stem: 'Which is a retrieval technique?',
    payload: { kind: 'mcq_single', options: [{ id: 'a', label: 'RAG' }, { id: 'b', label: 'ReLU' }], shuffle: false },
    points: 2, difficulty: 'easy', tags: ['rag'], explanation: 'RAG retrieves before generating.',
  } as Omit<Question, 'createdAt' | 'updatedAt' | 'version'>);
  await repos.questionKeys.create({
    id: questionKeyId('q1'), questionId: 'q1', key: { kind: 'mcq_single', correctOptionId: 'a' },
  } as Omit<QuestionKey, 'createdAt' | 'updatedAt' | 'version'>);

  await repos.questions.create({
    id: 'q2', bankId: 'ai', type: 'true_false', stem: 'A prompt is deterministic.',
    payload: { kind: 'true_false' }, points: 1, difficulty: 'easy', tags: ['prompting'],
  } as Omit<Question, 'createdAt' | 'updatedAt' | 'version'>);
  await repos.questionKeys.create({
    id: questionKeyId('q2'), questionId: 'q2', key: { kind: 'true_false', correct: false },
  } as Omit<QuestionKey, 'createdAt' | 'updatedAt' | 'version'>);

  await repos.assessments.create({
    id: 'as1', ownerRef: 'lms:lesson:l1', mode: 'quiz', title: 'Quiz',
    selection: { mode: 'fixed', questionIds: ['q1', 'q2'] },
    policy: { maxAttempts: 2, scoring: 'best', shuffleQuestions: false, feedback: 'after_attempt', passPercent: 60 },
    totalPoints: 3, active: true,
    ...over,
  } as Omit<Assessment, 'createdAt' | 'updatedAt' | 'version'>);

  return { repos, service };
}

describe('starting an attempt', () => {
  it('serves the questions without their answer keys', async () => {
    const { service } = await setup();
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.questions).toHaveLength(2);
    // The key lives in another document, so it cannot travel with the payload.
    const serialised = JSON.stringify(started.questions);
    expect(serialised).not.toContain('correctOptionId');
    expect(serialised).not.toContain('"correct"');
  });

  it('freezes what was served onto the attempt', async () => {
    const { service, repos } = await setup();
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;

    // Editing the bank afterwards must not change this attempt.
    await repos.questions.update('q1', { points: 99 } as Partial<Question>);
    const stored = await repos.attempts.get(started.attempt.id);
    expect(stored?.servedItems.find((i) => i.questionId === 'q1')?.points).toBe(2);
    expect(stored?.totalPoints).toBe(3);
  });

  it('enforces the attempt limit on a quiz', async () => {
    const { service } = await setup();
    await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    const third = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.code).toBe('no_attempts_left');
  });

  it('never limits a practice', async () => {
    const { service } = await setup({ id: 'as1', mode: 'practice' });
    for (let i = 0; i < 5; i += 1) {
      const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
      expect(started.ok).toBe(true);
    }
  });

  it('refuses a closed assessment', async () => {
    const { service, repos } = await setup();
    await repos.assessments.update('as1', { active: false } as Partial<Assessment>);
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    expect(started.ok).toBe(false);
    if (!started.ok) expect(started.code).toBe('inactive');
  });

  it('sets the deadline on the server, not from the client', async () => {
    const { service } = await setup({
      id: 'as1',
      policy: { maxAttempts: 2, scoring: 'best', timeLimitSec: 600, shuffleQuestions: false, feedback: 'after_attempt', passPercent: 60 },
    } as Partial<Assessment>);
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    expect(started.attempt.dueAt).toBe(NOW + 600_000);
  });
});

describe('answering and submitting', () => {
  it('saves an answer so a reload does not lose it', async () => {
    const { service, repos } = await setup();
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;

    await service.answer({
      attemptId: started.attempt.id, questionId: 'q1', response: { kind: 'mcq_single', optionId: 'a' },
    });
    const stored = await repos.attempts.get(started.attempt.id);
    expect(stored?.responses['q1']).toEqual({ kind: 'mcq_single', optionId: 'a' });
  });

  it('grades a submission and reports a pass', async () => {
    const { service } = await setup();
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;

    const result = await service.submitAttempt({
      attemptId: started.attempt.id,
      responses: {
        q1: { kind: 'mcq_single', optionId: 'a' },
        q2: { kind: 'true_false', value: false },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt.score).toBe(3);
    expect(result.attempt.percent).toBe(100);
    expect(result.attempt.passed).toBe(true);
  });

  it('reports a fail below the pass mark', async () => {
    const { service } = await setup();
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    const result = await service.submitAttempt({
      attemptId: started.attempt.id,
      responses: { q2: { kind: 'true_false', value: false } },
    });
    if (!result.ok) return;
    // 1 of 3 points is 33%, under the 60% pass mark.
    expect(result.attempt.percent).toBe(33);
    expect(result.attempt.passed).toBe(false);
  });

  it('refuses to submit twice', async () => {
    const { service } = await setup();
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    await service.submitAttempt({ attemptId: started.attempt.id });
    const again = await service.submitAttempt({ attemptId: started.attempt.id });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.code).toBe('already_submitted');
  });

  it('withholds feedback when the policy says never', async () => {
    const { service } = await setup({
      id: 'as1',
      policy: { maxAttempts: 2, scoring: 'best', shuffleQuestions: false, feedback: 'never', passPercent: 60 },
    } as Partial<Assessment>);
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    const result = await service.submitAttempt({ attemptId: started.attempt.id });
    if (!result.ok) return;
    expect(result.showFeedback).toBe(false);
    expect(result.graded).toEqual([]);
  });

  it('keeps the best score and never un-passes a learner', async () => {
    const { service } = await setup();
    const first = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!first.ok) return;
    await service.submitAttempt({
      attemptId: first.attempt.id,
      responses: { q1: { kind: 'mcq_single', optionId: 'a' }, q2: { kind: 'true_false', value: false } },
    });

    const second = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!second.ok) return;
    await service.submitAttempt({ attemptId: second.attempt.id, responses: {} });

    const index = await service.attemptStatus('as1', 'u1');
    expect(index?.bestPercent).toBe(100);
    expect(index?.passed).toBe(true);
  });
});

describe('practice mode', () => {
  it('checks one answer immediately and returns the explanation', async () => {
    const { service } = await setup({ id: 'as1', mode: 'practice' });
    const right = await service.checkAnswer({
      assessmentId: 'as1', questionId: 'q1', response: { kind: 'mcq_single', optionId: 'a' },
    });
    expect(right.ok).toBe(true);
    if (!right.ok) return;
    expect(right.correct).toBe(true);
    expect(right.explanation).toBe('RAG retrieves before generating.');

    const wrong = await service.checkAnswer({
      assessmentId: 'as1', questionId: 'q1', response: { kind: 'mcq_single', optionId: 'b' },
    });
    if (!wrong.ok) return;
    expect(wrong.correct).toBe(false);
    // Explanation is still shown: in practice, being wrong is the teachable moment.
    expect(wrong.explanation).toBe('RAG retrieves before generating.');
  });

  it('refuses immediate checking on a graded quiz', async () => {
    const { service } = await setup();
    const result = await service.checkAnswer({
      assessmentId: 'as1', questionId: 'q1', response: { kind: 'mcq_single', optionId: 'a' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_practice');
  });

  it('uses the same grader as the quiz, so the two cannot disagree', async () => {
    const { service, repos } = await setup({ id: 'as1', mode: 'practice' });
    const practice = await service.checkAnswer({
      assessmentId: 'as1', questionId: 'q1', response: { kind: 'mcq_single', optionId: 'a' },
    });

    await repos.assessments.update('as1', { mode: 'quiz' } as Partial<Assessment>);
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok || !practice.ok) return;
    const submitted = await service.submitAttempt({
      attemptId: started.attempt.id,
      responses: { q1: { kind: 'mcq_single', optionId: 'a' } },
    });
    if (!submitted.ok) return;

    const q1 = submitted.attempt.graded.find((g) => g.questionId === 'q1');
    expect(q1?.correct).toBe(practice.correct);
  });
});

describe('deadlines', () => {
  it('grades an overdue attempt rather than discarding the work', async () => {
    const { service, repos } = await setup({
      id: 'as1',
      policy: { maxAttempts: 2, scoring: 'best', timeLimitSec: 60, shuffleQuestions: false, feedback: 'after_attempt', passPercent: 60 },
    } as Partial<Assessment>);

    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    await service.answer({
      attemptId: started.attempt.id, questionId: 'q1', response: { kind: 'mcq_single', optionId: 'a' },
    });

    clock = NOW + 120_000;
    expect(await service.expireOverdue()).toBe(1);

    const stored = await repos.attempts.get(started.attempt.id);
    expect(stored?.status).toBe('graded');
    // What they had answered still counted.
    expect(stored?.score).toBe(2);
  });

  it('leaves attempts inside their deadline alone', async () => {
    const { service } = await setup({
      id: 'as1',
      policy: { maxAttempts: 2, scoring: 'best', timeLimitSec: 600, shuffleQuestions: false, feedback: 'after_attempt', passPercent: 60 },
    } as Partial<Assessment>);
    await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    clock = NOW + 60_000;
    expect(await service.expireOverdue()).toBe(0);
  });
});

describe('random selection', () => {
  it('draws the requested number from the bank', async () => {
    const { service, repos } = await setup({
      id: 'as1',
      selection: { mode: 'random', bankId: 'ai', count: 1 },
    } as Partial<Assessment>);
    void repos;
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    expect(started.questions).toHaveLength(1);
  });

  it('filters the bank by tag', async () => {
    const { service } = await setup({
      id: 'as1',
      selection: { mode: 'random', bankId: 'ai', count: 5, tags: ['rag'] },
    } as Partial<Assessment>);
    const started = await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    if (!started.ok) return;
    expect(started.questions.map((q) => q.questionId)).toEqual(['q1']);
  });
});

describe('attempt index', () => {
  it('is created on first start and answers "may I try again" in one read', async () => {
    const { service } = await setup();
    expect(await service.attemptStatus('as1', 'u1')).toBeNull();
    await service.startAttempt({ assessmentId: 'as1', userId: 'u1' });
    const index = await service.attemptStatus('as1', 'u1');
    expect(index?.attemptCount).toBe(1);
    expect(index?.id).toBe(attemptIndexId('as1', 'u1'));
  });
});
