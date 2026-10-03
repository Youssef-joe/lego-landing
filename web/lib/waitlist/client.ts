export async function submitWaitlist(input: {
  email: string;
  company?: string;
  source?: string;
}): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error || 'Something went wrong.' };
    return { ok: true, already: Boolean(data?.already) };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and retry.' };
  }
}
