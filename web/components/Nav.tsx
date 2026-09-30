'use client';

import { useEffect, useRef } from 'react';

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className="nav" id="nav" ref={navRef}>
        <div className="container nav-inner">
          <a href="#" className="nav-brand" aria-label="BricoWerx home">
            <svg className="brand-mark" width="30" height="30" aria-hidden="true" focusable="false"><use href="#bwx-mark" /></svg>
            <span>BricoWerx</span>
          </a>
          <nav className="nav-center" aria-label="Main navigation">
            <ul className="nav-links">
              <li><a href="#problem">For leaders</a></li>
              <li><a href="#how">How it works</a></li>
              <li><a href="#ai">For AI</a></li>
            </ul>
          </nav>
          <div className="nav-cta">
            <a href="#launch" className="btn-fill">Join the waitlist</a>
          </div>
        </div>
      </header>
    </>
  );
}
