/**
 * Grading: one pure function per question type, behind a registry.
 *
 * Adding a type is a payload variant, a key variant, and one entry here — no
 * schema change in either store, and no branching scattered through the service.
 */

import type { AnswerKey, GradedResponse, Question, Response, ServedItem } from './entities';

/** Fold case, trim, collapse whitespace, and normalise unicode. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface GradeOutcome {
  correct: boolean;
  /** 0..1, so partial credit needs no knowledge of the question's points. */
  ratio: number;
}

function gradeMcqSingle(response: Response, key: AnswerKey): GradeOutcome {
  if (response.kind !== 'mcq_single' || key.kind !== 'mcq_single') return { correct: false, ratio: 0 };
  const correct = response.optionId === key.correctOptionId;
  return { correct, ratio: correct ? 1 : 0 };
}

/**
 * Multi-select with optional partial credit.
 *
 * Partial credit subtracts wrong choices from right ones, so selecting
 * everything scores zero rather than full marks — which is the whole reason a
 * naive "count the correct ones" rule is wrong.
 */
function gradeMcqMulti(response: Response, key: AnswerKey): GradeOutcome {
  if (response.kind !== 'mcq_multi' || key.kind !== 'mcq_multi') return { correct: false, ratio: 0 };

  const chosen = new Set(response.optionIds);
  const correctSet = new Set(key.correctOptionIds);

  const hits = [...chosen].filter((id) => correctSet.has(id)).length;
  const misses = [...chosen].filter((id) => !correctSet.has(id)).length;
  const exact = hits === correctSet.size && misses === 0;

  if (!key.partialCredit) return { correct: exact, ratio: exact ? 1 : 0 };
  if (correctSet.size === 0) return { correct: exact, ratio: exact ? 1 : 0 };

  const ratio = Math.max(0, (hits - misses) / correctSet.size);
  return { correct: exact, ratio: Math.min(1, ratio) };
}

function gradeTrueFalse(response: Response, key: AnswerKey): GradeOutcome {
  if (response.kind !== 'true_false' || key.kind !== 'true_false') return { correct: false, ratio: 0 };
  const correct = response.value === key.correct;
  return { correct, ratio: correct ? 1 : 0 };
}

function gradeShortText(response: Response, key: AnswerKey): GradeOutcome {
  if (response.kind !== 'short_text' || key.kind !== 'short_text') return { correct: false, ratio: 0 };

  const given = key.caseSensitive
    ? normalizeText(response.text)
    : normalizeText(response.text).toLowerCase();

  const correct = key.accepted.some((accepted) => {
    const target = key.caseSensitive ? normalizeText(accepted) : normalizeText(accepted).toLowerCase();
    return target === given;
  });

  return { correct, ratio: correct ? 1 : 0 };
}

function gradeNumeric(response: Response, key: AnswerKey): GradeOutcome {
  if (response.kind !== 'numeric' || key.kind !== 'numeric') return { correct: false, ratio: 0 };
  if (!Number.isFinite(response.value)) return { correct: false, ratio: 0 };
  const correct = Math.abs(response.value - key.answer) <= key.tolerance;
  return { correct, ratio: correct ? 1 : 0 };
}

/** Ordering: credit for each item in its right place. */
function gradeOrder(response: Response, key: AnswerKey): GradeOutcome {
  if (response.kind !== 'order' || key.kind !== 'order') return { correct: false, ratio: 0 };
  if (response.order.length !== key.correctOrder.length) return { correct: false, ratio: 0 };

  const inPlace = key.correctOrder.filter((id, i) => response.order[i] === id).length;
  const ratio = key.correctOrder.length === 0 ? 0 : inPlace / key.correctOrder.length;
  return { correct: ratio === 1, ratio };
}

const GRADERS: Record<AnswerKey['kind'], (r: Response, k: AnswerKey) => GradeOutcome> = {
  mcq_single: gradeMcqSingle,
  mcq_multi: gradeMcqMulti,
  true_false: gradeTrueFalse,
  short_text: gradeShortText,
  numeric: gradeNumeric,
  order: gradeOrder,
};

export function gradeOne(response: Response | undefined, key: AnswerKey): GradeOutcome {
  if (!response) return { correct: false, ratio: 0 };
  return GRADERS[key.kind](response, key);
}

export interface GradeResult {
  graded: GradedResponse[];
  score: number;
  totalPoints: number;
  percent: number;
}

/**
 * Grade a whole attempt against the items as they were served.
 *
 * Grading against `servedItems` rather than the live questions is what makes an
 * attempt immune to an instructor editing the bank mid-attempt, and what keeps
 * the points denominator fixed.
 */
export function gradeAttempt(
  servedItems: readonly ServedItem[],
  responses: Readonly<Record<string, Response>>,
  keys: ReadonlyMap<string, AnswerKey>,
  explanations: ReadonlyMap<string, string> = new Map(),
): GradeResult {
  const graded: GradedResponse[] = [];
  let score = 0;
  let totalPoints = 0;

  for (const item of servedItems) {
    const key = keys.get(item.questionId);
    totalPoints += item.points;

    if (!key) {
      // A question whose key has gone missing must not silently score full
      // marks, nor crash the whole attempt.
      graded.push({
        questionId: item.questionId,
        correct: false,
        pointsAwarded: 0,
        pointsPossible: item.points,
      });
      continue;
    }

    const outcome = gradeOne(responses[item.questionId], key);
    const pointsAwarded = Math.round(item.points * outcome.ratio * 100) / 100;
    score += pointsAwarded;

    const explanation = explanations.get(item.questionId);
    graded.push({
      questionId: item.questionId,
      correct: outcome.correct,
      pointsAwarded,
      pointsPossible: item.points,
      ...(explanation ? { explanation } : {}),
    });
  }

  const percent = totalPoints === 0 ? 0 : Math.round((score / totalPoints) * 100);
  return { graded, score: Math.round(score * 100) / 100, totalPoints, percent };
}

/* ---------------------------------------------------------------- selection */

/**
 * A deterministic shuffle.
 *
 * Seeded so an attempt can be re-rendered identically from its stored seed
 * rather than storing the whole permutation twice, and so tests are not flaky.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  let state = seed >>> 0 || 1;
  const next = () => {
    // xorshift32: small, fast, and good enough for presentation order.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Freeze the items for one attempt, applying shuffles. */
export function buildServedItems(
  questions: readonly Question[],
  options: { shuffleQuestions: boolean; seed: number },
): ServedItem[] {
  const ordered = options.shuffleQuestions
    ? seededShuffle(questions, options.seed)
    : questions.slice();

  return ordered.map((q, index) => {
    const item: ServedItem = { questionId: q.id, type: q.type, points: q.points };

    const payload = q.payload;
    if ((payload.kind === 'mcq_single' || payload.kind === 'mcq_multi') && payload.shuffle) {
      item.optionOrder = seededShuffle(payload.options, options.seed + index + 1).map((o) => o.id);
    } else if (payload.kind === 'mcq_single' || payload.kind === 'mcq_multi') {
      item.optionOrder = payload.options.map((o) => o.id);
    } else if (payload.kind === 'order') {
      // Always shuffled: presenting them in the right order gives it away.
      item.optionOrder = seededShuffle(payload.items, options.seed + index + 1).map((o) => o.id);
    }

    return item;
  });
}
