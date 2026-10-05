'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** "On this page": built from the article's h2 / h3 ids, with the section in view highlighted. */
export default function DocsToc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [current, setCurrent] = useState('');

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('.docs-article h2[id], .docs-article h3[id]'));
    setHeadings(nodes.map((node) => ({ id: node.id, text: node.textContent ?? '', level: node.tagName === 'H2' ? 2 : 3 })));
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setCurrent(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px' },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pathname]);

  if (headings.length < 2) return <aside className="docs-toc" aria-hidden="true" />;

  return (
    <aside className="docs-toc" aria-label="On this page">
      <p className="docs-nav-title">On this page</p>
      <ul>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'sub' : undefined}>
            <a href={`#${heading.id}`} className={current === heading.id ? 'active' : undefined}>
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
