/**
 * Assessment entities: question banks, quizzes, practices, attempts, grading.
 *
 * Two decisions shape everything here.
 *
 * **Question payloads are a discriminated union in one document**, not a
 * normalised options table. Rendering a question is one read rather than four
 * joins, adding a type is one variant plus one grader, and no schema changes in
 * either store. This is a case where a document store is genuinely the better
 * fit rather than a constraint to work around.
 *
 * **Answer keys live in a sibling document.** `question/{id}` is readable by a
 * learner; `question_key/{id}` is not. Document stores have no column-level
 * permissions, so separating the documents is the portable way to keep an
 * answer out of a payload the client can read.
 */

import type { Entity } from '../host/contract';

export type Instant = number;

export type QuestionType =
  | 'mcq_single'
  | 'mcq_multi'
  | 'true_false'
  | 'short_text'
  | 'numeric'
  | 'order';

export interface McqOption {
  id: string;
  label: string;
}

/** The learner-visible half of a question. Never contains the answer. */
export type QuestionPayload =
  | { kind: 'mcq_single'; options: McqOption[]; shuffle: boolean }
  | { kind: 'mcq_multi'; options: McqOption[]; shuffle: boolean; minChoices?: number }
  | { kind: 'true_false' }
  | { kind: 'short_text'; placeholder?: string }
  | { kind: 'numeric'; unit?: string }
  | { kind: 'order'; items: McqOption[] };

/** The server-only half. Stored separately so it is not merely hidden but absent. */
export type AnswerKey =
  | { kind: 'mcq_single'; correctOptionId: string }
  | { kind: 'mcq_multi'; correctOptionIds: string[]; partialCredit: boolean }
  | { kind: 'true_false'; correct: boolean }
  | { kind: 'short_text'; accepted: string[]; caseSensitive: boolean }
  | { kind: 'numeric'; answer: number; tolerance: number }
  | { kind: 'order'; correctOrder: string[] };

export interface Question extends Entity {
  bankId: string;
  type: QuestionType;
  /** Rich text is the host's problem; the brick stores a string. */
  stem: string;
  payload: QuestionPayload;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  /** Shown after an attempt, or immediately in practice mode. */
  explanation?: string;
}

/** Deliberately a separate collection, with different read rules. */
export interface QuestionKey extends Entity {
  questionId: string;
  key: AnswerKey;
}

/**
 * How a quiz picks its questions.
 *
 * `random` selects from a bank at attempt time; the selection is then frozen
 * onto the attempt, so a reload does not reshuffle and an edit mid-attempt
 * cannot corrupt grading.
 */
export type QuestionSelection =
  | { mode: 'fixed'; questionIds: string[] }
  | { mode: 'random'; bankId: string; count: number; tags?: string[] };

/**
 * Practice and quiz are the same machinery with different policy.
 *
 * A practice is unlimited, ungraded, and gives feedback immediately — it exists
 * to teach. A quiz is limited, graded, and withholds feedback until submission
 * — it exists to measure. Modelling them as one entity with a mode keeps one
 * grading path rather than two that can disagree.
 */
export type AssessmentMode = 'quiz' | 'practice';

export interface AttemptPolicy {
  maxAttempts: number;
  scoring: 'best' | 'last' | 'average';
  timeLimitSec?: number;
  shuffleQuestions: boolean;
  feedback: 'immediate' | 'after_attempt' | 'never';
  passPercent: number;
}

export interface Assessment extends Entity {
  /** What this belongs to, e.g. 'lms:lesson:l_5'. Opaque to this brick. */
  ownerRef: string;
  mode: AssessmentMode;
  title: string;
  description?: string;
  selection: QuestionSelection;
  policy: AttemptPolicy;
  totalPoints: number;
  active: boolean;
}

/** One question as it was actually served, frozen at attempt start. */
export interface ServedItem {
  questionId: string;
  type: QuestionType;
  points: number;
  /** The order options were shown in, so review matches what they saw. */
  optionOrder?: string[];
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'expired';

export type Response =
  | { kind: 'mcq_single'; optionId: string }
  | { kind: 'mcq_multi'; optionIds: string[] }
  | { kind: 'true_false'; value: boolean }
  | { kind: 'short_text'; text: string }
  | { kind: 'numeric'; value: number }
  | { kind: 'order'; order: string[] };

export interface GradedResponse {
  questionId: string;
  correct: boolean;
  /** Partial credit is possible, so this is not simply points or zero. */
  pointsAwarded: number;
  pointsPossible: number;
  explanation?: string;
}

export interface Attempt extends Entity {
  assessmentId: string;
  userId: string;
  attemptNo: number;
  status: AttemptStatus;
  /** The frozen snapshot: grading runs against this, never the live questions. */
  servedItems: ServedItem[];
  responses: Record<string, Response>;
  graded: GradedResponse[];
  score: number;
  totalPoints: number;
  percent: number;
  passed: boolean;
  startedAt: Instant;
  /** Server-computed; a client clock is never trusted. */
  dueAt?: Instant;
  submittedAt?: Instant;
}

/**
 * Answers "may I start another attempt?" in one read.
 *
 * A count query would need an index and would still race; a deterministic
 * document per learner per assessment does not.
 */
export interface AttemptIndex extends Entity {
  assessmentId: string;
  userId: string;
  attemptCount: number;
  bestPercent: number;
  lastAttemptId?: string;
  passed: boolean;
}

export interface AssessmentRepositories {
  questions: import('../host/contract').Repository<Question>;
  questionKeys: import('../host/contract').Repository<QuestionKey>;
  assessments: import('../host/contract').Repository<Assessment>;
  attempts: import('../host/contract').Repository<Attempt>;
  attemptIndex: import('../host/contract').Repository<AttemptIndex>;
}

export const attemptIndexId = (assessmentId: string, userId: string) =>
  `ai_${assessmentId}_${userId}`;
export const attemptId = (assessmentId: string, userId: string, attemptNo: number) =>
  `att_${assessmentId}_${userId}_${attemptNo}`;
export const questionKeyId = (questionId: string) => `key_${questionId}`;
