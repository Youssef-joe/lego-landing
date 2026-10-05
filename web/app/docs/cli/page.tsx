import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('cli');

function Flags({ rows }: { rows: [string, string][] }) {
  return (
    <Table
      head={['Flag', 'Description']}
      rows={rows.map(([flag, description]) => [<code key={flag}>{flag}</code>, description])}
    />
  );
}

export default function CliReference() {
  return (
    <DocPage slug="cli">
      <p>
        <code>brico</code> is one static Go binary. It needs no runtime. The only other tool it uses is{' '}
        <code>git</code>, for the Vault. Install it with the steps in{' '}
        <DocLink to="getting-started" hash="install">Getting started</DocLink>.
      </p>
      <Code>{`brico <command> [arguments] [flags]
brico --help                 # all commands
brico <command> --help       # one command in full
brico --version`}</Code>

      <h2 id="global-flags">Global flags</h2>
      <p>These work with every command.</p>
      <Flags
        rows={[
          ['--vault <path>', 'Use this Vault instead of the configured one. Overrides BRICO_VAULT and ~/.brico/config.json.'],
          ['--cwd <dir>', 'Run as if you were inside <dir>. Useful in scripts and monorepos.'],
          ['-h, --help', 'Show help for the command.'],
        ]}
      />

      <h2 id="overview">Commands at a glance</h2>
      <Table
        head={['Command', 'What it does']}
        rows={[
          [<a key="e" href="#extract"><code>extract</code></a>, 'Suggests modules in this project that are worth capturing'],
          [<a key="c" href="#capture"><code>capture</code></a>, 'Scans a module, writes its manifest and stores a version in the Vault'],
          [<a key="l" href="#list"><code>list</code></a>, 'Lists every brick in the Vault'],
          [<a key="s" href="#search"><code>search</code></a>, 'Searches the Vault by name, description or tag'],
          [<a key="a" href="#add"><code>add</code></a>, 'Installs a brick into this project'],
          [<a key="u" href="#upgrade"><code>upgrade</code></a>, 'Moves installed bricks to newer Vault versions, without losing local edits'],
          [<a key="r" href="#remove"><code>remove</code></a>, 'Uninstalls a brick from this project'],
          [<a key="d" href="#doctor"><code>doctor</code></a>, 'Checks the engine, adapters, Vault and project'],
          [<a key="p" href="#publish"><code>publish</code></a>, 'Pushes the Vault, or one brick, to a git repository'],
          [<a key="pl" href="#pull"><code>pull</code> / <code>update</code></a>, 'Pulls the Vault from its repository'],
          [<a key="df" href="#diff"><code>diff</code></a>, 'Shows what changed in the local Vault'],
          [<a key="ui" href="#ui"><code>ui</code></a>, 'Opens the terminal interface'],
        ]}
      />
      <p>
        Commands that change files ask for confirmation first. Pass <code>-y</code> to skip the prompt in scripts and
        CI.
      </p>

      <h2 id="extract">brico extract</h2>
      <Code>{`brico extract`}</Code>
      <p>
        Analyses the current NestJS or Next.js project and lists directories that look like self-contained modules,
        ranked by confidence. Nothing is written. Use it to decide what to <code>capture</code>.
      </p>

      <h2 id="capture">brico capture</h2>
      <Code>{`brico capture <name> [flags]`}</Code>
      <p>
        Scans a module directory, works out its npm dependencies (with versions from your <code>package.json</code>)
        and the environment variables it reads, writes a <code>brico.manifest.json</code>, and commits the snapshot
        to the Vault. Without <code>--path</code>, it uses the directory <code>extract</code> suggests for{' '}
        <code>&lt;name&gt;</code>, then <code>src/&lt;name&gt;</code>. With <code>--path</code> and no name, the name is the
        directory&rsquo;s name.
      </p>
      <Flags
        rows={[
          ['-p, --path <dir>', 'Directory to capture, relative to the project root.'],
          ['-d, --description <text>', 'One-line description, used by search.'],
          ['-t, --tags <a,b,c>', 'Comma-separated tags.'],
          ['--module-version <semver>', 'Version to publish. Defaults to 0.1.0. An existing version is never overwritten.'],
          ['--visibility <public|private>', 'Defaults to defaultVisibility in the global config.'],
          ['-y, --yes', 'Skip the confirmation prompt.'],
        ]}
      />
      <Code>{`brico capture auth -p src/auth -d "JWT auth with Passport" -t security,jwt
brico capture auth --module-version 0.2.0 -y        # publish a new version`}</Code>
      <p>Capture reports two problems before it writes anything:</p>
      <ul>
        <li>
          <strong>NOT self-contained.</strong> Imports point outside the module, through an alias such as{' '}
          <code>@/lib</code> or an escaping <code>../../</code>. Those files will not be copied, so the brick will not
          compile elsewhere. See <DocLink to="brick-rules" hash="r1">R1 and R2</DocLink>.
        </li>
        <li>
          <strong>Refusing to capture.</strong> Credential-shaped files such as <code>.env</code>, <code>*.pem</code>{' '}
          or <code>.npmrc</code> were found. The Vault is a git repository that gets pushed, so a captured secret
          would be a published secret. Template files like <code>.env.example</code> are allowed.
        </li>
      </ul>

      <h2 id="list">brico list</h2>
      <Code>{`brico list`}</Code>
      <p>Lists every brick in the Vault as a table: name, latest version, framework, tags and description.</p>

      <h2 id="search">brico search</h2>
      <Code>{`brico search <query>`}</Code>
      <p>
        Matches the query against brick names, descriptions and tags. Example: <code>brico search jwt</code>.
      </p>

      <h2 id="add">brico add</h2>
      <Code>{`brico add <name>[@version] [flags]`}</Code>
      <p>
        Resolves the version, checks that the brick&rsquo;s framework matches this project, then:
      </p>
      <ol>
        <li>copies the brick&rsquo;s files to its install path;</li>
        <li>records it in <code>brico.json</code>;</li>
        <li>appends its required environment variables to <code>.env.example</code>;</li>
        <li>prints the wiring steps for your framework.</li>
      </ol>
      <Flags
        rows={[
          ['--path <dir>', 'Install somewhere other than the manifest or adapter default.'],
          ['-y, --yes', 'Skip confirmation prompts, including the one for a non-empty target directory.'],
          ['--force', 'Install even when no supported framework is detected. The framework check is skipped.'],
        ]}
      />
      <Code>{`brico add auth                 # latest
brico add auth@^0.2.0          # newest compatible
brico add auth --path src/modules/auth`}</Code>
      <Callout kind="warn">
        <p>
          The wiring steps are printed, not applied. You still register the module, mount routes and install npm
          packages yourself. Only add bricks from Vaults you trust: <code>add</code> doesn&rsquo;t yet confine the paths a
          manifest names. See <DocLink to="security">Security model</DocLink>.
        </p>
      </Callout>

      <h2 id="upgrade">brico upgrade</h2>
      <Code>{`brico upgrade [name][@version] [flags]`}</Code>
      <p>
        Moves each installed brick, or just <code>name</code>, to the latest version (or the given{' '}
        <code>@version</code>) in the Vault it came from. It compares your installed files with the Vault copy of the
        installed version, so it knows what you changed:
      </p>
      <ul>
        <li>
          A brick with <strong>local edits</strong> is reported as dirty and skipped. With <code>--force</code>, the
          installed copy is first backed up next to itself as{' '}
          <code>&lt;path&gt;.brico-backup-&lt;timestamp&gt;</code>, then overwritten.
        </li>
        <li>
          Files the new version drops are deleted only if you never changed them. Files you changed are kept and
          reported.
        </li>
        <li>Files you added that the brick never listed are never touched.</li>
      </ul>
      <Flags
        rows={[
          ['--check', 'Report available upgrades and their state; change nothing.'],
          ['-y, --yes', 'Skip confirmation prompts.'],
          ['--force', 'Upgrade dirty bricks too, after backing them up.'],
        ]}
      />
      <Code>{`brico upgrade --check          # what could move?
brico upgrade auth@0.3.0`}</Code>

      <h2 id="remove">brico remove</h2>
      <Code>{`brico remove <name> [-y]       # alias: brico rm`}</Code>
      <p>
        Prints the framework cleanup steps, deletes the brick&rsquo;s install directory, and drops it from{' '}
        <code>brico.json</code>. The Vault is not touched.
      </p>
      <Callout kind="warn">
        <p>
          <code>remove</code> deletes the <strong>whole</strong> install directory, including files you added to it.
          Commit first.
        </p>
      </Callout>

      <h2 id="doctor">brico doctor</h2>
      <Code>{`brico doctor`}</Code>
      <p>Runs a checklist and exits non-zero if any check fails, so it works as a CI step:</p>
      <ul>
        <li>engine version and registered adapters;</li>
        <li>framework detection and an adapter for it;</li>
        <li>the Vault: it opens, its index loads, and the latest version of every brick is intact;</li>
        <li>
          the project: <code>brico.json</code> parses, and every installed brick is present at its path.
        </li>
      </ul>

      <h2 id="publish">brico publish</h2>
      <Code>{`brico publish [brick] [flags]`}</Code>
      <p>
        Pushes the whole Vault, or every version of one brick, to a git repository. The first time, it asks for your
        main repository and saves it as <code>publishRepo</code> in <code>~/.brico/config.json</code>. Publishing one
        brick merges it into what the target repository already has and reconciles the index. Pushes use your
        existing git credentials.
      </p>
      <Flags
        rows={[
          ['--repo <url>', 'Publish to this repository, without prompting.'],
          ['-l, --elsewhere', 'Publish to a different repository; prompts for its URL.'],
          ['--branch <name>', 'Remote branch to push to. Default main.'],
          ['-y, --yes', 'Skip the confirmation prompt.'],
        ]}
      />
      <Code>{`brico publish                                   # whole Vault → main repo
brico publish auth                              # one brick, all versions
brico publish --repo git@github.com:acme/team-vault.git`}</Code>

      <h2 id="pull">brico pull and brico update</h2>
      <Code>{`brico pull [--repo <url>]
brico update                   # same as pull`}</Code>
      <p>
        Pulls the Vault from its configured repository (the <code>main</code> branch), or from{' '}
        <code>--repo</code>. If nothing is configured, run <code>brico publish</code> once or pass{' '}
        <code>--repo</code>.
      </p>

      <h2 id="diff">brico diff</h2>
      <Code>{`brico diff`}</Code>
      <p>Shows the git status of the local Vault: what has changed since it was last published or pulled.</p>

      <h2 id="ui">brico ui</h2>
      <Code>{`brico ui`}</Code>
      <p>
        Opens the full-screen terminal interface. See <DocLink to="tui">Terminal UI</DocLink>.
      </p>

      <h2 id="not-yet">Not in the binary yet</h2>
      <p>
        <code>brico create</code> (new projects from templates) and <code>brico mcp</code> (the{' '}
        <DocLink to="mcp">MCP server</DocLink>) are designed but not registered as commands. They will appear in{' '}
        <code>brico --help</code> once they produce real results.
      </p>
    </DocPage>
  );
}
