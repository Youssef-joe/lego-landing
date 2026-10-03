import { isAdminRequest } from '@/lib/waitlist/admin-auth';
import { listSignups, storageKind } from '@/lib/waitlist/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const signups = await listSignups();
    return Response.json({ signups, count: signups.length, storage: storageKind() });
  } catch (e) {
    console.error('[waitlist] admin list failed:', e);
    return Response.json({ error: 'Could not load signups.' }, { status: 503 });
  }
}
