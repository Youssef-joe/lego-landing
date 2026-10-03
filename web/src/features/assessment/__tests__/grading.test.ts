import { describe, expect, it } from 'vitest';

import {
  buildServedItems,
  gradeAttempt,
  gradeOne,
  normalizeText,
  seededShuffle,
} from '../domain/grading';
import type { AnswerKey, Question, Response, ServedItem } from '../domain/entities';

const q = (id: string, over: Partial<Question> = {}): Question =>
  ({
    id,
    bankId: 'b1',
    type: 'mcq_single',
    stem: id,
    payload: { kind: 'mcq_single', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], shuffle: false },
    points: 1,
    difficulty: 'easy',
    tags: [],
    createdAt: '', updatedAt: '', version: 1,
    ...over,
  }) as Question;

describe('single choice', () => {
  const key: AnswerKey = { kind: 'mcq_single', correctOptionId: 'b' };

  it('marks the right option correct', () => {
    expect(gradeOne({ kind: 'mcq_single', optionId: 'b' } as Response, key)).toEqual({ correct: true, ratio: 1 });
  });

  it('marks a wrong option incorrect', () => {
    expect(gradeOne({ kind: 'mcq_single', optionId: 'a' } as Response, key).correct).toBe(false);
  });

  it('treats a missing answer as wrong rather than crashing', () => {
    expect(gradeOne(undefined, key)).toEqual({ correct: false, ratio: 0 });
  });

  it('refuses a response of the wrong shape', () => {
    expect(gradeOne({ kind: 'numeric', value: 1 } as Response, key).correct).toBe(false);
  });
});

describe('multiple choice', () => {
  const strict: AnswerKey = { kind: 'mcq_multi', correctOptionIds: ['a', 'b'], partialCredit: false };
  const partial: AnswerKey = { kind: 'mcq_multi', correctOptionIds: ['a', 'b'], partialCredit: true };

  it('needs an exact match without partial credit', () => {
    expect(gradeOne({ kind: 'mcq_multi', optionIds: ['a', 'b'] } as Response, strict).ratio).toBe(1);
    expect(gradeOne({ kind: 'mcq_multi', optionIds: ['a'] } as Response, strict).ratio).toBe(0);
  });

  it('gives partial credit for a subset', () => {
    expect(gradeOne({ kind: 'mcq_multi', optionIds: ['a'] } as Response, partial).ratio).toBe(0.5);
  });

  /**
   * The reason partial credit subtracts wrong choices: otherwise selecting
   * everything is a guaranteed full mark.
   */
  it('scores zero for selecting everything', () => {
    const outcome = gradeOne(
      { kind: 'mcq_multi', optionIds: ['a', 'b', 'c', 'd'] } as Response,
      partial,
    );
    expect(outcome.ratio).toBe(0);
    expect(outcome.correct).toBe(false);
  });

  it('never goes negative', () => {
    expect(gradeOne({ kind: 'mcq_multi', optionIds: ['x', 'y', 'z'] } as Response, partial).ratio).toBe(0);
  });
});

describe('true / false', () => {
  it('compares the boolean', () => {
    const key: AnswerKey = { kind: 'true_false', correct: true };
    expect(gradeOne({ kind: 'true_false', value: true } as Response, key).correct).toBe(true);
    expect(gradeOne({ kind: 'true_false', value: false } as Response, key).correct).toBe(false);
  });
});

describe('short text', () => {
  const key: AnswerKey = { kind: 'short_text', accepted: ['prompt chaining'], caseSensitive: false };

  it('accepts a match regardless of case and surrounding space', () => {
    expect(gradeOne({ kind: 'short_text', text: '  Prompt   Chaining ' } as Response, key).correct).toBe(true);
  });

  it('accepts any listed alternative', () => {
    const multi: AnswerKey = { kind: 'short_text', accepted: ['rag', 'retrieval augmented generation'], caseSensitive: false };
    expect(gradeOne({ kind: 'short_text', text: 'RAG' } as Response, multi).correct).toBe(true);
    expect(gradeOne({ kind: 'short_text', text: 'Retrieval Augmented Generation' } as Response, multi).correct).toBe(true);
  });

  it('respects case sensitivity when asked', () => {
    const cased: AnswerKey = { kind: 'short_text', accepted: ['RAG'], caseSensitive: true };
    expect(gradeOne({ kind: 'short_text', text: 'rag' } as Response, cased).correct).toBe(false);
  });

  it('rejects something merely similar', () => {
    expect(gradeOne({ kind: 'short_text', text: 'prompt chains' } as Response, key).correct).toBe(false);
  });

  it('normalises unicode so a composed accent matches a decomposed one', () => {
    expect(normalizeText('café')).toBe(normalizeText('café'));
  });
});

