import { clearSessionCookie } from '@/lib/waitlist/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  return Response.json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookie() } },
  );
}
