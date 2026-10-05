import { DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('status');

const badge = (status: 'available' | 'preview' | 'planned', label: string) => (
  <span key={label} className={`docs-badge docs-badge-${status}`}>{label}</span>
);

export default function Status() {
  return (
    <DocPage slug="status">
      <p>
        Current release: <strong>0.1.0</strong>. The engine, CLI and Vault are tested end to end
        (extract → capture → add → doctor) on Linux, macOS and Windows. The Builder, Scanner and Worker work and you can
        use them, but they may still change.
      </p>

      <h2 id="today">What works today</h2>
      <Table
        head={['Tool', 'Status', 'Notes']}
        rows={[
          [<DocLink key="c" to="cli">brico CLI</DocLink>, badge('available', 'Available'), 'extract, capture, list, search, add, upgrade, remove, doctor, publish, pull, diff'],
          [<DocLink key="t" to="tui">Terminal UI</DocLink>, badge('available', 'Available'), 'Browse, filter, details, doctor, extract'],
          [<DocLink key="v" to="vault">Vault</DocLink>, badge('available', 'Available'), 'Local git Vault, semver resolution, publish and pull through any git remote'],
          [<DocLink key="b" to="builder">Builder</DocLink>, badge('preview', 'Preview'), 'Invite-only at builder.bricowerx.com; creates new Next.js bricks'],
          [<DocLink key="s" to="scanner">Scanner</DocLink>, badge('preview', 'Preview'), 'Load unpacked; Chrome Web Store review in progress'],
          [<DocLink key="w" to="worker">Worker</DocLink>, badge('preview', 'Preview'), 'Local or Docker; needs Postgres and a Mistral key'],
          [<DocLink key="m" to="mcp">MCP server</DocLink>, badge('planned', 'Planned'), 'Part of the knowledge layer, now in progress'],
          [<code key="cr">brico create</code>, badge('planned', 'Planned'), 'Project templates; not registered until a template produces a real project'],
        ]}
      />

      <h2 id="limits">Current limits</h2>
      <p>A tool that writes into your repository has to be predictable before it is impressive. Today:</p>
      <ul>
        <li>
          <strong><code>brico add</code> copies; it doesn&rsquo;t compose.</strong> Wiring steps are printed, not applied.
        </li>
        <li>
          <strong>Brick-to-brick dependencies aren&rsquo;t resolved.</strong> <code>bricoDependencies</code> is recorded,
          but adding a brick won&rsquo;t pull in the bricks it needs.
        </li>
        <li>
          <strong>Imports aren&rsquo;t adapted between projects.</strong> A captured module keeps its original aliases.
          Bricks avoid this by following the <DocLink to="brick-rules">brick rules</DocLink>.
        </li>
        <li>
          <strong>Scanning uses patterns, not a parser.</strong> Dynamic <code>import()</code> and destructured{' '}
          <code>process.env</code> are missed. The brick rules forbid both.
        </li>
        <li>
          <strong>Hooks are recorded, not run.</strong> Manifest hooks will run behind an explicit allow-list.
        </li>
        <li>
          <strong>The Builder only creates.</strong> Editing an existing brick through its spec isn&rsquo;t supported yet.
        </li>
        <li>
          <strong>Two frameworks.</strong> NestJS and Next.js, in TypeScript.
        </li>
      </ul>
      <p>
        Security-relevant limits are listed separately in the <DocLink to="security" hash="limitations">security
        model</DocLink>.
      </p>

      <h2 id="roadmap">Roadmap</h2>
      <p>Four phases, in this order:</p>
      <Table
        head={['Phase', 'Focus', 'What it adds']}
        rows={[
          [badge('preview', 'A · Now'), 'Knowledge layer', 'Summaries written at capture, meaning-based search, and the MCP server'],
          ['B', 'AI piece kinds', 'Prompts and agent skills captured and versioned like code'],
          ['C', 'Accounting and graph', 'What was reused where, and what depends on what'],
          ['D', 'Team scale', 'Shared Vaults, a review flow, and an optional hosted tier'],
        ]}
      />
      <h3 id="engine-work">Engine work across the phases</h3>
      <ul>
        <li>a real TypeScript parser in place of pattern matching, with no CGO, so the binary stays a single file;</li>
        <li>content hashing, a <code>brico.lock</code> lockfile and drift detection;</li>
        <li>resolving brick-to-brick dependencies;</li>
        <li>
          adaptation seams, so a brick captured from an app using <code>@/</code> installs cleanly into one using{' '}
          <code>~/</code>, detected from the target&rsquo;s own <code>tsconfig.json</code>;
        </li>
        <li>wiring applied to your code instead of printed;</li>
        <li>path confinement in <code>add</code> and <code>remove</code>, and authentication for the Worker bridge;</li>
        <li>a public registry with mandatory <code>@scope/name</code> names and signed, reproducible releases;</li>
        <li>more adapters: Express, Fastify, Hono, Django, Spring and others.</li>
      </ul>

      <h2 id="versioning">Versioning</h2>
      <p>
        BricoWerx follows semantic versioning. From 1.0.0, the manifest <code>schemaVersion</code>, the{' '}
        <code>brico.json</code> and <code>brico.lock</code> formats, and the registry API are covered by it: breaking
        any of them needs a major version. The engine and the Scanner share a version line, but their patch numbers
        can differ because store review runs on its own schedule.
      </p>
    </DocPage>
  );
}
