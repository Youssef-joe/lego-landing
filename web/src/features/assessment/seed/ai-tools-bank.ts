/**
 * Question bank and assessments for the "AI Tools & Automations" course.
 *
 * Each question is a pair: the learner-visible half and the answer key, which
 * live in different collections. They are declared together here so a question
 * and its key cannot drift, and split by the seeding code.
 *
 * Every question carries an explanation, because the practices are where the
 * teaching happens and an unexplained "wrong" teaches nothing.
 */

import type { AnswerKey, Assessment, Question } from '../domain/entities';

export interface SeedQuestion {
  question: Omit<Question, 'createdAt' | 'updatedAt' | 'version'>;
  key: AnswerKey;
}

const BANK = 'bank_ai_tools';

export const AI_TOOLS_QUESTIONS: SeedQuestion[] = [
  /* ------------------------------------------------------------ foundations */
  {
    question: {
      id: 'q_next_token',
      bankId: BANK,
      type: 'mcq_single',
      stem: 'At its core, what is a language model doing when it answers you?',
      payload: {
        kind: 'mcq_single',
        shuffle: true,
        options: [
          { id: 'a', label: 'Looking the answer up in a database of facts' },
          { id: 'b', label: 'Predicting a likely continuation of the text so far' },
          { id: 'c', label: 'Running a search engine query behind the scenes' },
          { id: 'd', label: 'Executing rules written by its authors' },
        ],
      },
      points: 2,
      difficulty: 'easy',
      tags: ['foundations'],
      explanation:
        'It predicts a likely continuation. That is why it is fluent, and also why it can be ' +
        'confidently wrong: a plausible continuation is not the same thing as a true one.',
    },
    key: { kind: 'mcq_single', correctOptionId: 'b' },
  },
  {
    question: {
      id: 'q_prompt_parts',
      bankId: BANK,
      type: 'mcq_multi',
      stem: 'Which of these make a prompt more robust across different inputs?',
      payload: {
        kind: 'mcq_multi',
        shuffle: true,
        options: [
          { id: 'a', label: 'Stating the output format explicitly' },
          { id: 'b', label: 'Telling it what to do when the task does not apply' },
          { id: 'c', label: 'Asking it to "be creative"' },
          { id: 'd', label: 'Providing the material to work from' },
        ],
      },
      points: 3,
      difficulty: 'medium',
      tags: ['foundations', 'prompting'],
      explanation:
        'Format, material and an escape hatch all constrain what a plausible answer looks like. ' +
        '"Be creative" constrains nothing, so it mostly adds variance.',
    },
    key: { kind: 'mcq_multi', correctOptionIds: ['a', 'b', 'd'], partialCredit: true },
  },
  {
    question: {
      id: 'q_temperature_tf',
      bankId: BANK,
      type: 'true_false',
      stem: 'Given the same prompt and settings, a language model always returns exactly the same text.',
      payload: { kind: 'true_false' },
      points: 1,
      difficulty: 'easy',
      tags: ['foundations'],
      explanation:
        'False in general. Sampling introduces randomness, and only at a temperature of zero does ' +
        'output become close to deterministic — and even then providers make no strict guarantee.',
    },
    key: { kind: 'true_false', correct: false },
  },
  {
    question: {
      id: 'q_escape_hatch',
      bankId: BANK,
      type: 'short_text',
      stem:
        'What do you call the instruction that tells a model what to do when the task does not apply ' +
        'to the input — for example, "if the document contains no dates, say so"? (two words)',
      payload: { kind: 'short_text', placeholder: 'e.g. two words' },
      points: 2,
      difficulty: 'medium',
      tags: ['foundations', 'prompting'],
      explanation:
        'An escape hatch. Without one, a model asked for dates will invent dates rather than report ' +
        'that there were none.',
    },
    key: { kind: 'short_text', accepted: ['escape hatch', 'escape-hatch'], caseSensitive: false },
  },

  /* -------------------------------------------------------------- grounding */
  {
    question: {
      id: 'q_rag_meaning',
      bankId: BANK,
      type: 'mcq_single',
      stem: 'What does retrieval-augmented generation add to a plain model call?',
      payload: {
        kind: 'mcq_single',
        shuffle: true,
        options: [
          { id: 'a', label: 'It retrieves relevant material and puts it in the prompt' },
          { id: 'b', label: 'It retrains the model on your documents each time' },
          { id: 'c', label: 'It makes the model run faster' },
          { id: 'd', label: 'It removes the need to evaluate the output' },
        ],
      },
      points: 2,
      difficulty: 'easy',
      tags: ['grounding', 'rag'],
      explanation:
        'Retrieval happens at question time and changes the prompt, not the model. Nothing is retrained.',
    },
    key: { kind: 'mcq_single', correctOptionId: 'a' },
  },
  {
    question: {
      id: 'q_rag_order',
      bankId: BANK,
      type: 'order',
      stem: 'Put the steps of a retrieval pipeline in order.',
      payload: {
        kind: 'order',
        items: [
          { id: 'chunk', label: 'Split the documents into chunks' },
          { id: 'embed', label: 'Embed the chunks and store the vectors' },
          { id: 'query', label: 'Embed the incoming question' },
          { id: 'retrieve', label: 'Retrieve the nearest chunks' },
          { id: 'generate', label: 'Put them in the prompt and generate' },
        ],
      },
      points: 3,
      difficulty: 'medium',
      tags: ['grounding', 'rag'],
      explanation:
        'Chunk, embed and store happen ahead of time; embedding the question, retrieving and ' +
        'generating happen per request.',
    },
    key: { kind: 'order', correctOrder: ['chunk', 'embed', 'query', 'retrieve', 'generate'] },
  },
  {
    question: {
      id: 'q_chunking',
      bankId: BANK,
      type: 'mcq_single',
      stem: 'A retrieval system returns technically relevant chunks, but answers keep missing context. What is the most likely cause?',
      payload: {
        kind: 'mcq_single',
        shuffle: true,
        options: [
          { id: 'a', label: 'The chunks are too small and cut across ideas' },
          { id: 'b', label: 'The model temperature is too low' },
          { id: 'c', label: 'There are too few documents indexed' },
          { id: 'd', label: 'The embeddings are stored in the wrong order' },
        ],
      },
      points: 3,
      difficulty: 'hard',
      tags: ['grounding', 'rag'],
      explanation:
        'Chunking is the step that quietly ruins retrieval quality. Chunks that split an idea in half ' +
        'match the query but carry only part of the answer.',
    },
    key: { kind: 'mcq_single', correctOptionId: 'a' },
  },
  {
    question: {
      id: 'q_citation_tf',
      bankId: BANK,
      type: 'true_false',
      stem: 'Grounding an answer in retrieved sources removes the need to check it.',
      payload: { kind: 'true_false' },
      points: 1,
      difficulty: 'easy',
      tags: ['grounding'],
      explanation:
        'False. Grounding makes a wrong answer traceable rather than mysterious; it does not make it ' +
        'right. A model can still misread a source it was handed.',
    },
    key: { kind: 'true_false', correct: false },
  },

  /* ------------------------------------------------------------- automation */
  {
    question: {
      id: 'q_when_chain',
      bankId: BANK,
      type: 'mcq_single',
      stem: 'When is splitting a task into a chain of calls genuinely worth it?',
      payload: {
        kind: 'mcq_single',
        shuffle: true,
        options: [
          { id: 'a', label: 'When one call must do two incompatible things at once' },
          { id: 'b', label: 'Whenever the prompt is longer than a paragraph' },
          { id: 'c', label: 'To patch a prompt that gives inconsistent results' },
          { id: 'd', label: 'Because more steps generally means better quality' },
        ],
      },
      points: 3,
      difficulty: 'medium',
      tags: ['automation'],
      explanation:
        'Chaining helps when one call is being asked to both decide and act. Adding steps to patch a ' +
        'weak prompt just adds more places to fail.',
    },
    key: { kind: 'mcq_single', correctOptionId: 'a' },
  },
  {
    question: {
      id: 'q_tool_boundary',
      bankId: BANK,
      type: 'mcq_multi',
      stem: 'A model can call tools that write to your systems. What belongs at that boundary?',
      payload: {
        kind: 'mcq_multi',
        shuffle: true,
        options: [
          { id: 'a', label: 'Validation of the arguments' },
          { id: 'b', label: 'Permission checks' },
          { id: 'c', label: 'Logging of what was called' },
          { id: 'd', label: 'Trusting the model to have checked already' },
        ],
      },
      points: 3,
      difficulty: 'medium',
      tags: ['automation', 'safety'],
      explanation:
        'The tool boundary is the enforcement point. The model produces a request; your code decides ' +
        'whether it is allowed, whether it is well-formed, and records that it happened.',
    },
    key: { kind: 'mcq_multi', correctOptionIds: ['a', 'b', 'c'], partialCredit: true },
  },
  {
    question: {
      id: 'q_failure_response',
      bankId: BANK,
      type: 'mcq_single',
      stem: 'An automation drafts customer refunds. The model returns malformed output for one case. What is the right default?',
      payload: {
        kind: 'mcq_single',
        shuffle: true,
        options: [
          { id: 'a', label: 'Stop and route that case to a human' },
          { id: 'b', label: 'Retry until it parses' },
          { id: 'c', label: 'Skip the case silently' },
          { id: 'd', label: 'Apply a default refund amount' },
        ],
      },
      points: 3,
      difficulty: 'hard',
      tags: ['automation', 'safety'],
      explanation:
        'Money moving unsupervised is exactly the case for human review. Retrying can help transient ' +
        'errors, but it must be bounded and must not end in a silent skip or a guessed amount.',
    },
    key: { kind: 'mcq_single', correctOptionId: 'a' },
  },
  {
    question: {
      id: 'q_review_threshold',
      bankId: BANK,
      type: 'numeric',
      stem:
        'An automation is correct on 92 of 100 sampled outputs. Express its measured accuracy as a ' +
        'decimal between 0 and 1.',
      payload: { kind: 'numeric' },
      points: 1,
      difficulty: 'easy',
      tags: ['automation'],
      explanation:
        '0.92 — and worth remembering that a sample of 100 leaves real uncertainty around that number.',
    },
    key: { kind: 'numeric', answer: 0.92, tolerance: 0.005 },
  },
];

