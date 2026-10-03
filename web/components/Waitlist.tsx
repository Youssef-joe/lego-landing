'use client';

import { useState, type FormEvent } from 'react';
import SignupSuccessModal from '@/components/SignupSuccessModal';
import { submitWaitlist } from '@/lib/waitlist/client';

export default function Waitlist() {
  const [invalid, setInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [celebrating, setCelebrating] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim();
    const company = String(new FormData(form).get('company') ?? '').trim();

    if (!email || !email.includes('@') || !email.includes('.')) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setSubmitting(true);
    setSubmitError('');

    const result = await submitWaitlist({ email, company, source: 'launch' });
    setSubmitting(false);
    if (result.ok) {
      setJoined(true);
      setCelebrating(email);
      form.reset();
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <>
      <section id="launch" className="section-gap">
        <div className="container">
          <div className="band-dark reveal waitlist-grid" style={{ alignItems: "center" } as React.CSSProperties}>
            <div>
              <h2 className="h2-sm">The Vault opens soon. Be in the first cohort.</h2>
              <p style={{ marginTop: "24px", fontSize: "18px", maxWidth: "40ch" } as React.CSSProperties}>We're finishing Phase A: summaries at capture, meaning-based search, and the MCP server.</p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "32px" } as React.CSSProperties}>
                <span className="chip">First binary</span>
                <span className="chip">Founding badge</span>
                <span className="chip">A vote on what ships next</span>
              </div>
            </div>
            <div className="card wl-card" style={{ color: "var(--ink)" } as React.CSSProperties}>
              <form className="wl-form" id="waitlist-form" noValidate onSubmit={onSubmit} style={{ display: joined ? "none" : undefined } as React.CSSProperties}>
                <div className={invalid ? "wl-field has-error" : "wl-field"}>
                  <label htmlFor="wl-email">Work email</label>
                  <input type="email" id="wl-email" name="email" required={true} placeholder="you@company.com" aria-describedby="email-error" aria-invalid={invalid} onChange={() => setInvalid(false)} />
                  <span className="wl-error" id="email-error">Please provide a valid work email address.</span>
                </div>
                <div className="wl-field">
                  <label htmlFor="wl-company">Company (optional)</label>
                  <input type="text" id="wl-company" name="company" autoComplete="organization" />
                </div>
                <button type="submit" className="btn-fill" style={{ marginTop: "8px" } as React.CSSProperties} id="wl-submit" disabled={submitting}>{submitting ? "Joining\u2026" : "Join the waitlist"}</button>
                {submitError && <p className="wl-error" style={{ display: "block" } as React.CSSProperties}>{submitError}</p>}
                <p className="wl-micro" style={{ textAlign: "center", marginTop: "8px" } as React.CSSProperties}>No spam. One email when we open, one when the binary is yours.</p>
              </form>
              <div id="wl-success" style={{ display: joined ? "block" : "none", textAlign: "center", padding: "24px 0" } as React.CSSProperties}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" } as React.CSSProperties}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <h3 style={{ marginBottom: "8px" } as React.CSSProperties}>You're on the list</h3>
                <p style={{ color: "var(--body)", fontSize: "15px" } as React.CSSProperties}>We'll be in touch soon.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <SignupSuccessModal email={celebrating} open={celebrating !== ''} onClose={() => setCelebrating('')} />
    </>
  );
}
