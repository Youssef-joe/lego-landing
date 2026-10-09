import { isAdminRequest } from '@/lib/waitlist/admin-auth';

export const dynamic = 'force-dynamic';

const BUILDER_URL = process.env['BRICO_BUILDER_URL'] || 'https://builder.bricowerx.com';

/** Builder problem reports, read server-side so the token never reaches the browser. */
export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const token = process.env['BRICO_FEEDBACK_TOKEN'];
  if (!token) {
    return Response.json({ error: 'BRICO_FEEDBACK_TOKEN is not set.' }, { status: 503 });
  }
  try {
    const res = await fetch(`${BUILDER_URL}/api/admin/feedback`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Builder answered ${res.status}`);
    const data = await res.json();
    return Response.json({ reports: data.reports ?? [], count: data.count ?? 0 });
  } catch (e) {
    console.error('[feedback] admin list failed:', e);
    return Response.json({ error: 'Could not load Builder feedback.' }, { status: 502 });
  }
}
