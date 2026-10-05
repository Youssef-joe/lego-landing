import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('mcp');

export default function Mcp() {
  return (
    <DocPage slug="mcp">
      <Callout kind="planned">
        <p>
          The MCP server is part of the knowledge layer, the phase now in progress. <code>brico mcp</code> is not in the
          released binary yet. This page describes the planned interface so you can plan around it. Tool names and
          fields may still change before release.
        </p>
      </Callout>

      <h2 id="why">Why an MCP server</h2>
      <p>
        An AI coding assistant that doesn&rsquo;t know what your team has already built will write it again. Indexing the
        whole repository is the usual fix, but it is slow and expensive and still misses code in other repositories.{' '}
        <code>brico mcp</code> gives the assistant a librarian instead of the whole library. Before writing anything,
        it asks the Vault what already exists and gets a small, precise answer, typically a few hundred tokens.
      </p>
      <p>
        It speaks the{' '}
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noreferrer">
          Model Context Protocol
        </a>
        , so it works with Claude, Cursor, IDE agents, internal copilots and any other MCP client.
      </p>

      <h2 id="tools">Planned tools</h2>
      <Table
        head={['Tool', 'Returns']}
        rows={[
          [<code key="s">search_pieces(query, kind?)</code>, 'Bricks that match the meaning of the query, not just its words. kind narrows the results.'],
          [<code key="g">get_piece(name, level)</code>, 'One brick at the level of detail the caller asks for: card, surface, summary or full source.'],
          [<code key="p">plan_reuse(task)</code>, 'For a task description: which bricks to reuse, and what is genuinely new.'],
          [<code key="r">get_relations(name, kind?)</code>, 'What a brick depends on, and what depends on it.'],
        ]}
      />
      <h3 id="levels">Detail levels for get_piece</h3>
      <Table
        head={['Level', 'Contains', 'Use it to']}
        rows={[
          [<code key="c">card</code>, 'Name, version, one-line description, tags', 'Decide whether it is relevant'],
          [<code key="su">surface</code>, 'Exported types and functions, required env vars, ports', 'Write code that calls it'],
          [<code key="sm">summary</code>, 'What it does and how, in prose', 'Explain it or judge fit'],
          [<code key="so">source</code>, 'The files', 'Read or adapt the implementation'],
        ]}
      />
      <p>
        An assistant normally starts with <code>plan_reuse</code> or <code>search_pieces</code>, reads cards and
        surfaces, and asks for source only when it needs it. That keeps answers small.
      </p>

      <h2 id="example">An example exchange</h2>
      <Code title="trace" lang="text">{`DEV    → "add jwt auth to the billing service"
TOOL   → plan_reuse("jwt auth, nest")                 · 38 tokens
VAULT  → auth@0.2.0 · card + surface                  · 244 tokens
TOOL   → "reuse auth@0.2.0; new: billing webhooks"`}</Code>

      <h2 id="setup">Planned setup</h2>
      <p>The server will run locally over stdio against the same Vault the CLI uses:</p>
      <Code title="MCP client config (planned)" lang="json">{`{
  "mcpServers": {
    "brico": {
      "command": "brico",
      "args": ["mcp"]
    }
  }
}`}</Code>
      <p>
        Add <code>&quot;--vault&quot;, &quot;/path/to/team-vault&quot;</code> to <code>args</code> to point it at a different
        Vault.
      </p>

      <h2 id="offline">Offline by design</h2>
      <p>
        The search index will live next to the Vault and rebuild from it, so the git directory stays the source of
        truth. Generating embeddings is the only step that touches a network, and it can always be skipped. Keyword
        search keeps working without it.
      </p>

      <h2 id="today">What to use today</h2>
      <p>Until the server ships, an assistant that can run shell commands gets most of the way with the CLI:</p>
      <Code>{`brico search jwt          # find candidates
brico list                # everything in the Vault`}</Code>
      <p>
        You can also put a short note in your assistant&rsquo;s project instructions, such as{' '}
        <em>&ldquo;before building a new module, run brico search for it&rdquo;</em>. Follow progress on{' '}
        <DocLink to="status">Status and roadmap</DocLink>.
      </p>
    </DocPage>
  );
}
