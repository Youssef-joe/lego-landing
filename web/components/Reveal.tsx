'use client';

import { useEffect } from 'react';

/**
 * Scroll-reveal and step-card stagger.
 *
 * The original page tagged reveal targets with a single document-wide query
 * rather than a class on every element, so this keeps that approach: one
 * client component mounted once, observing the whole document. That leaves the
 * section markup as plain server-rendered JSX.
 */
const REVEAL_TARGETS = [
  'section h2',
  'section h3',
  'section p',
  '.card',
  '.band-dark',
  '.faq-item',
  '.footer-col',
  '.step-card',
  '.proof-card',
  '.teaser-frame',
  '.hero-text h1',
  '.hero-text p',
].join(', ');

export default function Reveal() {
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(REVEAL_TARGETS).forEach((el) => {
      // Elements inside a scroll-driven stage animate from progress, not reveal.
      if (
        !el.classList.contains('reveal') &&
        !el.closest('.assembly-scroll') &&
        !el.closest('.capture-scroll')
      ) {
        el.classList.add('reveal');
      }
    });

    const show = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    };

    const revealObserver = new IntersectionObserver(show, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    const stepObserver = new IntersectionObserver(show, { threshold: 0.15 });
    document.querySelectorAll('.step-card').forEach((el) => stepObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      stepObserver.disconnect();
    };
  }, []);

  return null;
}
