import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('concepts');

export default function Concepts() {
  return (
    <DocPage slug="concepts">
      <h2 id="brick">Brick</h2>
      <p>
        A <strong>brick</strong> (called a <em>module</em> in CLI output) is one folder of source code that does one job
        and carries a manifest. Examples: <code>auth</code>, <code>waitlist</code>, <code>discount-rules</code>,{' '}
        <code>notification-inbox</code>. Bricks are written in strict TypeScript and target one framework, currently
        Next.js or NestJS.
      </p>
      <p>
        When a brick is installed, its files are copied into your project, where you can read and change them. There
        is no hidden <code>node_modules</code> copy and no runtime dependency on BricoWerx.
      </p>
      <p>A brick can come from three places:</p>
      <Table
        head={['Source', 'How', 'Tool']}
        rows={[
          ['An existing project', 'Lift a module you already wrote', <DocLink key="c" to="cli" hash="capture">brico capture</DocLink>],
          ['A specification', 'Answer an interview; an engine generates and tests the code', <DocLink key="b" to="builder">Builder</DocLink>],
          ['A running web app', 'Observe a feature in the browser; a worker builds it', <DocLink key="s" to="scanner">Scanner</DocLink>],
        ]}
      />

      <h2 id="vault">Vault</h2>
      <p>
        The <strong>Vault</strong> is where bricks live: a directory under git, at <code>~/.brico/vault</code> by
        default. Each version of each brick is an immutable snapshot, and an <code>index.json</code> summarises all
        of them for search. Because it is plain git, you can read it, diff it, review it and revert it. Sharing it
        means pushing it to a repository. See <DocLink to="vault">The Vault</DocLink>.
      </p>

      <h2 id="manifest">Manifest</h2>
      <p>
        Every snapshot carries a <code>brico.manifest.json</code>, the contract between a brick and the engine. It
        records the brick&rsquo;s name, version, framework, files, npm dependencies, required environment variables,
        exports, compatibility and install path. The engine reads behaviour from the manifest instead of hardcoding
        it. That is what makes third-party bricks possible.
      </p>
      <Code title="brico.manifest.json (abridged)" lang="json">{`{
  "schemaVersion": 1,
  "name": "auth",
  "version": "0.1.0",
  "description": "JWT authentication with Passport and bcrypt",
  "framework": "nest",
  "language": "typescript",
  "visibility": "private",
  "tags": ["security", "jwt", "auth"],
  "dependencies": { "@nestjs/jwt": "^10.2.0", "bcrypt": "^5.1.1" },
  "env": [{ "name": "JWT_SECRET", "required": true }],
  "files": ["auth.module.ts", "auth.service.ts", "jwt.strategy.ts"],
  "installPath": "src/auth"
}`}</Code>
      <p>
        The full field list is in <DocLink to="manifest">Manifest and project files</DocLink>.
      </p>

      <h2 id="versions">Versions</h2>
      <p>
        Bricks use <a href="https://semver.org" target="_blank" rel="noreferrer">semantic versioning</a>. A published version
        never changes. To change a brick, capture it again with a higher <code>--module-version</code>. When you add or
        upgrade a brick, you can pin it or give a range:
      </p>
      <Table
        head={['You write', 'You get']}
        rows={[
          [<code key="1">auth</code>, 'The latest version in the Vault'],
          [<code key="2">auth@0.2.0</code>, 'Exactly 0.2.0'],
          [<code key="3">auth@^1.2.0</code>, 'The newest ≥ 1.2.0 and < 2.0.0 (for 0.x: < the next minor)'],
          [<code key="4">auth@~1.2.0</code>, 'The newest ≥ 1.2.0 and < 1.3.0'],
        ]}
      />

      <h2 id="project">Project file</h2>
      <p>
        A project that uses bricks has a <code>brico.json</code> at its root. It records the detected framework and
        every installed brick with its version and path. <code>add</code>, <code>upgrade</code>, <code>remove</code>{' '}
        and <code>doctor</code> all read it. Commit it with your code.
      </p>

      <h2 id="adapters">Adapters</h2>
      <p>
        The engine itself knows nothing about any framework. Framework knowledge sits behind an{' '}
        <strong>adapter</strong>, which decides where a brick installs by default, which folders look reusable, and
        which wiring steps to print after <code>add</code> and <code>remove</code>.
      </p>
      <Table
        head={['Adapter', 'Detected from', 'Default install path']}
        rows={[
          ['NestJS', <code key="n">@nestjs/core</code>, <code key="np">src/&lt;name&gt;</code>],
          ['Next.js', <code key="x">next</code>, <code key="xp">src/features/&lt;name&gt;</code>],
        ]}
      />
      <p>
        Supporting a new framework means adding one adapter package. The engine core doesn&rsquo;t change. Express,
        Fastify, Django and Spring are on the <DocLink to="status">roadmap</DocLink>.
      </p>

      <h2 id="portability">Portability and the host</h2>
      <p>
        Copying a folder into a different app only works if the folder doesn&rsquo;t reach out to the app it came from:
        its import aliases, design system, auth or database. The governing rule is:
      </p>
      <Callout kind="tip" title="The governing rule">
        <p>
          <strong>A brick never imports its host. The host imports the brick.</strong> Everything that changes between
          applications lives in one small host-owned composition file per brick.
        </p>
      </Callout>
      <p>
        The <DocLink to="brick-rules">brick rules</DocLink> spell this out as twelve checkable rules. Bricks made by the
        Builder follow them automatically.
      </p>
    </DocPage>
  );
}
