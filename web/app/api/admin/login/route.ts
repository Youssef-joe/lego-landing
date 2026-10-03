import {
  adminConfigured,
  adminSessionCookie,
  verifyAdminToken,
} from '@/lib/waitlist/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return Response.json({ error: 'Admin access is not configured.' }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!verifyAdminToken(token)) {
    // Same cost either way; no user enumeration here, just a token gate.
    return Response.json({ error: 'Wrong token.' }, { status: 401 });
  }
  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': adminSessionCookie() } },
  );
}
