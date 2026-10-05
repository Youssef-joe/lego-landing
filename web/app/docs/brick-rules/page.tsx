import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('brick-rules');

export default function BrickRules() {
  return (
    <DocPage slug="brick-rules">
      <p>
        <code>brico add</code> copies files and does nothing else. It doesn&rsquo;t rewrite imports, install packages,
        register routes or touch your schema. So anything that would need adapting has to be designed out of the
        brick, not patched in afterwards. These rules do that. Each one closes a real failure seen when a captured
        module was copied into another app and nothing in it compiled.
      </p>
      <p>
        The rules are enforced by <code>brick-lint</code> in CI, and every brick made by the{' '}
        <DocLink to="builder">Builder</DocLink> follows them.
      </p>

      <h2 id="governing-rule">The governing rule</h2>
      <Callout kind="tip" title="A brick never imports the host. The host imports the brick.">
        <p>
          The brick declares the interface it needs, and the host implements it. Every line that depends on an alias,
          a design system or an auth provider lives in one host-owned <strong>composition file</strong> per brick, about
          120 lines. That file is the whole cost of portability.
        </p>
      </Callout>

      <h2 id="layout">Brick layout</h2>
      <Code title="src/features/<name>/" lang="text">{`domain/       pure types and logic, safe on server and client
ui/           client entry point; never reaches server/ or adapters/
server/       service factory with injected dependencies
host/         vendored copy of the host contract (do not edit)
testing/      in-memory Repository adapter
__tests__/    tests that must pass inside any target`}</Code>

      <h2 id="rules">The rules</h2>

      <h3 id="r1">R1 · Relative imports only</h3>
      <p>
        No <code>@/…</code>, no <code>~/…</code>, no leading <code>/</code>, and no self-alias such as{' '}
        <code>@mentorship/core</code>, which the scanner would record as a phantom npm package. Every import is a bare
        npm package or a relative path.
      </p>

      <h3 id="r2">R2 · Relative imports stay inside the brick</h3>
      <p>
        <code>../../lib/utils</code> points outside the brick, so it isn&rsquo;t copied. This is also why bricks
        don&rsquo;t import each other. Cross-brick needs are expressed as <strong>ports</strong>: one brick declares an
        interface, another implements it, and they meet only in the host&rsquo;s composition file. Inside a brick, cross
        directory imports go through a barrel such as <code>../domain/index.ts</code>.
      </p>

      <h3 id="r3">R3 · Read environment variables literally</h3>
      <p>
        Write <code>process.env.NAME</code> or <code>process.env[&apos;NAME&apos;]</code>. Destructuring is invisible to the
        scanner, so the variable never reaches the manifest or <code>.env.example</code>. Most configuration should
        arrive from the host anyway. Bricks should only read their own feature flags.
      </p>
      <Code lang="ts">{`const enabled = process.env.WAITLIST_ENABLED === 'true';    // ✓ seen by the scanner
const { WAITLIST_ENABLED } = process.env;                   // ✗ invisible`}</Code>

      <h3 id="r4">R4 · No dynamic import() with a computed argument</h3>
      <p>The scanner can&rsquo;t see it, so the dependency never reaches the manifest.</p>

      <h3 id="r5">R5 · Non-TypeScript files are checked too</h3>
      <p>
        An alias inside a <code>.css</code>, <code>.mjs</code>, <code>.json</code> or template file is copied unchanged
        and can&rsquo;t be caught by the TypeScript scan. <code>brick-lint</code> checks those files separately.
      </p>

      <h3 id="r6">R6 · Separate entry points</h3>
      <p>
        Ship <code>ui/index.ts</code>, <code>server/index.ts</code> and <code>domain/index.ts</code>, never a root barrel
        that re-exports both UI and server. Nothing reachable from <code>ui/</code> may reach <code>server/</code>, and
        server code imports <code>server-only</code>, so a stray client import fails the build instead of leaking
        credentials.
      </p>

      <h3 id="r7">R7 · Dependency hygiene</h3>
      <p>
        Every npm package used is listed in <code>dependencies</code> or <code>peerDependencies</code>, none is{' '}
        <code>&quot;*&quot;</code>, and no adapter SDK (<code>firebase-admin</code>, <code>@prisma/client</code>, …) is a
        direct dependency. Capture can&rsquo;t fill in <code>peerDependencies</code> for you, so write them by hand.
      </p>

      <h3 id="r8">R8 · Vendored contract files are byte-identical</h3>
      <p>
        <code>host/contract.ts</code> and <code>domain/shared-ports.ts</code> come from one source and are copied into
        every brick. CI checks that their SHA-256 hashes match. Types disappear at build time, so the copies cost
        nothing at runtime, and identical declarations are mutually assignable, so the host needs no casts.
      </p>

      <h3 id="r9">R9 · No routes in the brick</h3>
      <p>
        Route files must live under <code>src/app/**</code>, outside the brick. Instead, a brick exposes{' '}
        <code>runtime.page(params, searchParams)</code> and the host mounts it at one catch-all route. Route groups,
        locale prefixes and auth layouts stay host concerns. A brick may ship{' '}
        <code>integration/install.mjs</code>, which reads the target&rsquo;s <code>tsconfig.json</code> and writes the
        route shims for it.
      </p>

      <h3 id="r10">R10 · No design-system imports</h3>
      <p>
        A brick never imports <code>@/components/ui/*</code>. It vendors its own small set of primitives, styled with
        Tailwind over the standard shadcn CSS variables, and every <code>var()</code> has a fallback:
      </p>
      <Code lang="css">{`--brick-primary: var(--primary, 222 47% 11%);`}</Code>
      <p>
        A host with shadcn tokens gets its own brand automatically, and a host without them gets a clean neutral
        theme. Bricks declare no fonts, so typography comes from the host.
      </p>

      <h3 id="r11">R11 · Portable persistence</h3>
      <p>
        All storage goes through a repository port. Ids are strings, timestamps are ISO strings or epoch milliseconds
        (never <code>Date</code>), and money is <code>{'{ amountMinor, currency }'}</code>. Queries are limited to what
        both a document store and SQL can do: equality, <code>in</code> (up to 10), one <code>array-contains</code>, one
        range field, one order field plus an id tiebreak, a keyset cursor, and a <strong>required limit</strong>.
        Uniqueness uses a deterministic id plus <code>createIfAbsent</code>. Every flow that writes more than once must
        be correct without transactions.
      </p>

      <h3 id="r12">R12 · Ship tests and an in-memory adapter</h3>
      <p>
        The in-memory repository has no external imports. It lets the brick run in a demo with no database, and the
        brick&rsquo;s own tests run against it <strong>inside the target</strong> after installation.
      </p>

      <h2 id="gates">Verification gates</h2>
      <p>A brick is publishable only after it passes all of these, cheapest first:</p>
      <Table
        head={['#', 'Gate']}
        rows={[
          ['1', <span key="1"><code>brico capture</code> reports neither <em>NOT self-contained</em> nor <em>refusing to capture</em></span>],
          ['2', <span key="2"><code>brick-lint</code> is clean (R1–R6)</span>],
          ['3', 'Entry points are isolated (R6)'],
          ['4', <span key="4"><code>next build</code> passes in a bare fixture app: no path aliases, no shadcn, no auth, no database. <strong>This is the definition of portable.</strong></span>],
          ['5', 'The conformance suite passes against memory, the Firestore emulator and SQLite'],
          ['6', 'It renders correctly both with fallback tokens and with a real host brand'],
          ['7', 'Dependency hygiene (R7)'],
          ['8', 'Vendored files hash-equal (R8)'],
        ]}
      />
      <p>
        Gate 6 matters more than it looks. A Tailwind-styled brick dropped into an app without Tailwind builds and
        renders fine, but looks like unstyled HTML. Only a computed-style check catches that.
      </p>
      <Code>{`npm run brick-lint                                 # R1–R6
node scripts/sync-contract.mjs --check             # R8`}</Code>
    </DocPage>
  );
}