/**
 * Three graded quizzes and three practices over the same bank.
 *
 * The practices draw from the same questions deliberately: a learner should be
 * rehearsing the thing they will be measured on, graded by the same code.
 */
export const AI_TOOLS_ASSESSMENTS: Omit<Assessment, 'createdAt' | 'updatedAt' | 'version'>[] = [
  {
    id: 'as_foundations_quiz',
    ownerRef: 'lms:lesson:l_quiz_foundations',
    mode: 'quiz',
    title: 'Quiz: foundations',
    selection: { mode: 'fixed', questionIds: ['q_next_token', 'q_prompt_parts', 'q_temperature_tf', 'q_escape_hatch'] },
    policy: { maxAttempts: 3, scoring: 'best', shuffleQuestions: true, feedback: 'after_attempt', passPercent: 70 },
    totalPoints: 8,
    active: true,
  },
  {
    id: 'as_foundations_practice',
    ownerRef: 'lms:lesson:l_practice_prompting',
    mode: 'practice',
    title: 'Practice: foundations',
    description: 'Unlimited attempts, answers explained as you go.',
    selection: { mode: 'random', bankId: BANK, count: 3, tags: ['foundations'] },
    policy: { maxAttempts: 0, scoring: 'last', shuffleQuestions: true, feedback: 'immediate', passPercent: 0 },
    totalPoints: 0,
    active: true,
  },
  {
    id: 'as_grounding_quiz',
    ownerRef: 'lms:lesson:l_quiz_grounding',
    mode: 'quiz',
    title: 'Quiz: grounding',
    selection: { mode: 'fixed', questionIds: ['q_rag_meaning', 'q_rag_order', 'q_chunking', 'q_citation_tf'] },
    policy: { maxAttempts: 3, scoring: 'best', shuffleQuestions: true, feedback: 'after_attempt', passPercent: 70 },
    totalPoints: 9,
    active: true,
  },
  {
    id: 'as_grounding_practice',
    ownerRef: 'lms:lesson:l_practice_grounding',
    mode: 'practice',
    title: 'Practice: grounding',
    selection: { mode: 'random', bankId: BANK, count: 3, tags: ['grounding'] },
    policy: { maxAttempts: 0, scoring: 'last', shuffleQuestions: true, feedback: 'immediate', passPercent: 0 },
    totalPoints: 0,
    active: true,
  },
  {
    id: 'as_final_quiz',
    ownerRef: 'lms:lesson:l_quiz_final',
    mode: 'quiz',
    title: 'Final quiz',
    description: 'Drawn from the whole course. Timed.',
    selection: { mode: 'random', bankId: BANK, count: 8 },
    policy: {
      maxAttempts: 2,
      scoring: 'best',
      timeLimitSec: 900,
      shuffleQuestions: true,
      feedback: 'after_attempt',
      passPercent: 75,
    },
    totalPoints: 0,
    active: true,
  },
  {
    id: 'as_automation_practice',
    ownerRef: 'lms:lesson:l_failure_modes',
    mode: 'practice',
    title: 'Practice: automation safety',
    selection: { mode: 'random', bankId: BANK, count: 4, tags: ['automation', 'safety'] },
    policy: { maxAttempts: 0, scoring: 'last', shuffleQuestions: true, feedback: 'immediate', passPercent: 0 },
    totalPoints: 0,
    active: true,
  },
];

export const AI_TOOLS_BANK_ID = BANK;
