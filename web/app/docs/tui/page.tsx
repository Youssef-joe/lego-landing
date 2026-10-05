import { Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('tui');

export default function TerminalUi() {
  return (
    <DocPage slug="tui">
      <Code>{`brico ui
brico --vault ~/team-vault ui     # browse a different Vault`}</Code>
      <p>
        <code>brico ui</code> opens a full-screen interface in your terminal that shows the Vault as a grid of bricks.
        It is the quickest way to see what your team already has before you start something new.
      </p>

      <h2 id="what-you-see">What you see</h2>
      <ul>
        <li>
          <strong>The grid.</strong> Every brick in the Vault, filterable as you type.
        </li>
        <li>
          <strong>Brick details.</strong> For the selected brick: its version history, tags, required environment
          variables, files and dependencies, all read from its manifest.
        </li>
        <li>
          <strong>Doctor.</strong> The same checks as <DocLink to="cli" hash="doctor">brico doctor</DocLink>.
        </li>
        <li>
          <strong>Extract.</strong> Inside a NestJS or Next.js project, the candidate bricks ranked by confidence, the
          same list as <DocLink to="cli" hash="extract">brico extract</DocLink>.
        </li>
      </ul>

      <h2 id="keys">Keys</h2>
      <Table
        head={['Key', 'Action']}
        rows={[
          [<code key="a">← ↑ → ↓</code>, 'Move between bricks'],
          [<code key="f">/</code>, 'Filter by name, tag or description'],
          [<code key="d">d</code>, 'Run doctor'],
          [<code key="e">e</code>, 'Show extract candidates for the current project'],
          [<code key="h">?</code>, 'Show the key map'],
          [<code key="q">q</code>, 'Quit'],
        ]}
      />

      <h2 id="read-only">Read-only by design</h2>
      <p>
        The interface only displays information. It doesn&rsquo;t install, capture or delete anything. Every fact comes
        from the same engine functions the commands use, so the interface and the commands can&rsquo;t disagree. To act
        on what you find, quit and use <code>brico add</code> or <code>brico capture</code>.
      </p>
    </DocPage>
  );
}
