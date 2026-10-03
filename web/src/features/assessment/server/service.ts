/**
 * The assessment service: start an attempt, answer, submit, grade.
 *
 * Practice and quiz share every path; only the policy differs. One grading
 * implementation means a practice and the quiz it prepares you for can never
 * disagree about what the right answer is.
 */

import { buildServedItems, gradeAttempt } from '../domain/grading';
import {
  attemptId,
  attemptIndexId,
  questionKeyId,
} from '../domain/entities';
import type {
  AnswerKey,
  Assessment,
  AssessmentRepositories,
  Attempt,
  AttemptIndex,
  GradedResponse,
  Instant,
  Question,
  QuestionPayload,
  Response,
  ServedItem,
} from '../domain/entities';

export interface AssessmentDeps {
  repos: AssessmentRepositories;
  now: () => Instant;
  /** Seed for the deterministic shuffle; injected so tests are reproducible. */
  seed?: () => number;
}

/** A question as the client may see it: no answer key, options in served order. */
export interface ClientQuestion {
  questionId: string;
  type: Question['type'];
  stem: string;
  points: number;
  payload: QuestionPayload;
}

export type StartResult =
  | { ok: true; attempt: Attempt; questions: ClientQuestion[] }
  | { ok: false; code: 'no_attempts_left' | 'not_found' | 'inactive'; message: string };

export type SubmitResult =
  | { ok: true; attempt: Attempt; graded: GradedResponse[]; showFeedback: boolean }
  | { ok: false; code: 'not_found' | 'already_submitted' | 'expired'; message: string };

