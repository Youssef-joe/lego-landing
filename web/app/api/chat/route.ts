import { streamText } from 'ai';
import { getSystemPrompt } from '../../../lib/ai/system-prompt';
import { assertBuilderConfiguration, getBuilderModel } from '../../../lib/ai/model';
import { guardBuilderRequest } from '../../../lib/ai/request-guard';

// Hobby serverless ceiling is 60s; longer values fail the deployment.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const denied = guardBuilderRequest(req);
    if (denied) return denied;
    assertBuilderConfiguration();
    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length > 40) {
      return Response.json({ error: 'Invalid conversation.' }, { status: 400 });
    }
    const safeMessages = messages.filter((message) =>
      message && (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' && message.content.length <= 20_000,
    );
    if (safeMessages.length === 0) return Response.json({ error: 'Conversation is empty.' }, { status: 400 });

    const system = await getSystemPrompt();

    const result = await streamText({
      model: getBuilderModel(),
      system,
      messages: safeMessages,
      maxTokens: 4_000,
    });

    return result.toAIStreamResponse();
  } catch (error) {
    console.error('[AI Builder] Chat error:', error);
    return Response.json({ error: 'The AI service is unavailable.' }, { status: 503 });
  }
}
