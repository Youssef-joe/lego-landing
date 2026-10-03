import Link from 'next/link';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const RESERVED = new Set(['domain', 'host', 'ui', 'host-contract']);

async function getAvailableBricks(): Promise<string[]> {
  try {
    const featuresDir = path.join(process.cwd(), 'src', 'features');
    const dirs = await fs.readdir(featuresDir, { withFileTypes: true });
    return dirs
      .filter((d) => d.isDirectory() && !RESERVED.has(d.name) && !d.name.startsWith('_') && !d.name.startsWith('.'))
      .map((d) => d.name)
      .sort();
  } catch {
    return [];
  }
}

const THEMES = [
  { bg: 'bg-brico-red', text: 'text-brico-paper' },
  { bg: 'bg-brico-blue', text: 'text-brico-paper' },
  { bg: 'bg-brico-green', text: 'text-brico-paper' },
  { bg: 'bg-brico-yellow', text: 'text-brico-ink' },
  { bg: 'bg-brico-orange', text: 'text-brico-paper' },
];

const STEPS = [
  {
    n: '01',
    title: 'Describe',
    body: 'Type what you want in plain words. No scaffolding, no config files, no setup.',
    example: '"a booking slot grid for mentors in Berlin"',
    color: 'bg-brico-yellow',
  },
  {
    n: '02',
    title: 'Architect',
    body: 'The Builder asks, plans, and agrees the shape with you before writing a line.',
    example: '"agreed: SlotView[] in, grouped days out"',
    color: 'bg-brico-blue',
  },
  {
    n: '03',
    title: 'Deploy',
    body: 'One click compiles a standalone module into the Vault. Copy-only, portable.',
    example: '"deployed → src/features/slot-picker/"',
    color: 'bg-brico-green',
  },
];

