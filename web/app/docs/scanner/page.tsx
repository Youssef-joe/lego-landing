import { Callout, Code, DocLink, DocPage, Steps, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('scanner');

export default function Scanner() {
  return (
    <DocPage slug="scanner">
      <p>
        Brico Scanner is a Chrome extension. It watches a web application while it runs, then works out its routes,
        forms, API calls and the features on the page. It doesn&rsquo;t scrape HTML or copy source code. It reconstructs
        how a feature <em>behaves</em> from what the page does, so a brick can be built against the contract the app
        really uses instead of an invented one.
      </p>
      <p>
        Detection runs entirely in your browser. Building a brick from a detected feature is the{' '}
        <DocLink to="worker">Worker</DocLink>&rsquo;s job.
      </p>

      <h2 id="install">Install the developer preview</h2>
      <p>
        The Chrome Web Store listing is in review. Until it clears, load the extension unpacked. It needs Chrome 116
        or later.
      </p>
      <Code>{`git clone https://github.com/ScienceWerx-Inc/bricowerx.git
cd bricowerx/extension
npm install
npm run build              # writes dist/`}</Code>
      <ol>
        <li>
          Open <code>chrome://extensions</code> and turn on <strong>Developer mode</strong>.
        </li>
        <li>
          Click <strong>Load unpacked</strong> and choose <code>extension/dist</code>.
        </li>
        <li>Pin Brico Scanner to the toolbar.</li>
      </ol>

      <h2 id="scan">Scan a page</h2>
      <Steps>
        <li>
          <strong>Open the app you want to learn from</strong>
          <p>Sign in and go to the screen with the feature you are interested in.</p>
        </li>
        <li>
          <strong>Click the toolbar icon, then Scan this page</strong>
          <p>
            The side panel opens. Clicking the icon grants access to this tab only, for one scan.{' '}
            <em>Always allow on &lt;site&gt;</em> turns that into standing access for the site, so you don&rsquo;t have to
            click again.
          </p>
        </li>
        <li>
          <strong>Use the page</strong>
          <p>
            Click around, submit a form, open a dialog. The scanner links what you do to the DOM changes and network
            calls each action causes.
          </p>
        </li>
        <li>
          <strong>Read the results</strong>
          <p>The panel shows what it found, in sections:</p>
        </li>
      </Steps>
      <Table
        head={['Section', 'Contains']}
        rows={[
          ['Page', 'The route, title, whether it is a single-page app, and the navigations observed'],
          ['API observed', 'Each endpoint with its method, path, status and the shape of its request and response'],
          ['Behavior watched', 'Which interaction caused which DOM change and which request'],
          ['Bundles read', 'What static analysis of the page’s JavaScript bundles revealed'],
          ['Reusable features', 'Candidate features, each backed by several independent signals'],
          ['Technologies', 'Frameworks and libraries the page uses'],
        ]}
      />
      <p>
        A feature is only reported when several signals agree, such as the DOM, the interactions, the network and its
        wording. One signal on its own is never enough. The vocabulary covers several languages, so non-English apps
        are recognised too.
      </p>

      <h2 id="build">Turn a feature into a brick</h2>
      <ol>
        <li>Tick the features you want under <strong>Reusable features</strong>.</li>
        <li>
          Choose <strong>Next.js</strong> or <strong>NestJS</strong> under <em>Build for</em>.
        </li>
        <li>
          Click <strong>Build N features in my Vault</strong>.
        </li>
      </ol>
      <p>
        The selection goes to the Worker on your machine, which generates each brick, typechecks it against the
        endpoints the scanner observed, and publishes it to your Vault. The panel follows each job until it finishes.
        If the Worker isn&rsquo;t running, the panel tells you and shows the command that starts it. See{' '}
        <DocLink to="worker">Worker</DocLink>.
      </p>

      <h2 id="privacy">Privacy</h2>
      <p>
        The scanner only reads pages you choose to scan. Before anything leaves the page, it discards everything that
        could be a value instead of a shape:
      </p>
      <ul>
        <li>
          Request and response bodies are reduced to <strong>type skeletons</strong>. The values are thrown away, not
          masked.
        </li>
        <li>
          Credential headers are stripped, including vendor-specific ones. Cookies and <code>Authorization</code>{' '}
          headers are never collected.
        </li>
        <li>URLs lose credentials, query values and fragments. Only query parameter names are kept.</li>
      </ul>
      <Table
        head={['Permission', 'Why']}
        rows={[
          [<code key="a">activeTab</code>, 'Run a scan on the tab where you clicked the icon'],
          [<code key="s">scripting</code>, 'Inject the observer into that tab'],
          [<code key="p">sidePanel</code>, 'Show the results'],
          ['Per-site host access (optional)', 'Asked for when you choose Always allow, never at install'],
          [<code key="w">webRequest</code>, 'Optional, for richer endpoint evidence, only if you turn it on'],
        ]}
      />
      <p>
        There is no access to every site, no browsing history, no analytics and no trackers. The extension never asks
        for the <code>debugger</code> permission.
      </p>
      <Callout kind="note" title="Where the data goes">
        <p>
          The derived evidence goes to the Worker you run (by default <code>http://127.0.0.1:7717</code>), which stores
          it in your Postgres database and sends implementation prompts to Mistral, a third-party model provider.
          Nothing is sent until you click Build.
        </p>
      </Callout>
    </DocPage>
  );
}
