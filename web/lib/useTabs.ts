'use client';

import { useEffect, type RefObject } from 'react';

/**
 * ARIA tab behaviour for the pill tablists, scoped to one tablist element.
 *
 * `attr` is the dataset key holding each tab's target ("tab" or "level");
 * `panelId` maps that value to the id of the panel it shows. Pass a
 * module-level function so the effect does not re-bind on every render.
 */
export function useTabs(
  tablistRef: RefObject<HTMLElement | null>,
  attr: string,
  panelId: (value: string) => string,
) {
  useEffect(() => {
    const tablist = tablistRef.current;
    if (!tablist) return;

    const tabs = Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'));
    if (tabs.length === 0) return;

    const panels = tabs
      .map((t) => document.getElementById(panelId(t.dataset[attr] ?? '')))
      .filter((p): p is HTMLElement => p !== null);

    const activate = (active: HTMLElement) => {
      tabs.forEach((t) => {
        const on = t === active;
        t.setAttribute('aria-selected', String(on));
        t.style.background = on ? 'var(--terracotta)' : '';
        t.style.color = on ? 'var(--on-dark)' : '';
        t.style.borderColor = on ? 'var(--terracotta)' : '';
      });
      const target = panelId(active.dataset[attr] ?? '');
      panels.forEach((p) => {
        p.style.display = p.id === target ? '' : 'none';
      });
    };

    const onClick = (e: Event) => activate(e.currentTarget as HTMLElement);

    const onKeyDown = (e: Event) => {
      const ke = e as KeyboardEvent;
      let i = tabs.indexOf(ke.currentTarget as HTMLElement);
      if (ke.key === 'ArrowRight') i = (i + 1) % tabs.length;
      else if (ke.key === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
      else return;
      ke.preventDefault();
      tabs[i].focus();
      activate(tabs[i]);
    };

    tabs.forEach((t) => {
      t.addEventListener('click', onClick);
      t.addEventListener('keydown', onKeyDown);
    });

    return () => {
      tabs.forEach((t) => {
        t.removeEventListener('click', onClick);
        t.removeEventListener('keydown', onKeyDown);
      });
    };
  }, [tablistRef, attr, panelId]);
}
