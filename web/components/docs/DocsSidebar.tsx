'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { DOCS, STATUS_LABEL, docHref } from '@/lib/docs';

function Nav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Documentation">
      {DOCS.map((section) => (
        <div key={section.title} className="docs-nav-group">
          <p className="docs-nav-title">{section.title}</p>
          <ul>
            {section.pages.map((page) => {
              const href = docHref(page.slug);
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link href={href} className={active ? 'docs-nav-link active' : 'docs-nav-link'} aria-current={active ? 'page' : undefined}>
                    <span>{page.title}</span>
                    {page.status && page.status !== 'available' && (
                      <span className={`docs-badge docs-badge-${page.status}`}>{STATUS_LABEL[page.status]}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function DocsSidebar() {
  const pathname = usePathname().replace(/\/$/, '') || '/docs';
  const menu = useRef<HTMLDetailsElement>(null);

  // Close the phone menu after navigating.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  return (
    <>
      <details className="docs-menu" ref={menu}>
        <summary>Docs menu</summary>
        <Nav pathname={pathname} />
      </details>
      <aside className="docs-sidebar">
        <Nav pathname={pathname} />
      </aside>
    </>
  );
}
