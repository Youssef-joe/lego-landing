'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Drives a scroll-linked animation.
 *
 * `onProgress` is called with 0..1 as `ref` scrolls through the viewport.
 * Scroll events fire far more often than frames on precision trackpads and
 * high-refresh displays, so work is batched into a single rAF tick — we read
 * layout and write styles at most once per frame instead of several times.
 *
 * Honours prefers-reduced-motion by jumping straight to the end state.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
) {
  // Held in a ref so a caller passing an inline arrow does not re-bind listeners.
  const cb = useRef(onProgress);
  cb.current = onProgress;

  useEffect(() => {
    const area = ref.current;
    if (!area) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cb.current(1);
      return;
    }

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = area.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) {
        cb.current(1);
        return;
      }
      cb.current(Math.max(0, Math.min(1, -rect.top / scrollable)));
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', update);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('load', update);
    };
  }, [ref]);
}
