import { generateText } from 'ai';
import fs from 'fs/promises';
import path from 'path';
import { isReadOnlyFsError, writeModuleFiles } from '../../../lib/ai/file-writer';
import { assertBuilderConfiguration, getBuilderModel } from '../../../lib/ai/model';
import { HarnessError, parseGeneratedFiles, validateGeneratedFiles } from '../../../lib/ai/builder-harness';
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
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return Response.json({ error: 'Invalid conversation.' }, { status: 400 });
    }

    const contractPath = path.join(process.cwd(), 'src', 'features', 'host-contract', 'contract.ts');
    let contractContent = '';
    try {
      contractContent = await fs.readFile(contractPath, 'utf-8');
    } catch (e) {
      console.error('Failed to read host contract', e);
      contractContent = '// Contract not found';
    }

    const system = `You are a strict code generation engine. The user and assistant have agreed on a feature architecture.
Your ONLY job is to output the exact code for the files requested based on the conversation history.

CRITICAL RULES:
1. DO NOT output conversational text.
2. DO NOT output markdown code blocks (\`\`\`).
3. You MUST use the exact format below for every single file you generate:

<<< FILE path/to/file.ts >>>
// file content here
<<< END_FILE >>>

4. All code MUST conform to this architecture contract:
${contractContent}

BEGIN GENERATION NOW.`;

    // Filter out the initial "Architect Terminal" system prompts from the chat if any
    const validMessages = messages.filter((m: any) =>
      m && (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' && m.content.length <= 20_000,
    );
    if (validMessages.length === 0) return Response.json({ error: 'Conversation is empty.' }, { status: 400 });
    
    // Mistral API requires the last message to be from a user
    validMessages.push({
      role: 'user',
      content: 'We have agreed on the design. Please generate the module code exactly as specified.'
    });

    console.log('[AI Builder] Starting background compilation...');

    const result = await generateText({
      model: getBuilderModel(),
      system,
      messages: validMessages,
      maxTokens: 16_000,
    });

    console.log('[AI Builder] Compilation finished, parsing files...');

    // Validate first: malformed output is a 422 either way.
    const files = validateGeneratedFiles(parseGeneratedFiles(result.text));

    try {
      const filesWritten = await writeModuleFiles(files);
      return Response.json({
        success: true,
        persisted: true,
        message: 'Deployed successfully',
        files: filesWritten,
      });
    } catch (e: any) {
      if (!isReadOnlyFsError(e)) throw e;
      // Serverless filesystems are read-only: hand the module back as
      // downloadable content instead of failing the build.
      console.log('[AI Builder] Read-only FS, returning files for download.');
      return Response.json({
        success: true,
        persisted: false,
        message: 'Generated successfully — download the files below (hosting is read-only).',
        files: files.map((f) => ({ path: f.path, content: f.content })),
      });
    }
  } catch (error: any) {
    console.error('[AI Builder] Build Error:', error);
    if (error instanceof HarnessError) return Response.json({ error: 'Generated module failed safety checks.', issues: error.issues }, { status: 422 });
    return Response.json({ error: 'Build failed. Check the server logs for details.' }, { status: 500 });
  }
}
