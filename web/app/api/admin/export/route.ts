import { isAdminRequest } from '@/lib/waitlist/admin-auth';
import { listSignups } from '@/lib/waitlist/store';

export const dynamic = 'force-dynamic';

function csvCell(value: string) {
  const v = value ?? '';
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  try {
    const signups = await listSignups();
    const rows = ['email,company,source,created_at'];
    for (const s of signups) {
      rows.push(
        [s.email, s.company ?? '', s.source ?? '', s.createdAt]
          .map(csvCell)
          .join(','),
      );
    }
    return new Response(rows.join('\n') + '\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="bricowerx-waitlist.csv"',
      },
    });
  } catch (e) {
    console.error('[waitlist] admin export failed:', e);
    return Response.json({ error: 'Could not export signups.' }, { status: 503 });
  }
}
