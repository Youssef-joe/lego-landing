import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('worker');

export default function Worker() {
  return (
    <DocPage slug="worker">
      <p>
        <code>brico-worker</code> is the back end for the <DocLink to="scanner">Scanner</DocLink>. It takes the features
        you selected in the browser and, for each one:
      </p>
      <ol>
        <li>claims the job from a Postgres queue;</li>
        <li>asks a model to implement the feature from the evidence the scanner observed;</li>
        <li>typechecks the result against the endpoints that were actually seen;</li>
        <li>sends the compiler errors back to the model for repair, up to three attempts by default;</li>
        <li>publishes the brick to your Vault as an ordinary module.</li>
      </ol>
      <p>
        The result is a normal brick. <code>brico list</code>, <code>brico add</code> and the{' '}
        <DocLink to="tui">terminal UI</DocLink> treat it like any other.
      </p>

      <h2 id="requirements">Requirements</h2>
      <ul>
        <li>Go, to build or run it from source;</li>
        <li>
          a Postgres 16 database with the BricoWerx migrations applied (<code>db/migrate.sh</code>);
        </li>
        <li>a Mistral API key;</li>
        <li>
          <code>node_modules</code> in the repository, so generated code is typechecked against real framework types.
        </li>
      </ul>

      <h2 id="run">Run it locally</h2>
      <Code>{`export DATABASE_URL='postgres://brico_app:…@localhost:5432/brico'
export MISTRAL_API_KEY='…'

./db/migrate.sh                       # idempotent; run it on every upgrade
cd engine
go run ./cmd/brico-worker             # poll for jobs and serve the extension`}</Code>
      <p>
        If <code>DATABASE_URL</code> or <code>MISTRAL_API_KEY</code> isn&rsquo;t set, the worker reads it from{' '}
        <code>db/.env.local</code> in the repository. While it runs, the extension&rsquo;s side panel reports it as ready,
        with its model and Vault.
      </p>

      <h2 id="flags">Flags</h2>
      <Table
        head={['Flag', 'Default', 'Description']}
        rows={[
          [<code key="o">-once</code>, 'off', 'Process one job and exit. Useful as a smoke test.'],
          [<code key="p">-poll</code>, <code key="pd">5s</code>, 'How often to look for queued jobs.'],
          [<code key="a">-attempts</code>, <code key="ad">3</code>, 'Generate, typecheck and repair attempts per job.'],
          [<code key="v">-vault</code>, 'BRICO_VAULT or the configured Vault', 'Where finished bricks are published.'],
          [<code key="r">-repo</code>, 'found by walking up', 'Repository root, used to find db/.env.local and node_modules.'],
          [<code key="l">-listen</code>, <code key="ld">127.0.0.1:7717</code>, 'Loopback address for the extension. Pass an empty value to turn the bridge off.'],
        ]}
      />
      <p>
        <code>MISTRAL_MODEL</code> overrides the model. The default is <code>codestral-latest</code>.
      </p>

      <h2 id="bridge">The extension bridge</h2>
      <p>The worker serves a small HTTP API on loopback for the extension:</p>
      <Table
        head={['Endpoint', 'Purpose']}
        rows={[
          [<code key="h">GET /v1/health</code>, 'Is the worker up, and which model and Vault does it use?'],
          [<code key="c">POST /v1/captures</code>, 'Submit the selected features as a capture; queues one job per feature'],
          [<code key="j">GET /v1/jobs</code>, 'Job status, which the side panel polls'],
        ]}
      />
      <p>
        It only binds to a loopback address and refuses anything else.
      </p>
      <Callout kind="warn" title="The bridge trusts every local process">
        <p>
          The bridge has no authentication yet. Any program on your machine can queue jobs that spend against your
          Mistral key. Run the worker only on a machine you control, only while you use it, and never on a shared
          host.
        </p>
      </Callout>

      <h2 id="hosted">Hosted deployment</h2>
      <Code>{`docker build -f engine/Dockerfile.worker -t brico-worker .
docker run -e DATABASE_URL -e MISTRAL_API_KEY brico-worker -once   # smoke test`}</Code>
      <p>
        A hosted worker runs with <code>-listen &quot;&quot;</code>, so the bridge is off and jobs arrive only through the
        database. The repository&rsquo;s <code>render.yaml</code> deploys the database, migrations and worker together.
        Fly and Railway use the same image.
      </p>
      <Callout kind="warn">
        <p>
          Connect the worker as a least-privileged database role, never as the owner. The owner bypasses row-level
          security, which is what keeps one user&rsquo;s captures apart from another&rsquo;s.
        </p>
      </Callout>

      <h2 id="review">Review what it generates</h2>
      <p>
        A model writes worker bricks from observed evidence. They are typechecked before they are published, but
        <strong> typechecking is not a security review</strong>. Read a generated brick before you ship it.
      </p>
    </DocPage>
  );
}
