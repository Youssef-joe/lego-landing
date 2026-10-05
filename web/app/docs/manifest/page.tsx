import { Callout, Code, DocLink, DocPage, Table } from '@/components/docs/Prose';
import { docMetadata } from '@/lib/docs';

export const metadata = docMetadata('manifest');

const c = (text: string) => <code key={text}>{text}</code>;

export default function Manifest() {
  return (
    <DocPage slug="manifest">
      <p>BricoWerx uses three JSON files:</p>
      <Table
        head={['File', 'Where', 'Owned by']}
        rows={[
          [c('brico.manifest.json'), 'Inside every Vault snapshot', 'The brick: written by capture, read by add, upgrade and doctor'],
          [c('brico.json'), 'Your project root', 'Your project: which bricks are installed, and where'],
          [c('~/.brico/config.json'), 'Your home directory', 'You: Vault location, defaults and publish repository'],
        ]}
      />

      <h2 id="manifest">brico.manifest.json</h2>
      <p>
        The contract every brick carries. <code>capture</code> generates it, and you can edit it before publishing a
        new version. The JSON Schema is <code>docs/manifest.schema.json</code> in the repository.
      </p>
      <h3 id="required-fields">Required fields</h3>
      <Table
        head={['Field', 'Type', 'Description']}
        rows={[
          [c('schemaVersion'), 'integer ≥ 1', 'Version of the manifest format, separate from the brick’s own version'],
          [c('name'), 'string', <span key="n">Lowercase letters, digits and hyphens, up to 64 characters, unique in the Vault. An <code>@scope/</code> prefix is allowed and will be required for the public registry</span>],
          [c('version'), 'semver', 'The brick’s version'],
          [c('framework'), 'string', <span key="f"><code>nest</code> or <code>next</code></span>],
          [c('language'), 'string', <span key="l">Currently always <code>typescript</code></span>],
          [c('files'), 'string[]', 'Brick-relative paths included in the snapshot'],
          [c('visibility'), 'string', <span key="v"><code>public</code> or <code>private</code></span>],
        ]}
      />
      <h3 id="optional-fields">Optional fields</h3>
      <Table
        head={['Field', 'Type', 'Description']}
        rows={[
          [c('description'), 'string', 'One line, used by search'],
          [c('tags'), 'string[]', 'Used by search and the terminal UI filter'],
          [c('author'), 'string', 'Defaults to author in the global config'],
          [c('license'), 'string', 'SPDX identifier'],
          [c('createdAt / updatedAt'), 'string', 'ISO timestamps'],
          [c('dependencies'), 'object', 'npm package → semver range, read from the source project’s package.json'],
          [c('peerDependencies'), 'object', 'Packages the host must provide. Never filled in by capture; write them by hand'],
          [c('bricoDependencies'), 'string[]', 'Other bricks this one needs. Recorded, not yet resolved by add'],
          [c('env'), 'object[]', <span key="e">Environment variables: <code>{'{ name, required, description?, default?, secret? }'}</code></span>],
          [c('exports'), 'string[]', <span key="x">Public entry points, such as <code>ui/index.ts</code></span>],
          [c('compatibility'), 'object', <span key="c"><code>framework</code>, <code>supportedVersions</code> (semver range), <code>adapters</code>, <code>language</code></span>],
          [c('hooks'), 'object', <span key="h"><code>install</code>, <code>remove</code>, <code>migrate</code>, <code>postAdd</code>, <code>postBuild</code> command lists. Recorded only, never run yet</span>],
          [c('installPath'), 'string', 'Where the files land in a target, relative to its root. Overrides the adapter default'],
          [c('documentation'), 'string', 'Link or path to further documentation'],
        ]}
      />
      <Code title="brico.manifest.json" lang="json">{`{
  "schemaVersion": 1,
  "name": "auth",
  "description": "JWT authentication with Passport and bcrypt",
  "version": "0.2.0",
  "framework": "nest",
  "language": "typescript",
  "author": "platform-team",
  "visibility": "private",
  "tags": ["security", "jwt", "auth"],
  "dependencies": {
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "bcrypt": "^5.1.1"
  },
  "env": [
    { "name": "JWT_SECRET", "required": true, "secret": true },
    { "name": "JWT_EXPIRES_IN", "required": false, "default": "1h" }
  ],
  "exports": ["auth.module.ts"],
  "files": ["auth.module.ts", "auth.service.ts", "jwt.strategy.ts"],
  "compatibility": { "framework": "nest", "supportedVersions": ">=10.0.0" },
  "installPath": "src/auth"
}`}</Code>
      <Callout kind="note">
        <p>
          From version 1.0.0, the manifest <code>schemaVersion</code>, <code>brico.json</code> and{' '}
          <code>brico.lock</code> formats are part of the compatibility promise. Breaking any of them requires a major
          version.
        </p>
      </Callout>

      <h2 id="project-file">brico.json</h2>
      <p>
        Created by the first <code>brico add</code>, and updated by <code>add</code>, <code>upgrade</code> and{' '}
        <code>remove</code>. Commit it.
      </p>
      <Code title="brico.json" lang="json">{`{
  "framework": "nest",
  "adapter": "nest",
  "modules": [
    {
      "name": "auth",
      "version": "0.2.0",
      "installPath": "src/auth",
      "addedAt": "2026-09-14",
      "updatedAt": "2026-10-02"
    }
  ]
}`}</Code>
      <Table
        head={['Field', 'Description']}
        rows={[
          [c('framework'), 'Detected framework'],
          [c('adapter'), 'Adapter that installed the bricks'],
          [c('modules[].name / version'), 'What is installed. upgrade compares this version with the Vault'],
          [c('modules[].installPath'), 'Where it was installed. remove deletes this directory'],
          [c('modules[].addedAt / updatedAt'), 'When it was added, and last upgraded'],
        ]}
      />

      <h2 id="global-config">~/.brico/config.json</h2>
      <Code title="~/.brico/config.json" lang="json">{`{
  "vaultPath": "/Users/you/.brico/vault",
  "defaultVisibility": "private",
  "author": "platform-team",
  "publishRepo": "git@github.com:acme/team-vault.git"
}`}</Code>
      <Table
        head={['Key', 'Description', 'Overridden by']}
        rows={[
          [c('vaultPath'), 'Vault location', <span key="v"><code>--vault</code>, <code>BRICO_VAULT</code></span>],
          [c('defaultVisibility'), 'Visibility for new captures', <code key="d">--visibility</code>],
          [c('author'), 'Author written into new manifests', '—'],
          [c('publishRepo'), 'Main repository for publish and pull. Saved on the first publish', <span key="p"><code>--repo</code>, <code>-l</code>, <code>BRICO_PUBLISH_REPO</code></span>],
        ]}
      />
      <p>
        All environment variables are listed in <DocLink to="configuration">Configuration</DocLink>.
      </p>
    </DocPage>
  );
}
