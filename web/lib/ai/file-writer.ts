import fs from 'fs/promises';
import path from 'path';
import { GeneratedFile, HarnessError, parseGeneratedFiles, validateGeneratedFiles } from './builder-harness';

export function isReadOnlyFsError(e: any) {
  // Serverless filesystems (e.g. Vercel /var/task) reject writes. When the
  // disk is read-only the caller should return the files instead of failing.
  return e && typeof e.code === 'string' &&
    ['EROFS', 'EACCES', 'EPERM', 'ENOSPC', 'ENOENT'].includes(e.code);
}

export async function writeModuleFiles(files: { path: string, content: string }[]): Promise<number> {
  const safeFiles = validateGeneratedFiles(files);
  if (process.env['BRICO_BUILDER_ALLOW_OVERWRITE'] !== 'true') {
    const existing = [];
    for (const file of safeFiles) {
      try {
        await fs.access(path.resolve(process.cwd(), file.path));
        existing.push(file.path);
      } catch {
        // New file.
      }
    }
    if (existing.length > 0) {
      throw new HarnessError(existing.map((filePath) => ({
        rule: 'OVERWRITE',
        path: filePath,
        message: 'Existing feature files are protected. Set BRICO_BUILDER_ALLOW_OVERWRITE=true for an explicit update.',
      })));
    }
  }
  let writtenCount = 0;

  for (const file of safeFiles) {
    const absolutePath = path.resolve(process.cwd(), file.path);
    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    const temporaryPath = `${absolutePath}.brico-tmp-${process.pid}`;
    await fs.writeFile(temporaryPath, `${file.content}\n`, 'utf-8');
    await fs.rename(temporaryPath, absolutePath);
    console.log(`[AI Builder] Saved ${file.path}`);
    writtenCount++;
  }
  return writtenCount;
}

export async function parseAndWriteFiles(text: string) {
  const files: GeneratedFile[] = parseGeneratedFiles(text);
  return writeModuleFiles(files);
}
