'use client';

import { useEffect, useRef } from 'react';

type Props = {
  email: string;
  open: boolean;
  onClose: () => void;
};

/** Your email becomes a brick that drops into the Vault. Pure CSS motion. */
export default function SignupSuccessModal({ email, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="joy-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="You're on the waitlist"
      onClick={onClose}
    >
      <div className="joy-card" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="joy-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="joy-scene" aria-hidden="true">
          <div className="joy-slot" />
          <div className="joy-brick" />
          <span className="joy-ring" />
          <span className="joy-check">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </div>

        <p className="joy-kicker">Brick secured in the Vault</p>
        <h2 className="joy-title">You&apos;re on the list</h2>
        <p className="joy-email">{email}</p>
        <p className="joy-sub">
          One email when the Vault opens, one when the binary is yours. No spam, ever.
        </p>
        <div className="joy-chips">
          <span className="chip">First binary</span>
          <span className="chip">Founding badge</span>
          <span className="chip">A vote on what ships next</span>
        </div>
        <button type="button" className="btn-fill joy-cta" onClick={onClose}>
          Back to the page
        </button>
      </div>
    </div>
  );
}
