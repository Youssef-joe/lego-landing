import { Callout, Card, Cards, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('');

export default function Overview() {
  return (
    <DocPage slug="">
      <p>
        Most teams have solved the same problems many times: authentication, a waitlist, a notification inbox, a
        discount engine. Each time the solution is rebuilt from memory, or copied by hand and then left to drift.
        BricoWerx changes the first question from <em>&ldquo;how do we build this?&rdquo;</em> to{' '}
        <em>&ldquo;do we already have a brick for this?&rdquo;</em>. If you don&rsquo;t, you build the brick once,
        capture it, and every later project reuses it.
      </p>
      <p>
        A <strong>brick</strong> is a self-contained module with a manifest that says what it is, what it needs and
        where it goes. Bricks live in a <strong>Vault</strong>, which is a plain git directory of versioned snapshots.
        BricoWerx is not a code generator, a helper library or a boilerplate. It turns finished engineering work into
        assets you can find, version and install.
      </p>

      <h2 id="ecosystem">The ecosystem at a glance</h2>
      <p>
        There are three ways to make a brick, one place where bricks live, and one way to install them. Every tool
        below feeds the Vault or reads from it.
      </p>
      <div className="docs-map" role="img" aria-label="Capture, Builder and Scanner all write bricks to the Vault; brico add installs bricks from the Vault into a target app; the MCP server will let assistants search it.">
        <div className="docs-map-row">
          <div className="docs-map-node">
            <strong>Capture</strong>
            <code>brico extract</code> and <code>brico capture</code> lift a module out of a project you already have.
          </div>
          <div className="docs-map-node">
            <strong>Builder</strong>
            Describe a new brick in a short interview; the engine generates and tests it.
          </div>
          <div className="docs-map-node">
            <strong>Scanner + Worker</strong>
            Observe a running web app, pick a feature, and have it built as a brick.
          </div>
        </div>
        <div className="docs-map-arrow">↓ every brick lands in ↓</div>
        <div className="docs-map-node docs-map-vault">
          <strong>The Vault</strong>
          git-versioned snapshots + <code>index.json</code> · shared with <code>brico publish</code> / <code>brico pull</code>
        </div>
        <div className="docs-map-arrow">↓ installed with ↓</div>
        <div className="docs-map-row">
          <div className="docs-map-node">
            <strong>brico add</strong>
            Copies a brick into a Next.js or NestJS app and records it in <code>brico.json</code>.
          </div>
          <div className="docs-map-node">
            <strong>brico ui</strong>
            Browse, filter and inspect the Vault in the terminal.
          </div>
          <div className="docs-map-node">
            <strong>brico mcp</strong> <span className="docs-badge docs-badge-planned">Planned</span>
            <br />
            Lets AI assistants search the Vault before they write new code.
          </div>
        </div>
      </div>

      <h2 id="tools">The tools</h2>
      <Cards>
        <Card to="cli" title="brico CLI" tag="Available">
          One Go binary that extracts, captures, versions, publishes, installs and upgrades bricks.
        </Card>
        <Card to="tui" title="Terminal UI" tag="Available">
          <code>brico ui</code>: a full-screen view of the Vault with details, doctor and extract built in.
        </Card>
        <Card to="vault" title="The Vault" tag="Available">
          Immutable versioned snapshots in git. Local first, shareable through any git remote.
        </Card>
        <Card to="builder" title="Builder" tag="Preview">
          A spec-driven, AI-assisted author for new bricks. Every line must pass type checks and tests.
        </Card>
        <Card to="scanner" title="Scanner extension" tag="Preview">
          A Chrome extension that maps the routes, API calls and features of a running web app.
        </Card>
        <Card to="worker" title="Worker" tag="Preview">
          Builds Scanner captures into type-checked bricks and publishes them to the Vault.
        </Card>
        <Card to="mcp" title="MCP server" tag="Planned">
          Vault search for Claude, Cursor and any assistant that speaks the Model Context Protocol.
        </Card>
        <Card to="brick-rules" title="Brick rules" tag="Reference">
          R1–R12: what makes a brick portable, and the gates that check it.
        </Card>
      </Cards>

      <h2 id="status-labels">What the status labels mean</h2>
      <Table
        head={['Label', 'Meaning']}
        rows={[
          [<span key="a" className="docs-badge docs-badge-available">Available</span>, 'Shipped in the current release and covered by tests. Safe to rely on, within the limits on the Security page.'],
          [<span key="p" className="docs-badge docs-badge-preview">Preview</span>, 'Works end to end and you can use it today, but its interface and deployment may still change.'],
          [<span key="n" className="docs-badge docs-badge-planned">Planned</span>, 'Designed and on the roadmap, not built yet. The page describes the intended behaviour.'],
        ]}
      />

      <h2 id="where-to-start">Where to start</h2>
      <ul>
        <li>
          <strong>You have a project with a module worth reusing.</strong> Follow{' '}
          <DocLink to="getting-started">Getting started</DocLink>, which installs the CLI and walks through capture and add.
        </li>
        <li>
          <strong>You want a new brick that doesn&rsquo;t exist yet.</strong> Open the{' '}
          <DocLink to="builder">Builder</DocLink>.
        </li>
        <li>
          <strong>You want to understand the model first.</strong> Read <DocLink to="concepts">Core concepts</DocLink>, then
          the <DocLink to="brick-rules">brick rules</DocLink>.
        </li>
        <li>
          <strong>You are evaluating BricoWerx for a team.</strong> Read the{' '}
          <DocLink to="security">security model</DocLink> and <DocLink to="status">status and roadmap</DocLink>. They
          state plainly what is and isn&rsquo;t built yet.
        </li>
      </ul>

      <Callout kind="note" title="Names you will see">
        <p>
          <strong>BricoWerx</strong> is the product. <strong>BRICO</strong> and <code>brico</code> are the engine and its
          command. The Builder and some older material call reusable modules <em>pieces</em>; these docs say{' '}
          <em>bricks</em> throughout.
        </p>
      </Callout>
    </DocPage>
  );
}
