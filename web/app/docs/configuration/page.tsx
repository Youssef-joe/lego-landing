import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('configuration');

const c = (text: string) => <code key={text}>{text}</code>;

export default function Configuration() {
  return (
    <DocPage slug="configuration">
      <h2 id="cli">brico CLI</h2>
      <Table
        head={['Variable', 'Description']}
        rows={[
          [c('BRICO_VAULT'), 'Vault location. Overrides vaultPath in the config; overridden by --vault'],
          [c('BRICO_PUBLISH_REPO'), 'Repository for publish and pull. Overrides publishRepo; overridden by --repo'],
        ]}
      />
      <p>
        The config file keys are in <DocLink to="manifest" hash="global-config">Manifest and project files</DocLink>.
      </p>

      <h3 id="installer">Install script</h3>
      <Table
        head={['Variable', 'Default', 'Description']}
        rows={[
          [c('BRICO_VERSION'), 'latest', 'Version to install, without the leading v'],
          [c('BRICO_INSTALL_DIR'), c('~/.local/bin'), 'Where to put the binary'],
          [c('BRICO_RELEASE_BASE'), 'GitHub releases', 'Alternative download location, such as an internal mirror'],
          [c('GITHUB_TOKEN'), '—', 'Used to look up the latest release, if set'],
        ]}
      />

      <h2 id="builder">Builder</h2>
      <p>
        Set these in <code>apps/workbench/.env.local</code>. Keys stay on the server. Never prefix them with{' '}
        <code>NEXT_PUBLIC_</code>.
      </p>
      <h3 id="providers">Model providers</h3>
      <p>The Builder only uses free tiers. Add as many keys as you have, and each one becomes a fallback.</p>
      <Table
        head={['Provider', 'Key', 'Default chat / slot model', 'Guard']}
        rows={[
          [c('openrouter'), c('OPENROUTER_API_KEY'), c('openrouter/free'), <span key="o">Only <code>openrouter/free</code> or <code>:free</code> models</span>],
          [c('mistral'), c('MISTRAL_API_KEY'), <span key="m"><code>mistral-small-latest</code> / <code>codestral-latest</code></span>, 'Experiment plan'],
          [c('google'), c('GOOGLE_GENERATIVE_AI_API_KEY'), c('gemini-2.5-flash'), 'Flash models only'],
          [c('groq'), c('GROQ_API_KEY'), c('llama-3.3-70b-versatile'), 'Free tier'],
          [c('local'), <span key="l">none; set <code>BRICO_LOCAL_MODEL</code></span>, <span key="lm"><code>qwen2.5:3b</code> / <code>BRICO_LOCAL_SLOT_MODEL</code></span>, 'Any OpenAI-compatible server; no rate limit'],
        ]}
      />
      <h3 id="model-chain">Model chain</h3>
      <Table
        head={['Variable', 'Default', 'Description']}
        rows={[
          [c('BRICO_AI_PROVIDER'), c('openrouter'), 'First provider tried'],
          [c('BRICO_AI_MODEL'), c('openrouter/free'), 'Interview model'],
          [c('BRICO_AI_SLOT_MODEL'), 'BRICO_AI_MODEL', 'Model that writes function bodies'],
          [c('BRICO_AI_FALLBACKS'), '—', <span key="f">Explicit order, for example <code>mistral:codestral-latest,groq</code></span>],
          [c('BRICO_AI_AUTO_FALLBACK'), c('true'), 'Use every other provider with a key as a fallback'],
          [c('BRICO_LOCAL_MODEL'), '—', 'Turns on the local provider as the last fallback'],
          [c('BRICO_LOCAL_SLOT_MODEL'), '—', <span key="ls">Local model for function bodies, for example <code>qwen2.5-coder:3b</code></span>],
          [c('BRICO_LOCAL_URL'), c('http://localhost:11434/v1'), 'OpenAI-compatible endpoint (Ollama by default)'],
          [c('BRICO_LOCAL_API_KEY'), '—', 'Key for that endpoint, if it needs one'],
          [c('BRICO_LOCAL_TOOLS'), c('on'), <span key="lt">Set to <code>off</code> if your local model doesn’t support tool calls</span>],
        ]}
      />
      <p>
        When a provider fails (rate limit, no quota, outage or timeout), the step moves to the next model in the chain
        without showing an error. <code>openrouter/free</code> is resolved into a ranked list of free chat models from
        OpenRouter&rsquo;s public catalogue, refreshed hourly.
      </p>
      <h3 id="access">Server and access</h3>
      <Table
        head={['Variable', 'Description']}
        rows={[
          [c('BRICO_APP_URL'), <span key="a">Public URL of the Builder, for example <code>http://localhost:3000</code></span>],
          [c('BRICO_BUILDER_ACCESS_KEY'), 'Optional shared key for the Builder endpoints. The UI asks for it once per tab'],
          [c('BRICO_ACCESS_MODE'), <span key="m"><code>token</code> requires a personal invite to use the Builder. The Vault stays public</span>],
          [c('BRICO_SESSION_SECRET'), 'Secret that signs invite sessions in token mode'],
          [c('BRICO_REQUEST_ACCESS_URL'), 'Where the access page sends people without an invite'],
          [c('BRICO_PUBLIC_DEMO'), <span key="d"><code>true</code> marks the Builder as a shared demo and applies per-person limits: 3 builds an hour, 40 interview steps and 6 gate re-runs every 10 minutes</span>],
          [c('BRICO_MAX_GENERATED'), 'In public demo mode, keep at most this many generated bricks and remove the oldest. Shipped bricks are never removed'],
        ]}
      />
      <Code title="apps/workbench/.env.local" lang="dotenv">{`BRICO_AI_PROVIDER=openrouter
BRICO_AI_MODEL=openrouter/free
OPENROUTER_API_KEY=sk-or-…
MISTRAL_API_KEY=…                    # becomes a fallback automatically
BRICO_LOCAL_MODEL=qwen2.5:3b         # last resort, on your machine
BRICO_APP_URL=http://localhost:3000`}</Code>

      <h3 id="invites">Managing invites</h3>
      <p>
        With <code>BRICO_ACCESS_MODE=token</code>, create, list and revoke invites on the server:
      </p>
      <Code>{`node scripts/brico-access.mjs create "Ada Lovelace" --days 30   # prints a one-time link
node scripts/brico-access.mjs list
node scripts/brico-access.mjs revoke <id-or-name>`}</Code>
      <p>
        Only a hash of each invite is stored. The link sets a signed, HttpOnly cookie that lasts until the invite
        expires (at most 30 days per sign-in). Revoking takes effect on the person&rsquo;s next request. Rate limits apply
        per person, and each build records who ran it.
      </p>

      <h2 id="worker">Worker</h2>
      <Table
        head={['Variable', 'Required', 'Description']}
        rows={[
          [c('DATABASE_URL'), 'yes', 'Postgres connection string. Use a least-privileged role'],
          [c('MISTRAL_API_KEY'), 'yes', 'Key for code generation'],
          [c('MISTRAL_MODEL'), 'no', <span key="mm">Defaults to <code>codestral-latest</code></span>],
          [c('BRICO_VAULT'), 'no', 'Where finished bricks are published'],
        ]}
      />
      <p>
        Missing values are read from <code>db/.env.local</code>. Command-line flags are in{' '}
        <DocLink to="worker" hash="flags">Worker</DocLink>.
      </p>

      <h2 id="site">This website</h2>
      <Table
        head={['Variable', 'Description']}
        rows={[
          [c('NEXT_PUBLIC_BUILDER_URL'), <span key="b">Builder used by <code>/builder</code>. Default <code>https://builder.bricowerx.com</code></span>],
        ]}
      />
      <Callout kind="warn" title="Keep secrets out of the Vault">
        <p>
          <code>brico capture</code> refuses directories that contain <code>.env</code>, key files or{' '}
          <code>.npmrc</code>, because a Vault is a git repository that gets pushed. Keep secrets in your app&rsquo;s
          environment and let bricks declare only the variable <em>names</em> they need.
        </p>
      </Callout>
    </DocPage>
  );
}
