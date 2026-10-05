'use client';
import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be refused; the code stays selectable.
    }
  };

  return (
    <button type="button" className="docs-copy" onClick={copy} aria-label="Copy code">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
