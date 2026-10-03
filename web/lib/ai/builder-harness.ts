import path from 'path';

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface HarnessIssue {
  path?: string;
  rule: string;
  message: string;
}

export class HarnessError extends Error {
  constructor(public readonly issues: HarnessIssue[]) {
    super(issues.map((issue) => `${issue.rule}: ${issue.message}`).join('\n'));
    this.name = 'HarnessError';
  }
}

const MAX_FILES = 80;
const MAX_FILE_BYTES = 250_000;
const MAX_TOTAL_BYTES = 2_000_000;

const SECRET_PATTERNS = [
  /(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{16,}/,
  /(?:AKIA|ASIA)[A-Z0-9]{16}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{12,}['"]/i,
];

function issue(rule: string, message: string, filePath?: string): HarnessIssue {
  return { rule, message, ...(filePath ? { path: filePath } : {}) };
}

function normalizeFilePath(input: string): string {
  const value = input.trim().replaceAll('\\', '/').replace(/^\/+/, '');
  if (value.startsWith('src/features/')) return value;
  return `src/features/${value}`;
}

function isInsideFeatures(filePath: string): boolean {
  const root = path.resolve(process.cwd(), 'src', 'features');
  const absolute = path.resolve(process.cwd(), filePath);
  const relative = path.relative(root, absolute);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function parseGeneratedFiles(text: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const pattern = /<<<\s*FILE\s+([^\n>]+?)\s*>>>([\s\S]*?)<<<\s*END_FILE\s*>>>/g;
  for (const match of text.matchAll(pattern)) {
    const filePath = match[1]?.trim();
    const content = match[2]?.replace(/^\s*\n/, '').trim();
    if (filePath && content !== undefined) files.push({ path: filePath, content });
  }
  return files;
}

export function validateGeneratedFiles(files: GeneratedFile[]): GeneratedFile[] {
  const issues: HarnessIssue[] = [];
  const normalized: GeneratedFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;

  if (files.length === 0) issues.push(issue('FORMAT', 'The model did not produce any FILE blocks.'));
  if (files.length > MAX_FILES) issues.push(issue('SIZE', `A module may contain at most ${MAX_FILES} files.`));

  for (const file of files) {
    const filePath = normalizeFilePath(file.path);
    const cleanPath = path.posix.normalize(filePath);
    const bytes = Buffer.byteLength(file.content, 'utf8');
    totalBytes += bytes;

    if (!isInsideFeatures(cleanPath) || cleanPath.includes('/../') || cleanPath.endsWith('/..')) {
      issues.push(issue('PATH', 'Generated paths must stay inside src/features.', file.path));
      continue;
    }
    if (seen.has(cleanPath)) {
      issues.push(issue('DUPLICATE', 'The same file was generated more than once.', cleanPath));
      continue;
    }
    seen.add(cleanPath);
    if (bytes > MAX_FILE_BYTES) issues.push(issue('SIZE', `File exceeds ${MAX_FILE_BYTES} bytes.`, cleanPath));
    if (/\/(?:node_modules|\.next|\.git)(?:\/|$)/.test(cleanPath) || /(?:^|\/)(?:\.env|\.env\.)/.test(cleanPath)) {
      issues.push(issue('PATH', 'Generated dependencies, build output, and environment files are forbidden.', cleanPath));
    }
    if (/(?:^|\/)app\//.test(cleanPath)) {
      issues.push(issue('PORTABILITY', 'Features cannot ship application routes; expose a runtime entrypoint instead.', cleanPath));
    }

    const content = file.content.replace(/^```[\w-]*\s*\n/, '').replace(/\n```\s*$/, '').trim();
    for (const secretPattern of SECRET_PATTERNS) {
      if (secretPattern.test(content)) {
        issues.push(issue('SECRET', 'Possible credential or private key detected in generated content.', cleanPath));
        break;
      }
    }

    const imports = content.matchAll(/(?:from\s+|import\s+|require\()\s*["']([^"']+)["']/g);
    for (const match of imports) {
      const specifier = match[1] ?? '';
      if (specifier.startsWith('@/') || specifier.startsWith('~/') || specifier.startsWith('/')) {
        issues.push(issue('IMPORT', `Aliased or absolute import is not portable: ${specifier}`, cleanPath));
      }
      if (specifier.startsWith('.') && path.posix.normalize(path.posix.join(path.posix.dirname(cleanPath), specifier)).split('/').includes('..')) {
        issues.push(issue('IMPORT', `Relative import escapes the feature: ${specifier}`, cleanPath));
      }
    }
    if (/\bimport\s*\(\s*(?!["'])/.test(content)) issues.push(issue('IMPORT', 'Dynamic imports must use literal specifiers.', cleanPath));
    if (/(?:const|let|var)\s*\{[^}]*\}\s*=\s*process\.env/.test(content)) {
      issues.push(issue('ENV', 'Use explicit process.env.NAME reads so dependencies remain discoverable.', cleanPath));
    }
    normalized.push({ path: cleanPath, content });
  }

  if (totalBytes > MAX_TOTAL_BYTES) issues.push(issue('SIZE', `Module exceeds ${MAX_TOTAL_BYTES} total bytes.`));
  const moduleNames = new Set(normalized.map((file) => file.path.split('/')[2]).filter(Boolean));
  if (moduleNames.size !== 1) issues.push(issue('STRUCTURE', 'All generated files must belong to exactly one feature directory.'));

  const generatedPaths = new Set(normalized.map((file) => file.path));
  for (const file of normalized) {
    const imports = file.content.matchAll(/(?:from\s+|import\s+|require\()\s*["']([^"']+)["']/g);
    for (const match of imports) {
      const specifier = match[1] ?? '';
      if (!specifier.startsWith('.')) continue;
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(file.path), specifier));
      const candidates = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '/index.ts', '/index.tsx'];
      if (!candidates.some((suffix) => generatedPaths.has(`${base}${suffix}`))) {
        issues.push(issue('IMPORT', `Relative import does not resolve inside the generated module: ${specifier}`, file.path));
      }
    }
  }

  if (issues.length) throw new HarnessError(issues);
  return normalized;
}
