import { timingSafeEqual } from 'node:crypto';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requests = new Map<string, { startedAt: number; count: number }>();

function sameSecret(actual: string, expected: string): boolean {
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function guardBuilderRequest(request: Request): Response | undefined {
  const expectedKey = process.env['BRICO_BUILDER_ACCESS_KEY'];
  if (expectedKey && !sameSecret(request.headers.get('x-brico-builder-key') ?? '', expectedKey)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const identity = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  const now = Date.now();
  const current = requests.get(identity);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requests.set(identity, { startedAt: now, count: 1 });
    return undefined;
  }
  current.count += 1;
  if (current.count > MAX_REQUESTS_PER_WINDOW) {
    return Response.json({ error: 'Too many requests. Try again shortly.' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000)) },
    });
  }
  return undefined;
}
