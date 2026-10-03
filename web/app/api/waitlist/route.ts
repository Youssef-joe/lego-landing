import { addSignup, countSignups, isValidEmail } from '@/lib/waitlist/store';

export const dynamic = 'force-dynamic';

// Minimal per-instance guard; KV-backed deployments should add a proper
// distributed limiter if abuse appears.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { startedAt: number; count: number }>();

function rateLimited(ip: string) {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now - cur.startedAt >= WINDOW_MS) {
    hits.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  cur.count += 1;
  return cur.count > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    if (rateLimited(ip)) {
      return Response.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email : '';
    const company = typeof body?.company === 'string' ? body.company : undefined;
    const source = typeof body?.source === 'string' ? body.source : undefined;

    if (!email || !isValidEmail(email)) {
      return Response.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    const { already } = await addSignup({ email, company, source });
    const count = await countSignups();
    return Response.json({ ok: true, already, count });
  } catch (e) {
    console.error('[waitlist] signup failed:', e);
    return Response.json({ error: 'Could not save your email. Try again shortly.' }, { status: 503 });
  }
}
