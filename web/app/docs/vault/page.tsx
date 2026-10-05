import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('vault');

export default function Vault() {
  return (
    <DocPage slug="vault">
      <p>
        The Vault holds every brick and every version of it. It is a local directory under git, with no server, no
        account and no database. Git is also how it is shared: publishing pushes it to a repository and pulling
        fetches it back.
      </p>

      <h2 id="location">Where it lives</h2>
      <p>The first match wins:</p>
      <ol>
        <li>
          the <code>--vault &lt;path&gt;</code> flag;
        </li>
        <li>
          the <code>BRICO_VAULT</code> environment variable;
        </li>
        <li>
          <code>vaultPath</code> in <code>~/.brico/config.json</code>;
        </li>
        <li>
          the default, <code>~/.brico/vault</code>.
        </li>
      </ol>

      <h2 id="layout">Layout</h2>
      <Code title="~/.brico/vault" lang="text">{`index.json                  searchable summary of every brick
auth/
  0.1.0/
    brico.manifest.json     the manifest for this snapshot
    auth.module.ts          the brick's files, exactly as captured
    auth.service.ts
  0.2.0/
    ...
waitlist/
  0.1.0/
    ...`}</Code>
      <p>
        Every snapshot is the brick&rsquo;s files plus its manifest, so you can open, read or review any version with
        ordinary tools.
      </p>

      <h2 id="guarantees">Guarantees</h2>
      <Table
        head={['Property', 'What it means']}
        rows={[
          ['Immutable versions', 'A version, once stored, is never overwritten. Changing a brick means a new version.'],
          ['Reproducible history', 'Every capture is a git commit with a fixed author and date, so the same input gives the same history.'],
          ['Self-healing index', 'index.json is rebuilt from disk after every write. A hand-edited or git-merged Vault reconciles itself.'],
          ['Offline first', 'Nothing needs the network. Only publish and pull talk to a remote.'],
        ]}
      />

      <h2 id="sharing">Sharing a Vault</h2>
      <p>
        Any git remote works. A private GitHub repository is the usual choice for a team.
      </p>
      <Code>{`# one person: push the Vault and remember the repository
brico publish --repo git@github.com:acme/team-vault.git

# everyone else: fetch it
brico pull --repo git@github.com:acme/team-vault.git
brico list

# later
brico publish auth             # share one brick (all its versions)
brico diff                     # what have I changed locally?
brico pull                     # get what others published`}</Code>
      <p>
        Publishing one brick clones the target repository, overlays that brick&rsquo;s versions, rebuilds the index so
        it includes what the repository already had, and pushes. Two people can therefore publish different bricks
        to the same repository without overwriting each other.
      </p>
      <p>
        To keep a personal Vault and a team Vault apart, publish selected bricks with <code>brico publish &lt;brick&gt; -l</code>,
        or switch Vaults per command with <code>--vault</code>.
      </p>
      <Callout kind="warn" title="Treat a shared Vault like a dependency source">
        <p>
          Vault contents aren&rsquo;t signed or hashed yet, and <code>add</code> doesn&rsquo;t yet confine the paths a
          manifest names. Keep team Vaults private and only pull from people you trust. See{' '}
          <DocLink to="security">Security model</DocLink>.
        </p>
      </Callout>

      <h2 id="the-builder-vault">The Builder&rsquo;s Vault</h2>
      <p>
        The hosted <DocLink to="builder">Builder</DocLink> keeps its own public Vault of the bricks it has generated.
        Browse it at <a href="https://builder.bricowerx.com">builder.bricowerx.com</a>, or read it as JSON:
      </p>
      <Code>{`curl https://builder.bricowerx.com/api/bricks`}</Code>
      <Code title="response" lang="json">{`{
  "bricks": [
    {
      "name": "desk-booking",
      "title": "Desk Booking",
      "summary": "Members reserve a desk for a day; admins approve or cancel.",
      "status": "ok",
      "layers": ["domain", "server"]
    },
    { "name": "timekit", "title": "timekit", "status": "legacy", "layers": ["domain"] }
  ]
}`}</Code>
      <p>
        <code>status</code> is <code>ok</code> (every operation implemented and verified), <code>partial</code> (some
        operations are typed stubs) or <code>legacy</code> (hand-made reference bricks).
      </p>

      <h2 id="search-index">Search today, and next</h2>
      <p>
        <code>brico search</code> matches names, descriptions and tags through <code>index.json</code>. The planned{' '}
        <strong>knowledge layer</strong> adds summaries written at capture time and meaning-based search through a
        local index that rebuilds from the Vault. It also powers the <DocLink to="mcp">MCP server</DocLink>. The git
        directory stays the source of truth, and the index is a cache you can always delete.
      </p>
    </DocPage>
  );
}
