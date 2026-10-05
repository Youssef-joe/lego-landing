import Link from 'next/link';
import CopyButton from './CopyButton';
import { STATUS_LABEL, docHref, findDoc } from '@/lib/docs';

/** A docs page: section eyebrow, title, lead and status from lib/docs.ts, then the content and prev / next links. */
export function DocPage({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { page, prev, next } = findDoc(slug);
  return (
    <article className="docs-article">
      <header className="docs-header">
        <p className="docs-eyebrow">{page.section}</p>
        <h1>{page.title}</h1>
        <p className="docs-lead">{page.lead}</p>
        {page.status && (
          <span className={`docs-badge docs-badge-${page.status} docs-badge-lg`}>{STATUS_LABEL[page.status]}</span>
        )}
      </header>
      <div className="docs-prose">{children}</div>
      <nav className="docs-pager" aria-label="Previous and next pages">
        {prev ? (
          <Link href={docHref(prev.slug)} className="docs-pager-link">
            <span>Previous</span>
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={docHref(next.slug)} className="docs-pager-link next">
            <span>Next</span>
            {next.title}
          </Link>
        )}
      </nav>
    </article>
  );
}

/** A code block with an optional file / shell label and a copy button. */
export function Code({ children, title, lang = 'bash' }: { children: string; title?: string; lang?: string }) {
  const text = children.replace(/^\n/, '').replace(/\s+$/, '');
  return (
    <figure className="docs-code">
      <figcaption>
        <span>{title ?? lang}</span>
        <CopyButton text={text} />
      </figcaption>
      <pre>
        <code>{text}</code>
      </pre>
    </figure>
  );
}

type CalloutKind = 'note' | 'tip' | 'warn' | 'planned';
const CALLOUT_LABEL: Record<CalloutKind, string> = { note: 'Note', tip: 'Tip', warn: 'Careful', planned: 'Not built yet' };

export function Callout({ kind = 'note', title, children }: { kind?: CalloutKind; title?: string; children: React.ReactNode }) {
  return (
    <aside className={`docs-callout docs-callout-${kind}`}>
      <p className="docs-callout-title">{title ?? CALLOUT_LABEL[kind]}</p>
      {children}
    </aside>
  );
}

/** A link to another docs page by slug. */
export function DocLink({ to, hash, children }: { to: string; hash?: string; children: React.ReactNode }) {
  return <Link href={`${docHref(to)}${hash ? `#${hash}` : ''}`}>{children}</Link>;
}

/** Numbered steps; each child is one step. */
export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="docs-steps">{children}</ol>;
}

export function Cards({ children }: { children: React.ReactNode }) {
  return <div className="docs-cards">{children}</div>;
}

export function Card({ to, title, tag, children }: { to: string; title: string; tag?: string; children: React.ReactNode }) {
  return (
    <Link href={docHref(to)} className="docs-card">
      {tag && <span className="docs-card-tag">{tag}</span>}
      <span className="docs-card-title">{title}</span>
      <span className="docs-card-body">{children}</span>
    </Link>
  );
}

/** A two-or-more column table from rows of cells. */
export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="docs-table">
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
