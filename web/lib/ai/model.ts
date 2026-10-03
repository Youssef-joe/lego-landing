import { createOpenAI } from '@ai-sdk/openai';

export const FREE_MODEL_ROUTER = 'openrouter/free';

/** OpenRouter is used only for its free hosted model pool. */
export function getBuilderModel() {
  const provider = (process.env['BRICO_AI_PROVIDER'] ?? 'openrouter').toLowerCase();
  if (provider !== 'openrouter') throw new Error('Only the OpenRouter free provider is supported.');

  const model = process.env['BRICO_AI_MODEL'] ?? FREE_MODEL_ROUTER;
  if (model !== FREE_MODEL_ROUTER && !model.endsWith(':free')) {
    throw new Error(`Paid model blocked: ${model}. Use ${FREE_MODEL_ROUTER} or a model ending in :free.`);
  }

  const openrouter = createOpenAI({
    apiKey: process.env['OPENROUTER_API_KEY'],
    baseURL: 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': process.env['BRICO_APP_URL'] ?? 'http://localhost:3000',
      'X-Title': 'BRICO Workbench',
    },
  });
  return openrouter(model);
}

export function assertBuilderConfiguration() {
  const provider = (process.env['BRICO_AI_PROVIDER'] ?? 'openrouter').toLowerCase();
  if (provider !== 'openrouter') throw new Error('BRICO_AI_PROVIDER must be openrouter.');
  if (!process.env['OPENROUTER_API_KEY']) throw new Error('Missing OPENROUTER_API_KEY.');
}
