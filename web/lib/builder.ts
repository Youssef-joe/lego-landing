/**
 * The BRICO Builder runs on its own server (it needs long builds, a compiler
 * and a test runner, which serverless hosting cannot provide). The product site
 * links to it and shows its Vault.
 */
export const BUILDER_URL = (process.env['NEXT_PUBLIC_BUILDER_URL'] ?? 'https://builder.bricowerx.com').replace(/\/$/, '');

export interface VaultBrick {
  name: string;
  title: string;
  summary?: string;
  status: 'ok' | 'partial' | 'legacy';
  layers: string[];
}

/** The live Vault, refreshed every few minutes. An unreachable Builder shows an empty Vault, never an error. */
export async function fetchVault(): Promise<VaultBrick[]> {
  try {
    const response = await fetch(`${BUILDER_URL}/api/bricks`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return [];
    const body = (await response.json()) as { bricks?: VaultBrick[] };
    return Array.isArray(body.bricks) ? body.bricks : [];
  } catch {
    return [];
  }
}
