/**
 * The documentation map. The sidebar, page headers, metadata and the
 * previous / next links all read from here, so a page is added in one place.
 */

export type DocStatus = 'available' | 'preview' | 'planned';

export interface DocPage {
  /** Path under /docs; '' is the overview. */
  slug: string;
  title: string;
  /** One sentence under the title and in the page metadata. */
  lead: string;
  status?: DocStatus;
}

export interface DocSection {
  title: string;
  pages: DocPage[];
}

export const DOCS: DocSection[] = [
  {
    title: 'Start here',
    pages: [
      {
        slug: '',
        title: 'Overview',
        lead: 'BricoWerx keeps the code your team has already proven as versioned bricks, so people and assistants reuse it instead of rebuilding it.',
      },
      {
        slug: 'getting-started',
        title: 'Getting started',
        lead: 'Install the brico CLI, capture your first brick and add it to another project in about five minutes.',
      },
      {
        slug: 'concepts',
        title: 'Core concepts',
        lead: 'Bricks, the Vault, manifests, versions and adapters: the five ideas the rest of the docs build on.',
      },
    ],
  },
  {
    title: 'Tools',
    pages: [
      {
        slug: 'cli',
        title: 'brico CLI',
        lead: 'Every command and flag of the single-binary engine that captures, versions, publishes and installs bricks.',
        status: 'available',
      },
      {
        slug: 'tui',
        title: 'Terminal UI',
        lead: 'brico ui opens a full-screen terminal interface for browsing and inspecting the Vault.',
        status: 'available',
      },
      {
        slug: 'vault',
        title: 'The Vault',
        lead: 'How bricks are stored: a git directory of immutable, versioned snapshots that you can publish and share.',
        status: 'available',
      },
      {
        slug: 'builder',
        title: 'Builder',
        lead: 'Author a new brick by answering a short interview; a deterministic engine generates, tests and installs it.',
        status: 'preview',
      },
      {
        slug: 'scanner',
        title: 'Scanner extension',
        lead: 'A browser extension that observes a running web app and finds the features in it worth turning into bricks.',
        status: 'preview',
      },
      {
        slug: 'worker',
        title: 'Worker',
        lead: 'brico-worker turns features the Scanner captured into type-checked bricks in your Vault.',
        status: 'preview',
      },
      {
        slug: 'mcp',
        title: 'MCP server',
        lead: 'brico mcp will expose the Vault to AI assistants over the Model Context Protocol.',
        status: 'planned',
      },
    ],
  },
  {
    title: 'Reference',
    pages: [
      {
        slug: 'brick-rules',
        title: 'Brick rules',
        lead: 'The twelve rules (R1–R12) a brick follows so it can be copied, unchanged, into a project it was not written for.',
      },
      {
        slug: 'manifest',
        title: 'Manifest and project files',
        lead: 'The fields of brico.manifest.json, brico.json and the global config file.',
      },
      {
        slug: 'configuration',
        title: 'Configuration',
        lead: 'Every environment variable and config key, grouped by tool.',
      },
    ],
  },
  {
    title: 'Trust',
    pages: [
      {
        slug: 'security',
        title: 'Security model',
        lead: 'What each tool protects, what it does not yet, and how to use BricoWerx safely today.',
      },
      {
        slug: 'status',
        title: 'Status and roadmap',
        lead: 'What works today, the current limits, and the order in which the gaps close.',
      },
    ],
  },
];

export const STATUS_LABEL: Record<DocStatus, string> = {
  available: 'Available',
  preview: 'Preview',
  planned: 'Planned',
};

const FLAT = DOCS.flatMap((section) => section.pages.map((page) => ({ ...page, section: section.title })));

export function docHref(slug: string): string {
  return slug ? `/docs/${slug}` : '/docs';
}

export function findDoc(slug: string) {
  const index = FLAT.findIndex((page) => page.slug === slug);
  if (index === -1) throw new Error(`Unknown docs page: "${slug}". Add it to lib/docs.ts.`);
  return { page: FLAT[index], prev: FLAT[index - 1], next: FLAT[index + 1] };
}

export function docMetadata(slug: string) {
  const { page } = findDoc(slug);
  return {
    title: slug ? `${page.title} — BricoWerx docs` : 'BricoWerx documentation',
    description: page.lead,
  };
}
