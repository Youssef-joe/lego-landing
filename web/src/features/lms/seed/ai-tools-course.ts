/**
 * A real course, used as seed data: "AI Tools & Automations".
 *
 * Deliberately shaped to exercise the parts of the LMS that are easy to get
 * wrong rather than to look impressive: mixed lesson types, optional lessons
 * that must not count toward completion, an assessment gate on the final
 * lesson, and a practice alongside each graded quiz.
 *
 * Plain data with no imports beyond types, so it can be loaded by a seed script,
 * a test, or a host's admin action without dragging anything along.
 */

import type { CurriculumSection } from '../domain/entities';

export const AI_TOOLS_COURSE = {
  slug: 'ai-tools-and-automations',
  title: 'AI Tools & Automations',
  subtitle: 'Put language models to work in real workflows',
  description:
    'A practical introduction to using AI tools in day-to-day work: writing prompts that hold up, ' +
    'grounding answers in your own documents, chaining steps into an automation, and knowing where ' +
    'a model should not be trusted. Every section pairs a short lesson with a practice you can retry ' +
    'as often as you like, and closes with a graded quiz.',
  level: 'beginner' as const,
  language: 'en',
  tags: ['ai', 'automation', 'prompting', 'productivity'],
  completionRule: { kind: 'all_required' as const, requireAssessmentsPassed: true },
};

/**
 * The structure. Lesson ids are stable strings rather than generated, because
 * they are the key the progress bitmap migrates by — a regenerated id would
 * look like a deleted lesson to every enrolled learner.
 */
export const AI_TOOLS_SECTIONS: CurriculumSection[] = [
  {
    id: 'sec_foundations',
    title: 'Foundations',
    lessons: [
      {
        id: 'l_what_llms_do',
        title: 'What a language model actually does',
        type: 'text',
        durationSec: 420,
        required: true,
        previewable: true,
      },
      {
        id: 'l_prompt_anatomy',
        title: 'The anatomy of a prompt that holds up',
        type: 'video',
        durationSec: 540,
        required: true,
        previewable: true,
      },
      {
        id: 'l_practice_prompting',
        title: 'Practice: rewrite a vague prompt',
        type: 'text',
        durationSec: 300,
        required: false, // practice teaches; the quiz measures
        previewable: false,
      },
      {
        id: 'l_quiz_foundations',
        title: 'Quiz: foundations',
        type: 'text',
        durationSec: 300,
        required: true,
        previewable: false,
        assessmentId: 'as_foundations_quiz',
      },
    ],
  },
  {
    id: 'sec_grounding',
    title: 'Grounding answers in your own material',
    lessons: [
      {
        id: 'l_why_grounding',
        title: 'Why a model invents things, and what to do about it',
        type: 'text',
        durationSec: 480,
        required: true,
        previewable: false,
      },
      {
        id: 'l_rag_walkthrough',
        title: 'Retrieval-augmented generation, end to end',
        type: 'video',
        durationSec: 720,
        required: true,
        previewable: false,
      },
      {
        id: 'l_practice_grounding',
        title: 'Practice: spot the ungrounded claim',
        type: 'text',
        durationSec: 360,
        required: false,
        previewable: false,
      },
      {
        id: 'l_quiz_grounding',
        title: 'Quiz: grounding',
        type: 'text',
        durationSec: 300,
        required: true,
        previewable: false,
        assessmentId: 'as_grounding_quiz',
      },
    ],
  },
  {
    id: 'sec_automation',
    title: 'Chaining steps into an automation',
    lessons: [
      {
        id: 'l_chaining',
        title: 'Chaining: when one call is not enough',
        type: 'text',
        durationSec: 480,
        required: true,
        previewable: false,
      },
      {
        id: 'l_tools_and_functions',
        title: 'Giving a model tools to call',
        type: 'video',
        durationSec: 660,
        required: true,
        previewable: false,
      },
      {
        id: 'l_failure_modes',
        title: 'Failure modes, retries and human review',
        type: 'text',
        durationSec: 420,
        required: true,
        previewable: false,
      },
      {
        id: 'l_reference_checklist',
        title: 'Reference: an automation review checklist',
        type: 'file',
        durationSec: 120,
        required: false,
        previewable: false,
      },
      {
        id: 'l_quiz_final',
        title: 'Final quiz',
        type: 'text',
        durationSec: 600,
        required: true,
        previewable: false,
        assessmentId: 'as_final_quiz',
      },
    ],
  },
];

/** Lesson bodies, keyed by lesson id. Kept out of the curriculum document. */
export const AI_TOOLS_CONTENT: Record<string, { body?: string; embedUrl?: string }> = {
  l_what_llms_do: {
    body:
      'A language model predicts the next token given everything before it. That single fact explains ' +
      'most of its behaviour: it is fluent because fluency is what the training data rewards, and it ' +
      'is confidently wrong for the same reason — a plausible continuation is not a true one.\n\n' +
      'Practically, this means you get better results by constraining what a plausible continuation ' +
      'looks like: give it the material, give it the format, and give it permission to say it does ' +
      'not know.',
  },
  l_prompt_anatomy: {
    body:
      'A prompt that holds up across inputs usually has four parts: the role or task, the material to ' +
      'work from, the constraints on the output, and an escape hatch for the cases the task does not ' +
      'cover. The escape hatch is the part people leave out, and it is the reason a prompt that worked ' +
      'on ten examples fails on the eleventh.',
  },
  l_practice_prompting: {
    body:
      'Take the prompt "summarise this" and rewrite it so that it would produce the same shape of ' +
      'answer for a one-page memo and a forty-page report. Then check yourself against the practice ' +
      'questions.',
  },
  l_why_grounding: {
    body:
      'When a model has no source for a claim, it produces the most plausible-sounding one. Grounding ' +
      'replaces that guess with retrieved material, and — just as importantly — gives you something to ' +
      'cite, so a wrong answer is traceable rather than mysterious.',
  },
  l_rag_walkthrough: {
    body:
      'Retrieval-augmented generation: split your documents into chunks, embed them, store the vectors, ' +
      'embed the question, retrieve the nearest chunks, and put them in the prompt. Each of those steps ' +
      'has a failure mode, and chunking is the one that quietly ruins results.',
  },
  l_chaining: {
    body:
      'Chaining splits a task into steps whose outputs feed the next. It helps when a single call has ' +
      'to do two incompatible things — for example, decide what to do and then do it. It hurts when ' +
      'you add steps that only exist to patch a weak prompt, because every step is another place to fail.',
  },
  l_tools_and_functions: {
    body:
      'Giving a model tools turns it from something that writes about an action into something that ' +
      'takes one. That is exactly as risky as it sounds, which is why the tool boundary is where you ' +
      'put validation, permissions and logging.',
  },
  l_failure_modes: {
    body:
      'Automations fail in ways that are boring and predictable: a rate limit, a malformed response, a ' +
      'context window overrun, a tool that returns something unexpected. Decide in advance which ' +
      'failures retry, which fall back, and which stop and ask a human.',
  },
  l_reference_checklist: {
    body:
      'Before shipping an automation: what does it do when the model is unavailable? What is the worst ' +
      'action it can take unsupervised? Who sees the output before anyone acts on it? What does it log? ' +
      'How would you notice if its quality degraded?',
  },
};
