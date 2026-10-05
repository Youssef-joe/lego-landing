# BricoWerx — Landing Page

![BricoWerx logo](public/logo.svg)

Developers don't have to start from scratch.

BricoWerx keeps your team's proven code as versioned, searchable pieces — so engineers and AI assistants reuse them instead of rebuilding them. This repository contains the marketing landing page and waitlist front end.

## Stack

- Framework: Next.js 15 (App Router)
- UI: React 19, TypeScript
- Styling: Global CSS (`app/globals.css`, CSS variables, no framework)
- Fonts: Inter Tight, Geist, Geist Mono (via Google Fonts)
- Deployment: Static prerendered output (`next build`)

## Requirements

- Node.js 18.18+ or 20+
- npm 9+

## Getting Started

All commands run from the `web` directory, which is the project root for deployment:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build with type checking (`next build`)
- `npm start` — Serve production build (requires `npm run build` first)

## Deployment

- Framework preset: Next.js
- Root directory: `web`
- Build command: `npm run build`
- Output: `.next` (managed by Next.js)
- No environment variables required for the current static waitlist UI.

The waitlist form is currently front-end only with simulated submission. To persist signups, point `components/Waitlist.tsx` at the Go waitlist service in `../waitlist`.

## Project Structure

```text
web/
  app/
    layout.tsx      # Root layout, metadata, fonts
    page.tsx        # Page composition
    docs/           # /docs: product documentation (one folder per page, docs.css)
    globals.css     # Design tokens, sections, animations
    icon.svg        # Favicon / app icon
  components/
    Nav.tsx         # Sticky nav with waitlist CTA
    Hero.tsx        # Headline, email capture, library graphic
    BrickText.tsx   # Brick-build headline animation
    ProofStrip.tsx  # Proof stats
    Problem.tsx     # Problem statements
    HowItWorks.tsx  # Build / Capture / Piece steps
    Capture.tsx     # Capture demo animation
    Piece.tsx       # Piece detail view
    ComponentOrbit.tsx # Orbiting component chips
    ForAI.tsx       # AI assistant section
    Inside.tsx      # Vault / internals
    Roadmap.tsx     # Phase roadmap
    Faq.tsx         # FAQ accordion
    Waitlist.tsx    # Waitlist form (front-end only)
    Footer.tsx      # Footer
    Reveal.tsx      # Scroll-reveal observer
    BrandMark.tsx   # Logo mark
    Teaser.tsx      # Teaser block
    docs/           # Docs shell: sidebar, on-page contents, code blocks, callouts
  lib/
    useScrollProgress.ts
    useTabs.ts
    docs.ts         # Docs map: sections, pages, status labels (add new pages here)
  public/
    media/          # Static assets
```

## Page Sections

In render order (`app/page.tsx`):

1. Nav
2. Hero
3. ProofStrip
4. Problem
5. HowItWorks
6. Piece
7. ForAI
8. Inside
9. Roadmap
10. Faq
11. Waitlist
12. Footer

## Notes

- TypeScript strict mode is enabled (`tsconfig.json`).
- `skipLibCheck` is enabled; application type errors still fail `next build`.
- Animations use CSS transforms and opacity only, with `prefers-reduced-motion` fallbacks in `globals.css`.
- Responsive breakpoints: 620px, 760px / 768px, 860px, 900px, 1024px.
