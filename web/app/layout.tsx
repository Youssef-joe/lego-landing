import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "BricoWerx — Developers don't have to start from scratch",
  description:
    "BricoWerx keeps your team's proven code as versioned, searchable pieces — so engineers and AI assistants reuse them instead of rebuilding them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
