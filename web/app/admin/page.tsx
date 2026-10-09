'use client';

import { useCallback, useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

type Signup = {
  email: string;
  company?: string;
  source?: string;
  createdAt: string;
};

type Report = {
  id: string;
  createdAt: string;
  kind: string;
  email: string;
  message: string;
  person?: string;
  context?: { page?: string; brick?: string; buildId?: string; buildStatus?: string; turns?: number; lastError?: string };
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [token, setToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [signups, setSignups] = useState<Signup[]>([]);
  const [storage, setStorage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsError, setReportsError] = useState('');

  const loadReports = useCallback(async () => {
    setReportsError('');
    try {
      const res = await fetch('/api/admin/feedback');
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Could not load Builder feedback.');
      setReports(data.reports ?? []);
    } catch (e: any) {
      setReportsError(e?.message || 'Could not load Builder feedback.');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/signups');
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAuthed(false);
          return;
        }
        throw new Error(data?.error || 'Could not load signups.');
      }
      setSignups(data.signups ?? []);
      setStorage(data.storage ?? '');
      setAuthed(true);
      loadReports();
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load signups.');
    } finally {
      setLoading(false);
    }
  }, [loadReports]);

  useEffect(() => {
    load();
  }, [load]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setLoginError(data?.error || 'Login failed.');
        return;
      }
      setToken('');
      await load();
    } catch {
      setLoginError('Login failed. Try again.');
    }
  };

  const onLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setSignups([]);
    setReports([]);
  };

  return (
    <main className="adm-wrap">
      <div className="container">
        <p className="adm-kicker">BricoWerx · private</p>
        <h1 className="adm-title">Waitlist admin</h1>

        {authed === null && <p className="adm-muted">Checking session…</p>}

        {authed === false && (
          <form className="adm-card" onSubmit={onLogin}>
            <label htmlFor="adm-token">Admin token</label>
            <input
              id="adm-token"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••"
            />
            {loginError && <p className="adm-error">{loginError}</p>}
            <button type="submit" className="btn-fill">Unlock</button>
          </form>
        )}

        {authed === true && (
          <>
            <div className="adm-bar">
              <span className="chip">
                {signups.length} signup{signups.length === 1 ? '' : 's'}
                {storage ? ` · ${storage}` : ''}
              </span>
              <span className="adm-actions">
                <a className="btn-fill" href="/api/admin/export">Download CSV</a>
                <button type="button" className="adm-ghost" onClick={onLogout}>Log out</button>
              </span>
            </div>
            {loading && <p className="adm-muted">Loading…</p>}
            {loadError && <p className="adm-error">{loadError}</p>}
            {!loading && signups.length === 0 && !loadError && (
              <p className="adm-muted">No signups yet.</p>
            )}
            {signups.length > 0 && (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Company</th>
                      <th>Source</th>
                      <th>Signed up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signups.map((s) => (
                      <tr key={s.email}>
                        <td className="adm-email">{s.email}</td>
                        <td>{s.company || '—'}</td>
                        <td>{s.source || '—'}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="adm-subtitle">Builder feedback</h2>
            <div className="adm-bar">
              <span className="chip">
                {reports.length} report{reports.length === 1 ? '' : 's'} · builder.bricowerx.com
              </span>
              <button type="button" className="adm-ghost" onClick={loadReports}>Refresh</button>
            </div>
            {reportsError && <p className="adm-error">{reportsError}</p>}
            {!reportsError && reports.length === 0 && <p className="adm-muted">No reports yet.</p>}
            {reports.length > 0 && (
              <ul className="adm-reports">
                {reports.map((r) => {
                  const c = r.context ?? {};
                  const where = [
                    c.page,
                    c.brick && `brick ${c.brick}`,
                    c.buildId && `build ${c.buildId}${c.buildStatus ? ` (${c.buildStatus})` : ''}`,
                    c.turns != null && `${c.turns} turns`,
                  ].filter(Boolean).join(' · ');
                  return (
                    <li key={r.id} className="adm-report">
                      <div className="adm-report-head">
                        <span className="chip">{r.kind}</span>
                        <a className="adm-email" href={`mailto:${r.email}`}>{r.email}</a>
                        {r.person && <span className="adm-muted">{r.person}</span>}
                        <span className="adm-muted adm-report-date">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="adm-report-msg">{r.message}</p>
                      {where && <p className="adm-muted adm-report-meta">{where}</p>}
                      {c.lastError && <p className="adm-error adm-report-meta">Last error: {c.lastError}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