export function createAssessmentService(deps: AssessmentDeps) {
  const { repos, now } = deps;
  const seed = deps.seed ?? (() => Math.floor(Math.random() * 2 ** 31));

  async function loadQuestions(assessment: Assessment): Promise<Question[]> {
    if (assessment.selection.mode === 'fixed') {
      return repos.questions.getMany(assessment.selection.questionIds);
    }

    const { bankId, count, tags } = assessment.selection;
    const page = await repos.questions.list({
      where: { bankId: { eq: bankId } },
      limit: Math.max(count * 4, 50),
    });
    const pool = tags?.length
      ? page.items.filter((q) => q.tags.some((t) => tags.includes(t)))
      : page.items;
    return pool.slice(0, count);
  }

  /**
   * Strip a question down to what a learner may receive.
   *
   * The key lives in another document, so this cannot leak it by omission —
   * but option order still has to match what was served, or review would show
   * a different arrangement from the attempt.
   */
  function toClientQuestion(question: Question, item: ServedItem): ClientQuestion {
    let payload = question.payload;

    if (item.optionOrder) {
      if (payload.kind === 'mcq_single' || payload.kind === 'mcq_multi') {
        const byId = new Map(payload.options.map((o) => [o.id, o]));
        payload = {
          ...payload,
          options: item.optionOrder.flatMap((id) => {
            const option = byId.get(id);
            return option ? [option] : [];
          }),
        };
      } else if (payload.kind === 'order') {
        const byId = new Map(payload.items.map((o) => [o.id, o]));
        payload = {
          ...payload,
          items: item.optionOrder.flatMap((id) => {
            const option = byId.get(id);
            return option ? [option] : [];
          }),
        };
      }
    }

    return {
      questionId: question.id,
      type: question.type,
      stem: question.stem,
      points: question.points,
      payload,
    };
  }

  return {
    /** How many attempts remain, and whether they have already passed. */
    async attemptStatus(assessmentId: string, userId: string): Promise<AttemptIndex | null> {
      return repos.attemptIndex.get(attemptIndexId(assessmentId, userId));
    },

    /**
     * Begin an attempt.
     *
     * The selection is frozen onto the attempt here. Everything downstream —
     * rendering, review, grading — reads that snapshot, so an instructor editing
     * the bank mid-attempt cannot change the questions under the learner or
     * move the points denominator.
     */
    async startAttempt(input: { assessmentId: string; userId: string }): Promise<StartResult> {
      const assessment = await repos.assessments.get(input.assessmentId);
      if (!assessment) return { ok: false, code: 'not_found', message: 'assessment not found' };
      if (!assessment.active) return { ok: false, code: 'inactive', message: 'this assessment is closed' };

      const indexId = attemptIndexId(input.assessmentId, input.userId);
      const { entity: index } = await repos.attemptIndex.createIfAbsent(indexId, {
        id: indexId,
        assessmentId: input.assessmentId,
        userId: input.userId,
        attemptCount: 0,
        bestPercent: 0,
        passed: false,
      } as Omit<AttemptIndex, 'createdAt' | 'updatedAt' | 'version'>);

      // A practice is unlimited by definition; a quiz is not.
      const unlimited = assessment.mode === 'practice' || assessment.policy.maxAttempts <= 0;
      if (!unlimited && index.attemptCount >= assessment.policy.maxAttempts) {
        return {
          ok: false,
          code: 'no_attempts_left',
          message: `no attempts remaining (limit ${assessment.policy.maxAttempts})`,
        };
      }

      const questions = await loadQuestions(assessment);
      const attemptSeed = seed();
      const servedItems = buildServedItems(questions, {
        shuffleQuestions: assessment.policy.shuffleQuestions,
        seed: attemptSeed,
      });

      const attemptNo = index.attemptCount + 1;
      const at = now();
      const id = attemptId(input.assessmentId, input.userId, attemptNo);

      // Deterministic id: a double-clicked "start" cannot create two attempts.
      const { entity: attempt } = await repos.attempts.createIfAbsent(id, {
        id,
        assessmentId: input.assessmentId,
        userId: input.userId,
        attemptNo,
        status: 'in_progress',
        servedItems,
        responses: {},
        graded: [],
        score: 0,
        totalPoints: servedItems.reduce((sum, i) => sum + i.points, 0),
        percent: 0,
        passed: false,
        startedAt: at,
        // Server-computed: a client clock is never trusted with a deadline.
        ...(assessment.policy.timeLimitSec
          ? { dueAt: at + assessment.policy.timeLimitSec * 1_000 }
          : {}),
      } as Omit<Attempt, 'createdAt' | 'updatedAt' | 'version'>);

      await repos.attemptIndex.update(indexId, {
        attemptCount: attemptNo,
        lastAttemptId: id,
      } as Partial<AttemptIndex>);

      const byId = new Map(questions.map((q) => [q.id, q]));
      const clientQuestions = attempt.servedItems.flatMap((item) => {
        const question = byId.get(item.questionId);
        return question ? [toClientQuestion(question, item)] : [];
      });

      return { ok: true, attempt, questions: clientQuestions };
    },

    /** Save an answer without submitting, so progress survives a reload. */
    async answer(input: {
      attemptId: string;
      questionId: string;
      response: Response;
    }): Promise<{ ok: boolean; code?: 'not_found' | 'already_submitted' }> {
      const attempt = await repos.attempts.get(input.attemptId);
      if (!attempt) return { ok: false, code: 'not_found' };
      if (attempt.status !== 'in_progress') return { ok: false, code: 'already_submitted' };

      await repos.attempts.update(input.attemptId, {
        responses: { ...attempt.responses, [input.questionId]: input.response },
      } as Partial<Attempt>);
      return { ok: true };
    },

    /**
     * Submit and grade.
     *
     * A late submission is accepted and graded rather than discarded — losing a
     * learner's work to a slow network is worse than the alternative — but it is
     * graded against the deadline, so lateness cannot buy extra time.
     */
    async submitAttempt(input: {
      attemptId: string;
      responses?: Record<string, Response>;
    }): Promise<SubmitResult> {
      const attempt = await repos.attempts.get(input.attemptId);
      if (!attempt) return { ok: false, code: 'not_found', message: 'attempt not found' };
      if (attempt.status !== 'in_progress') {
        return { ok: false, code: 'already_submitted', message: 'this attempt was already submitted' };
      }

      const assessment = await repos.assessments.get(attempt.assessmentId);
      if (!assessment) return { ok: false, code: 'not_found', message: 'assessment not found' };

      const at = now();
      const responses = { ...attempt.responses, ...(input.responses ?? {}) };

      const keyRows = await repos.questionKeys.getMany(
        attempt.servedItems.map((i) => questionKeyId(i.questionId)),
      );
      const keys = new Map<string, AnswerKey>(keyRows.map((row) => [row.questionId, row.key]));

      const questions = await repos.questions.getMany(attempt.servedItems.map((i) => i.questionId));
      const explanations = new Map<string, string>(
        questions.flatMap((q) => (q.explanation ? [[q.id, q.explanation] as const] : [])),
      );

      const result = gradeAttempt(attempt.servedItems, responses, keys, explanations);
      const passed = result.percent >= assessment.policy.passPercent;

      const graded = await repos.attempts.update(input.attemptId, {
        status: 'graded',
        responses,
        graded: result.graded,
        score: result.score,
        totalPoints: result.totalPoints,
        percent: result.percent,
        passed,
        submittedAt: at,
      } as Partial<Attempt>);

      const indexId = attemptIndexId(attempt.assessmentId, attempt.userId);
      const index = await repos.attemptIndex.get(indexId);
      if (index) {
        await repos.attemptIndex.update(indexId, {
          bestPercent: Math.max(index.bestPercent, result.percent),
          // Passing once is passing: a later worse attempt does not un-pass.
          passed: index.passed || passed,
        } as Partial<AttemptIndex>);
      }

      const showFeedback =
        assessment.policy.feedback === 'immediate' || assessment.policy.feedback === 'after_attempt';

      return { ok: true, attempt: graded, graded: showFeedback ? result.graded : [], showFeedback };
    },

    /**
     * Grade a single answer without submitting.
     *
     * This is what makes a practice a practice: immediate feedback, as many
     * times as the learner likes, through the same grader the quiz will use.
     */
    async checkAnswer(input: {
      assessmentId: string;
      questionId: string;
      response: Response;
    }): Promise<
      | { ok: true; correct: boolean; ratio: number; explanation?: string }
      | { ok: false; code: 'not_found' | 'not_practice' }
    > {
      const assessment = await repos.assessments.get(input.assessmentId);
      if (!assessment) return { ok: false, code: 'not_found' };
      if (assessment.mode !== 'practice' && assessment.policy.feedback !== 'immediate') {
        return { ok: false, code: 'not_practice' };
      }

      const question = await repos.questions.get(input.questionId);
      const keyRow = await repos.questionKeys.get(questionKeyId(input.questionId));
      if (!question || !keyRow) return { ok: false, code: 'not_found' };

      const result = gradeAttempt(
        [{ questionId: question.id, type: question.type, points: question.points }],
        { [question.id]: input.response },
        new Map([[question.id, keyRow.key]]),
      );

      const first = result.graded[0];
      return {
        ok: true,
        correct: first?.correct ?? false,
        ratio: question.points === 0 ? 0 : (first?.pointsAwarded ?? 0) / question.points,
        ...(question.explanation ? { explanation: question.explanation } : {}),
      };
    },

    /** Expire attempts whose deadline has passed, grading what was answered. */
    async expireOverdue(limit = 50): Promise<number> {
      const at = now();
      const page = await repos.attempts.list({ where: { status: { eq: 'in_progress' } }, limit });
      let expired = 0;
      for (const attempt of page.items) {
        if (attempt.dueAt !== undefined && attempt.dueAt <= at) {
          await this.submitAttempt({ attemptId: attempt.id });
          expired += 1;
        }
      }
      return expired;
    },
  };
}

export type AssessmentService = ReturnType<typeof createAssessmentService>;