describe('numeric', () => {
  const key: AnswerKey = { kind: 'numeric', answer: 0.7, tolerance: 0.05 };

  it('accepts within tolerance and rejects outside it', () => {
    expect(gradeOne({ kind: 'numeric', value: 0.72 } as Response, key).correct).toBe(true);
    expect(gradeOne({ kind: 'numeric', value: 0.9 } as Response, key).correct).toBe(false);
  });

  it('rejects a non-finite value rather than comparing NaN', () => {
    expect(gradeOne({ kind: 'numeric', value: Number.NaN } as Response, key).correct).toBe(false);
  });
});

describe('ordering', () => {
  const key: AnswerKey = { kind: 'order', correctOrder: ['a', 'b', 'c'] };

  it('awards full marks for the right order', () => {
    expect(gradeOne({ kind: 'order', order: ['a', 'b', 'c'] } as Response, key).ratio).toBe(1);
  });

  it('awards partial credit per item in place', () => {
    // 'a' is right, the other two are swapped.
    expect(gradeOne({ kind: 'order', order: ['a', 'c', 'b'] } as Response, key).ratio).toBeCloseTo(1 / 3);
  });

  it('rejects an order of the wrong length', () => {
    expect(gradeOne({ kind: 'order', order: ['a', 'b'] } as Response, key).ratio).toBe(0);
  });
});

describe('gradeAttempt', () => {
  const served: ServedItem[] = [
    { questionId: 'q1', type: 'mcq_single', points: 2 },
    { questionId: 'q2', type: 'true_false', points: 1 },
  ];
  const keys = new Map<string, AnswerKey>([
    ['q1', { kind: 'mcq_single', correctOptionId: 'b' }],
    ['q2', { kind: 'true_false', correct: true }],
  ]);

  it('totals points and computes a percentage', () => {
    const result = gradeAttempt(
      served,
      { q1: { kind: 'mcq_single', optionId: 'b' }, q2: { kind: 'true_false', value: false } },
      keys,
    );
    expect(result.score).toBe(2);
    expect(result.totalPoints).toBe(3);
    expect(result.percent).toBe(67);
  });

  it('counts an unanswered question against the total', () => {
    const result = gradeAttempt(served, {}, keys);
    expect(result.score).toBe(0);
    expect(result.totalPoints).toBe(3);
    expect(result.percent).toBe(0);
  });

  it('scores a question with a missing key as zero rather than full marks', () => {
    const result = gradeAttempt(served, { q1: { kind: 'mcq_single', optionId: 'b' } }, new Map());
    expect(result.score).toBe(0);
    expect(result.graded).toHaveLength(2);
  });

  it('attaches the explanation when one exists', () => {
    const result = gradeAttempt(
      served,
      { q1: { kind: 'mcq_single', optionId: 'a' } },
      keys,
      new Map([['q1', 'because b chains the prompts']]),
    );
    expect(result.graded[0]?.explanation).toBe('because b chains the prompts');
  });
});

describe('deterministic shuffling', () => {
  it('is stable for a given seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });

  it('differs across seeds', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(seededShuffle(items, 1)).not.toEqual(seededShuffle(items, 2));
  });

  it('is a permutation, losing and duplicating nothing', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    expect([...seededShuffle(items, 9)].sort()).toEqual(items);
  });

  it('does not mutate its input', () => {
    const items = ['a', 'b', 'c'];
    seededShuffle(items, 3);
    expect(items).toEqual(['a', 'b', 'c']);
  });
});

describe('buildServedItems', () => {
  it('freezes option order so review matches the attempt', () => {
    const items = buildServedItems([q('q1', { payload: { kind: 'mcq_single', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], shuffle: true } })], {
      shuffleQuestions: false,
      seed: 7,
    });
    expect(items[0]?.optionOrder).toHaveLength(2);
    expect([...(items[0]?.optionOrder ?? [])].sort()).toEqual(['a', 'b']);
  });

  it('always shuffles an ordering question, since the stored order is the answer', () => {
    const question = q('q1', {
      type: 'order',
      payload: { kind: 'order', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] },
    });
    const items = buildServedItems([question], { shuffleQuestions: false, seed: 5 });
    expect([...(items[0]?.optionOrder ?? [])].sort()).toEqual(['a', 'b', 'c']);
  });

  it('carries each question\'s points onto the frozen item', () => {
    const items = buildServedItems([q('q1', { points: 3 }), q('q2', { points: 2 })], {
      shuffleQuestions: false,
      seed: 1,
    });
    expect(items.map((i) => i.points)).toEqual([3, 2]);
  });
});
