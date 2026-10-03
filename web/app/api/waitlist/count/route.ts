import { countSignups } from '@/lib/waitlist/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json({ count: await countSignups() });
  } catch (e) {
    console.error('[waitlist] count failed:', e);
    return Response.json({ error: 'Unavailable.' }, { status: 503 });
  }
}
