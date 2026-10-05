import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import DocsSidebar from '@/components/docs/DocsSidebar';
import DocsToc from '@/components/docs/DocsToc';
import './docs.css';

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="docs">
      <BrandMark />
      <header className="docs-top">
        <div className="docs-top-inner">
          <Link href="/" className="docs-brand" aria-label="BricoWerx home">
            <svg className="brand-mark" width="28" height="28" aria-hidden="true" focusable="false"><use href="#bwx-mark" /></svg>
            <span>BricoWerx</span>
          </Link>
          <Link href="/docs" className="docs-top-label">Docs</Link>
          <nav className="docs-top-links" aria-label="Site">
            <Link href="/">Home</Link>
            <Link href="/builder">Builder</Link>
            <Link href="/#launch" className="btn-fill">Join the waitlist</Link>
          </nav>
        </div>
      </header>
      <div className="docs-wrap">
        <DocsSidebar />
        <main className="docs-main">{children}</main>
        <DocsToc />
      </div>
      <footer className="docs-foot">
        <span>© {new Date().getFullYear()} BricoWerx · MIT licensed</span>
        <span>Found something wrong in the docs? Tell us when you join the waitlist.</span>
      </footer>
    </div>
  );
}
