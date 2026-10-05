import { Callout, Code, DocLink, DocPage, Steps, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('builder');

export default function Builder() {
  return (
    <DocPage slug="builder">
      <p>
        The Builder makes a new brick from a conversation. It interviews you one decision at a time and turns your
        answers into a typed specification, the <strong>BrickSpec</strong>. A deterministic engine then generates
        the brick from that spec.
      </p>
      <p>
        A language model is used for two narrow jobs: turning free-text answers into small pieces of JSON, and writing
        the body of one function at a time. Nothing the model writes is accepted until it typechecks and passes the
        acceptance tests derived from your spec.
      </p>
      <p>
        Open it at <a href="https://builder.bricowerx.com/builder">builder.bricowerx.com</a>. Using it currently needs
        an invite. Browsing the Vault of bricks it has built is open to everyone.
      </p>

      <h2 id="flow">How a brick gets built</h2>
      <Steps>
        <li>
          <strong>Interview</strong>
          <p>
            Each question is a card. Every option lists its pros and cons, and one is marked as recommended. Click an
            option or type your own answer.
          </p>
        </li>
        <li>
          <strong>Specification</strong>
          <p>
            The Spec tab fills in as you answer: purpose, architecture, data model, lifecycles, operations, interface
            and requirements. <em>Approve spec and build</em> unlocks only when the spec passes strict validation.
          </p>
        </li>
        <li>
          <strong>Build</strong>
          <p>
            The engine scaffolds the brick from templates, asks a model for one function body at a time, and runs
            every gate. You watch it happen in the Build tab.
          </p>
        </li>
        <li>
          <strong>Use</strong>
          <p>
            The finished brick gets a page with its files and traced requirements, a live preview, an install kit
            and a zip download.
          </p>
        </li>
      </Steps>

      <h2 id="interview">The interview</h2>
      <p>The decisions, in order:</p>
      <Table
        head={['Decision', 'What you choose']}
        rows={[
          ['Purpose', 'One sentence, in your own words'],
          ['Layers', 'Domain only, or with a UI, a server, or both'],
          ['Persistence', 'Repository-backed entities, or stateless'],
          ['Data model', 'The entities and their fields, in your own words'],
          ['Lifecycle', 'Whether status fields follow declared transitions'],
          ['Operations', 'What the brick must do'],
          ['Interface', 'A list, detail or form component'],
          ['Data flow', 'Props from the host, or a generated server action'],
          ['Permissions', 'Which host capabilities guard which operations'],
          ['Events', 'Whether operations emit events the host can react to'],
        ]}
      />

      <h3 id="writing-operations">Writing operations precisely</h3>
      <p>
        Write an operation as a signature, and it is parsed exactly, with no model involved. The model only writes
        its examples:
      </p>
      <Code lang="text">{`markRead(notificationId): sets status to read, fails with NOT_FOUND
archive(notificationId): sets status to archived, fails with NOT_FOUND or ALREADY_ARCHIVED
listUnread(userId, limit): returns the newest unread notifications`}</Code>
      <h3 id="what-uses-no-model">What uses no model at all</h3>
      <ul>
        <li>clicked choices, and typed answers that clearly match an option;</li>
        <li>the lifecycle, built in the order you declare it;</li>
        <li>the UI component, derived from the data model and operations;</li>
        <li>operations written as signatures.</li>
      </ul>
      <p>
        Other free text goes through one small JSON extraction for that step. The engine fixes the usual small-model
        mistakes itself: it normalises names to camelCase or PascalCase, coerces loose types (<code>&quot;integer&quot;</code>{' '}
        becomes <code>int</code>), fills in seed rows, and drops examples that still fail. A step that still
        doesn&rsquo;t validate after two corrections stays open and tells you exactly what to type.
      </p>
      <Callout kind="tip">
        <p>
          Anything you type when no question is open counts as a change request, for example &ldquo;rename the field
          to dueAt&rdquo; or &ldquo;add an operation to reopen a ticket&rdquo;. Your spec and the interview log are kept in
          your browser, so a reload restores both.
        </p>
      </Callout>

      <h2 id="validation">What the spec must pass</h2>
      <ul>
        <li>every operation is covered by a requirement (<code>REQ-1</code>, <code>REQ-2</code>, …);</li>
        <li>every example is checked against the declared types;</li>
        <li>capabilities belong to the host contract;</li>
        <li>domain operations are pure.</li>
      </ul>

      <h2 id="pipeline">The build pipeline</h2>
      <Table
        head={['Stage', 'What happens']}
        rows={[
          ['1. Validate', 'Strict BrickSpec parse'],
          ['2. Plan', 'The file set and the list of function slots to fill'],
          ['3. Scaffold', 'Templates write the brick into a staging area, outside your app'],
          ['4. Baseline gates', 'Every gate runs with every body stubbed. A failure here is an engine bug, and the build stops'],
          ['5. Implement', 'One slot at a time: the model writes a body; guard, tsc and tests decide; errors go back, up to 3 tries'],
          ['6. Verify', 'All gates on the complete brick'],
          ['7. Trace', 'Each REQ-n is linked to the tests that prove it'],
          ['8. Install', 'One atomic rename into src/features, plus the host adapter, preview entry, spec and report'],
        ]}
      />
      <p>Every build ends in one of three results:</p>
      <Table
        head={['Result', 'Meaning']}
        rows={[
          [<code key="o">ok</code>, 'Every operation is implemented and every requirement is satisfied.'],
          [<code key="p">partial</code>, 'Some operations are typed NotImplemented stubs and their tests are marked todo. The brick still installs, and the report lists what is missing.'],
          [<code key="f">failed</code>, 'A structural gate failed. Nothing is written.'],
        ]}
      />

      <h3 id="gates">Gates</h3>
      <Table
        head={['Gate', 'What it enforces']}
        rows={[
          ['Builder harness', 'Paths stay inside the brick, no secrets, no aliased imports, explicit process.env.NAME reads, a single module'],
          ['brick-lint (R1–R6)', 'Relative imports only, nothing escapes the brick, no dynamic imports, ui/ and server/ kept apart'],
          ['Contract hash (R8)', 'The vendored host/contract.ts is byte-identical to the host contract'],
          ['TypeScript', 'The brick typechecks under the strictest tsconfig'],
          ['Tests (R12)', 'The generated acceptance and lifecycle tests pass, and the brick ships them'],
        ]}
      />

      <h2 id="build-view">The live build view</h2>
      <p>
        The Build tab streams the engine&rsquo;s events and shows them as sheets that fill in while it works:
      </p>
      <Table
        head={['Sheet', 'Shows']}
        rows={[
          ['Work order', 'The eight stages and how long each took'],
          ['Blueprint', 'The planned file tree; files light up as they are written'],
          ['Drafting', 'The file being written right now, with syntax highlighting'],
          ['Operations', 'Each slot with its attempts, the model used and the repair messages'],
          ['Inspection', 'Each gate with its result, timing and pass / fail / todo counts'],
          ['Requirements', 'Every REQ-n, ticked as its tests pass'],
        ]}
      />
      <p>
        Builds can be replayed. Reload the page, or open <code>/builder?build=&lt;id&gt;</code>, to reconnect and replay
        a build from the start.
      </p>

      <h2 id="using">Using a generated brick</h2>
      <Table
        head={['Where', 'What for']}
        rows={[
          [<code key="b">/bricks/&lt;name&gt;</code>, 'Files, traced requirements, gate re-runs, and the ports, capabilities, env vars and packages the brick uses'],
          ['Install kit', 'Copy-ready brico capture, brico add and verification commands, a wiring snippet and a manifest preview'],
          ['Download', 'A zip with the brick, its host adapter, spec, build report, manifest preview and INSTALL.md'],
          [<code key="p">/preview/&lt;name&gt;</code>, 'The component in a neutral host, and a playground that runs the real operations on in-memory data'],
        ]}
      />
      <p>
        The brick has no imports outside its own folder, so the simplest install is to copy it. To put a Builder brick
        into your own Next.js app:
      </p>
      <Steps>
        <li>
          <strong>Get the files</strong>
          <p>
            Download the zip from the brick&rsquo;s page. It contains <code>&lt;name&gt;/</code> (the brick),{' '}
            <code>host-adapter/</code>, the spec, the build report and an <code>INSTALL.md</code> written for that brick.
          </p>
        </li>
        <li>
          <strong>Install the brick</strong>
          <p>
            Copy <code>&lt;name&gt;/</code> to <code>src/features/&lt;name&gt;/</code>. Or, to version it, capture it into your
            Vault and add it with the commands from the install kit:
          </p>
          <Code>{`brico capture <name> -p src/features/<name> --module-version 0.1.0 -y   # where the brick is
brico add <name> -y                                                      # in the target app`}</Code>
        </li>
        <li>
          <strong>Wire it to your app</strong>
          <p>
            Copy the <code>host-adapter/</code> files into your own composition folder, such as <code>src/brico/</code>,
            and connect them to your auth, routing, translations and storage. This is the one file per brick that
            knows about your app.
          </p>
        </li>
        <li>
          <strong>Verify</strong>
          <Code>{`npx vitest run src/features/<name>`}</Code>
          <p>The brick ships its own tests and an in-memory repository, so they pass with no database.</p>
        </li>
      </Steps>

      <h2 id="safety">Safety</h2>
      <ul>
        <li>
          <strong>Static guard.</strong> Model-written code is checked before it runs. Imports, <code>require</code>,{' '}
          <code>process</code>, network access, timers, <code>eval</code>, the clock and randomness are rejected.
        </li>
        <li>
          <strong>Isolated tests.</strong> Tests run in a child process with no API keys in its environment and a hard
          timeout.
        </li>
        <li>
          <strong>Staging.</strong> Bricks are built outside the app. The app only sees a brick after it has passed
          every gate.
        </li>
        <li>
          <strong>No overwrites.</strong> An existing brick is never replaced.
        </li>
        <li>
          <strong>Access and limits.</strong> Invite-only access, per-person rate limits and request size checks. The
          shared public demo allows 3 builds an hour and 40 interview steps every 10 minutes per person.
        </li>
      </ul>

      <h2 id="self-host">Running your own Builder</h2>
      <p>
        The Builder runs its engine inside a long-lived Next.js server, because builds take minutes and run{' '}
        <code>tsc</code> and vitest. It can&rsquo;t run on serverless hosting. Locally:
      </p>
      <Code>{`cd apps/workbench
npm install
cp .env.example .env.local      # add at least one provider key
npm run dev                     # http://localhost:3000/builder`}</Code>
      <p>
        Requires Node.js 20 or later. It only uses free model tiers, and any key you add becomes an automatic fallback.
        A local model through Ollama keeps it working when every cloud tier is rate-limited. All variables are in{' '}
        <DocLink to="configuration" hash="builder">Configuration</DocLink>.
      </p>

      <h2 id="limits">Current limits</h2>
      <ul>
        <li>The Builder creates new bricks only. Editing an existing brick through its spec isn&rsquo;t supported yet.</li>
        <li>Generated bricks target Next.js.</li>
        <li>
          Free-tier models vary. An operation the model can&rsquo;t implement within its budget is left as a typed stub
          and reported. The brick is then <code>partial</code>, never silently wrong.
        </li>
      </ul>
    </DocPage>
  );
}
