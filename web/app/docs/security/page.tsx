import { Callout, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('security');

export default function Security() {
  return (
    <DocPage slug="security">
      <p>
        A tool that writes source files into your repository is privileged by nature. This page says what each part of
        BricoWerx protects, and, just as plainly, what it doesn&rsquo;t protect yet. We would rather name a gap than imply
        a protection we haven&rsquo;t shipped. Each gap is removed from the list when its fix lands.
      </p>

      <h2 id="protections">What is protected today</h2>
      <h3 id="cli">CLI and Vault</h3>
      <ul>
        <li>
          <strong>No secrets in the Vault.</strong> <code>capture</code> refuses a directory that contains credential
          files (<code>.env</code>, <code>*.pem</code>, <code>.npmrc</code> and similar). There is no override, and{' '}
          <code>-y</code> doesn&rsquo;t skip the check.
        </li>
        <li>
          <strong>Immutable versions.</strong> A stored version is never overwritten, and every change is a git commit
          you can audit.
        </li>
        <li>
          <strong>Confirmation before changes.</strong> Commands that write or delete ask first.
        </li>
        <li>
          <strong>Upgrades keep your edits.</strong> <code>upgrade</code> skips bricks you have changed, and backs them
          up before overwriting when you pass <code>--force</code>.
        </li>
        <li>
          <strong>Verified installs.</strong> The install script and the npm package check the binary against the
          release&rsquo;s SHA-256 checksums.
        </li>
      </ul>
      <h3 id="builder">Builder</h3>
      <ul>
        <li>Model-written code is statically checked before it runs: no imports, network, process access, timers, <code>eval</code>, clock or randomness.</li>
        <li>Tests run in a child process with no API keys in its environment and a hard timeout.</li>
        <li>Bricks are built outside the app and installed only after every gate passes. Existing bricks are never overwritten.</li>
        <li>Model keys stay on the server. Access is invite-only, with rate limits and request validation.</li>
      </ul>
      <h3 id="scanner">Scanner</h3>
      <ul>
        <li>No access to any site at install. Access is granted per tab or per site, when you ask for a scan.</li>
        <li>Body values are discarded in the page, not masked. Credential headers, cookies, query values and URL credentials never leave the page.</li>
        <li>Nothing is sent anywhere until you click Build.</li>
      </ul>

      <h2 id="limitations">Known limitations</h2>
      <Table
        head={['Limitation', 'Impact', 'What to do today']}
        rows={[
          [<span key="1"><code>brico add</code> doesn&rsquo;t confine file paths</span>, 'A malicious manifest could name a path outside the install directory', 'Only add bricks from Vaults you control or authors you trust'],
          [<span key="2"><code>brico remove</code> deletes the whole install directory</span>, 'Files you added inside it are deleted too', 'Commit before removing'],
          ['The Worker’s local bridge is unauthenticated', 'Any local process can queue jobs against your Mistral key', 'Run the Worker only on your own machine, only while you use it'],
          ['The Worker may connect as the database owner', 'Row-level security is bypassed', 'Use a least-privileged role, on a database you own'],
          ['Generated bricks aren’t flagged at install', 'Machine-written code can be installed without a prompt', 'Check a brick’s origin before adding it'],
          ['Vault content isn’t hashed or signed', 'Tampering with a Vault can’t be detected', 'Keep Vault repositories private and trusted'],
        ]}
      />

      <h2 id="generated-code">Machine-generated code</h2>
      <p>
        Bricks from the <DocLink to="builder">Builder</DocLink> and the <DocLink to="worker">Worker</DocLink> are written
        partly by language models. They are typechecked and tested before they are installed, but{' '}
        <strong>passing tests is not a security review</strong>. Read generated code before you ship it.
      </p>

      <h2 id="data">Third-party data transfer</h2>
      <p>
        Two features send data to model providers. The <strong>Builder</strong> sends your interview answers and the
        prompts for each function to the free-tier providers you configure. The <strong>Worker</strong> sends
        implementation prompts, built from scanner evidence that has already had its values removed, to Mistral.
        The CLI, the Vault and the terminal UI send nothing anywhere, except git pushes and pulls you start yourself.
      </p>

      <Callout kind="note" title="Reporting a vulnerability">
        <p>
          Please report security problems privately, as described in <code>SECURITY.md</code> in the BricoWerx
          repository, and not in a public issue.
        </p>
      </Callout>
    </DocPage>
  );
}