export default async function BuilderLanding() {
  const bricks = await getAvailableBricks();

  return (
    <div className="min-h-screen w-full bg-brico-paper text-brico-ink font-sans brutal-grid">
      <style>{`
        @keyframes floaty { 0%,100% { transform: translateY(0) rotate(var(--tilt,0deg)); } 50% { transform: translateY(-10px) rotate(var(--tilt,0deg)); } }
        @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes barfill { 0% { width: 4%; } 60% { width: 82%; } 100% { width: 96%; } }
        @keyframes popin { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .anim-floaty { animation: floaty 4s ease-in-out infinite; }
        .anim-blink { animation: blink 1s step-end infinite; }
        .anim-marquee { animation: marquee 18s linear infinite; }
        .anim-bar { animation: barfill 3.2s ease-in-out infinite alternate; }
        .anim-pop { animation: popin .6s ease-out both; }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-30 border-b-4 border-brico-ink bg-brico-yellow">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="border-2 border-brico-ink bg-brico-ink px-2 py-1 font-mono text-xs font-black uppercase tracking-widest text-brico-paper">
              Brico
            </div>
            <span className="font-serif text-xl font-black uppercase tracking-tight">Builder</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-xs font-black uppercase sm:inline">
              {bricks.length} {bricks.length === 1 ? 'module' : 'modules'} live
            </span>
            <Link
              href="/builder/app"
              className="border-2 border-brico-ink bg-brico-ink px-4 py-2 font-mono text-xs font-black uppercase tracking-widest text-brico-paper shadow-brutal-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Open Builder →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-14 lg:grid-cols-2 lg:items-center">
        <div className="anim-pop">
          <div className="mb-5 inline-block border-2 border-brico-ink bg-white px-3 py-1 font-mono text-[11px] font-black uppercase tracking-[0.2em] shadow-brutal-sm">
            AI Builder · describe → deploy
          </div>
          <h1 className="font-serif text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
            Talk.
            <br />
            Build.
            <br />
            <span className="bg-brico-ink px-2 text-brico-yellow">Reuse.</span>
          </h1>
          <p className="mt-6 max-w-md font-sans text-lg font-bold leading-relaxed text-brico-ink">
            The Builder turns plain words into{' '}
            <span className="border-b-2 border-brico-ink bg-brico-yellow px-1">standalone modules</span>.
            No boilerplate. Each one lands in the Vault, ready to drop into any app.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/builder/app"
              className="border-4 border-brico-ink bg-brico-blue px-8 py-4 font-mono text-lg font-black uppercase tracking-widest text-white shadow-brutal transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
            >
              Start building
            </Link>
            <a
              href="#vault"
              className="border-4 border-brico-ink bg-white px-8 py-4 font-mono text-lg font-black uppercase tracking-widest shadow-brutal transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
            >
              Browse {bricks.length} modules
            </a>
          </div>
          <p className="mt-5 font-mono text-xs font-bold uppercase tracking-widest text-brico-ink-soft">
            Bricks live under <span className="text-brico-ink">src/features/</span> — capture path = install path
          </p>
        </div>

        {/* Animated visual: fake terminal */}
        <div className="anim-pop relative" style={{ animationDelay: '120ms' }}>
          <div
            className="anim-floaty absolute -left-4 -top-6 z-10 border-2 border-brico-ink bg-brico-red px-3 py-1 font-mono text-xs font-black uppercase text-brico-paper shadow-brutal-sm"
            style={{ ['--tilt' as string]: '-4deg' }}
          >
            ● live demo
          </div>
          <div
            className="anim-floaty absolute -right-3 top-1/2 z-10 border-2 border-brico-ink bg-brico-green px-3 py-1 font-mono text-xs font-black uppercase text-white shadow-brutal-sm"
            style={{ ['--tilt' as string]: '3deg', animationDelay: '800ms' }}
          >
            ✓ deployed
          </div>
          <div className="border-4 border-brico-ink bg-brico-paper-2 shadow-brutal-lg">
            <div className="flex items-center justify-between border-b-4 border-brico-ink bg-brico-ink px-5 py-3">
              <span className="font-mono text-xs font-black uppercase tracking-widest text-brico-paper">
                Architect Terminal
              </span>
              <span className="flex gap-1.5">
                <span className="h-3 w-3 border border-brico-paper bg-brico-red" />
                <span className="h-3 w-3 border border-brico-paper bg-brico-yellow" />
                <span className="h-3 w-3 border border-brico-paper bg-brico-green" />
              </span>
            </div>
            <div className="space-y-4 p-6 font-mono text-sm font-bold">
              <div className="border-2 border-brico-ink bg-brico-ink px-4 py-3 text-brico-paper">
                USER_DIRECTIVE
                <div className="mt-1 font-sans text-[15px]">&ldquo;booking grid for Tue / Thu mentors…&rdquo;<span className="anim-blink">▊</span></div>
              </div>
              <div className="border-2 border-brico-ink bg-white px-4 py-3 shadow-brutal-sm">
                SYSTEM_RESPONSE
                <div className="mt-1 text-[13px]">Agreed: SlotView[] → grouped days. Generating…</div>
              </div>
              <div className="border-2 border-brico-ink bg-brico-yellow px-4 py-3">
                <div className="flex justify-between text-xs font-black uppercase">
                  <span>Deploying module</span>
                  <span>96%</span>
                </div>
                <div className="mt-2 h-4 border-2 border-brico-ink bg-white">
                  <div className="anim-bar h-full bg-brico-green" />
                </div>
                <div className="mt-2 text-xs">◀ FILE slot-picker/domain.ts ▶ … ◀ FILE slot-picker/ui.tsx ▶</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="overflow-hidden border-y-4 border-brico-ink bg-brico-ink py-3">
        <div className="anim-marquee flex w-max gap-8 whitespace-nowrap font-mono text-sm font-black uppercase tracking-[0.2em] text-brico-paper">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['Describe', '→', 'Architect', '→', 'Deploy', '→', 'Reuse', '★'].map((w, i) => (
              <span key={`${k}-${i}`} className={w === '→' || w === '★' ? 'text-brico-yellow' : ''}>
                {w}
              </span>
            )),
          )}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="font-serif text-3xl font-black uppercase">How the Builder works</h2>
        <p className="mt-2 max-w-xl font-sans font-bold text-brico-ink-soft">
          Three steps. You talk, it plans, it ships. Simple enough to explain in 30 seconds.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="border-4 border-brico-ink bg-white shadow-brutal transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              <div className={`flex items-center justify-between border-b-4 border-brico-ink px-5 py-3 ${s.color}`}>
                <span className="font-mono text-sm font-black">{s.n}</span>
                <span className="font-mono text-xs font-black uppercase">step {i + 1}/3</span>
              </div>
              <div className="p-6">
                <h3 className="font-serif text-2xl font-black uppercase">{s.title}</h3>
                <p className="mt-2 font-sans text-[15px] font-bold leading-relaxed">{s.body}</p>
                <p className="mt-4 border-2 border-brico-ink bg-brico-paper-2 px-3 py-2 font-mono text-xs font-bold">
                  {s.example}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* VAULT / MODULES */}
      <section id="vault" className="border-t-4 border-brico-ink bg-brico-paper-2">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-black uppercase">Workspace Vault</h2>
              <p className="mt-2 max-w-xl font-sans font-bold text-brico-ink-soft">
                Every finished build lands here. Open the Builder to create one, or remix an idea into a new module.
              </p>
            </div>
            <Link
              href="/builder/app"
              className="border-2 border-brico-ink bg-brico-ink px-4 py-2 font-mono text-xs font-black uppercase tracking-widest text-brico-paper shadow-brutal-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              + New module
            </Link>
          </div>

          {bricks.length === 0 ? (
            <div className="mt-8 border-4 border-brico-ink bg-white p-10 text-center shadow-brutal">
              <p className="font-serif text-2xl font-black uppercase">Vault empty</p>
              <p className="mt-2 font-mono font-bold">Start a build sequence in the forge to deploy the first module.</p>
              <Link
                href="/builder/app"
                className="mt-6 inline-block border-4 border-brico-ink bg-brico-yellow px-6 py-3 font-mono font-black uppercase shadow-brutal"
              >
                Open Builder
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {bricks.map((brick, i) => {
                const theme = THEMES[i % THEMES.length]!;
                return (
                  <Link
                    key={brick}
                    href="/builder/app"
                    className="group flex flex-col border-4 border-brico-ink bg-brico-paper p-6 shadow-brutal transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div className={`${theme.bg} border-2 border-brico-ink p-3 shadow-brutal-sm`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`h-7 w-7 ${theme.text}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                      </div>
                      <span className="flex items-center gap-2 border-2 border-brico-ink bg-white px-2 py-1">
                        <span className="h-2.5 w-2.5 border border-brico-ink bg-brico-green" />
                        <span className="font-mono text-[10px] font-black uppercase tracking-widest">Live</span>
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-black capitalize">{brick.replace(/-/g, ' ')}</h3>
                    <p className="mt-1 truncate font-mono text-xs font-bold text-brico-ink-soft">{brick}</p>
                    <span className="mt-4 inline-block font-mono text-xs font-black uppercase tracking-widest underline decoration-2 underline-offset-4 group-hover:bg-brico-yellow">
                      Remix in Builder →
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER CTA */}
      <footer className="border-t-4 border-brico-ink bg-brico-yellow">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
          <div>
            <p className="font-serif text-2xl font-black uppercase">Ready to forge one?</p>
            <p className="mt-1 font-mono text-sm font-bold uppercase">Describe it. Agree it. Deploy it.</p>
          </div>
          <Link
            href="/builder/app"
            className="border-4 border-brico-ink bg-brico-ink px-8 py-4 font-mono text-lg font-black uppercase tracking-widest text-brico-paper shadow-brutal transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
          >
            Launch Builder →
          </Link>
        </div>
      </footer>
    </div>
  );
}
