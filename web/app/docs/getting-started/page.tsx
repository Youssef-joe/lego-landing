import { Callout, Code, DocLink, DocPage, Steps } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('getting-started');

export default function GettingStarted() {
  return (
    <DocPage slug="getting-started">
      <p>
        This guide installs <code>brico</code>, captures a module from one project into a Vault, and adds it to a
        second project. You need a terminal and <code>git</code>. Supported projects are <strong>Next.js</strong> and{' '}
        <strong>NestJS</strong>, written in TypeScript.
      </p>

      <h2 id="install">Install the CLI</h2>
      <p>
        <code>brico</code> is a single static binary with no runtime dependencies. Choose one method:
      </p>

      <h3 id="install-script">Install script (macOS, Linux)</h3>
      <Code>{`curl -fsSL https://raw.githubusercontent.com/ScienceWerx-Inc/bricowerx/main/scripts/install.sh | sh`}</Code>
      <p>
        The script downloads the release binary for your OS and architecture, checks it against the release&rsquo;s{' '}
        <code>SHA256SUMS.txt</code>, and installs it to <code>~/.local/bin</code>. To change that, set these variables
        before running it:
      </p>
      <Code>{`# install a specific version into /usr/local/bin
curl -fsSL https://raw.githubusercontent.com/ScienceWerx-Inc/bricowerx/main/scripts/install.sh \\
  | BRICO_VERSION=0.1.0 BRICO_INSTALL_DIR=/usr/local/bin sh`}</Code>

      <h3 id="install-npm">npm</h3>
      <Code>{`npm install -g brico`}</Code>
      <p>The npm package downloads the same checksummed release binary.</p>

      <h3 id="install-source">From source</h3>
      <p>Requires Go. The result is the same binary.</p>
      <Code>{`git clone https://github.com/ScienceWerx-Inc/bricowerx.git
cd bricowerx/engine
go build -o ../brico ./cmd/brico`}</Code>

      <p>Confirm it works:</p>
      <Code>{`brico --version
brico doctor`}</Code>

      <h2 id="first-brick">Capture and reuse your first brick</h2>
      <p>
        The repository ships two example NestJS apps: <code>examples/nest-source</code>, which has a JWT auth
        module, and <code>examples/nest-target</code>, which doesn&rsquo;t. The steps below use a throwaway Vault, so
        nothing touches your real one. Run them from the repository root.
      </p>
      <Steps>
        <li>
          <strong>Point brico at a scratch Vault</strong>
          <Code>{`export BRICO_VAULT="$(mktemp -d)"`}</Code>
          <p>
            Without this, the Vault defaults to <code>~/.brico/vault</code>. You can also pass{' '}
            <code>--vault &lt;path&gt;</code> to any command.
          </p>
        </li>
        <li>
          <strong>Find reusable modules</strong>
          <Code>{`brico --cwd examples/nest-source extract`}</Code>
          <p>
            <code>extract</code> lists modules that look self-contained, ranked by confidence. <code>--cwd</code> runs a
            command as if you were inside that directory.
          </p>
        </li>
        <li>
          <strong>Capture one into the Vault</strong>
          <Code>{`brico --cwd examples/nest-source capture auth -y \\
  -d "JWT authentication with Passport and bcrypt" \\
  -t security,jwt,auth`}</Code>
          <p>
            <code>capture</code> scans the module&rsquo;s files, imports and environment variables, writes a{' '}
            <code>brico.manifest.json</code>, and commits the snapshot to the Vault as version <code>0.1.0</code>.
          </p>
        </li>
        <li>
          <strong>Find it again</strong>
          <Code>{`brico list
brico search jwt`}</Code>
        </li>
        <li>
          <strong>Add it to another project</strong>
          <Code>{`brico --cwd examples/nest-target add auth -y`}</Code>
          <p>
            <code>add</code> copies the files to the framework&rsquo;s install path, records the module in{' '}
            <code>brico.json</code>, appends its required variables to <code>.env.example</code>, and prints the wiring
            steps for your framework.
          </p>
        </li>
        <li>
          <strong>Check the result</strong>
          <Code>{`brico --cwd examples/nest-target doctor`}</Code>
        </li>
      </Steps>

      <Callout kind="warn" title="Wiring is still manual">
        <p>
          <code>brico add</code> copies files. It doesn&rsquo;t edit your app module, routes or imports for you. The
          steps it prints at the end are instructions to follow by hand. See{' '}
          <DocLink to="status">Status and roadmap</DocLink>.
        </p>
      </Callout>

      <h2 id="your-own-project">In your own project</h2>
      <Code>{`cd ~/code/api-one
brico extract                       # what looks reusable here?
brico capture billing -p src/billing -d "Stripe billing" -t payments
cd ~/code/api-two                   # another app on the same framework
brico add billing@^0.1.0`}</Code>
      <p>
        Version ranges follow semver: <code>billing</code> takes the latest version, <code>billing@0.2.0</code> an exact
        version, <code>billing@^0.1.0</code> the newest compatible one and <code>billing@~0.1.0</code> the newest patch.
      </p>
      <p>
        A brick records the framework it was captured from, and <code>add</code> refuses to put a NestJS brick into a
        Next.js app or the other way round. To make one brick usable in any Next.js app regardless of its aliases or
        design system, follow the <DocLink to="brick-rules">brick rules</DocLink>.
      </p>

      <h2 id="next">Next steps</h2>
      <ul>
        <li>
          Share the Vault with your team: <DocLink to="vault" hash="sharing">publish and pull</DocLink>.
        </li>
        <li>
          Make bricks that install cleanly anywhere: <DocLink to="brick-rules">brick rules</DocLink>.
        </li>
        <li>
          Author a new brick without writing the scaffolding: <DocLink to="builder">Builder</DocLink>.
        </li>
        <li>
          Every command and flag: <DocLink to="cli">CLI reference</DocLink>.
        </li>
      </ul>
    </DocPage>
  );
}
