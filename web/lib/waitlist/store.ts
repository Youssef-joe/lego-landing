import fs from 'fs/promises';
import path from 'path';
import { Redis as IoRedis } from 'ioredis';
import { kv } from '@vercel/kv';

export type Signup = {
  email: string;
  company?: string;
  source?: string;
  createdAt: string;
};

export type StorageKind = 'kv' | 'redis' | 'file';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const KV_HASH = 'waitlist:signups';

function kvConfigured() {
  return Boolean(process.env['KV_REST_API_URL'] && process.env['KV_REST_API_TOKEN']);
}

function redisUrl() {
  return process.env['REDIS_URL'] || '';
}

let redisClient: IoRedis | null = null;

/** Shared client across warm invocations; connects lazily on first command. */
function redis(): IoRedis {
  if (!redisClient) {
    redisClient = new IoRedis(redisUrl(), {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableAutoPipelining: true,
    });
  }
  return redisClient;
}

export function storageKind(): StorageKind {
  if (kvConfigured()) return 'kv';
  if (redisUrl()) return 'redis';
  return 'file';
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL_RE.test(email.trim());
}

function dataFile() {
  return path.join(process.cwd(), '.data', 'waitlist.jsonl');
}

async function fileReadAll(): Promise<Signup[]> {
  try {
    const raw = await fs.readFile(dataFile(), 'utf-8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Signup);
  } catch (e: any) {
    if (e?.code === 'ENOENT') return [];
    throw e;
  }
}

/** Returns { signup, already }. Throws on storage failure. */
export async function addSignup(input: {
  email: string;
  company?: string;
  source?: string;
}): Promise<{ signup: Signup; already: boolean }> {
  const email = normalizeEmail(input.email);
  const signup: Signup = {
    email,
    company: input.company?.trim().slice(0, 120) || undefined,
    source: input.source?.trim().slice(0, 40) || undefined,
    createdAt: new Date().toISOString(),
  };
  const kind = storageKind();

  if (kind === 'kv') {
    const existing = await kv.hget<Signup>(KV_HASH, email);
    if (existing) return { signup: existing, already: true };
    await kv.hset(KV_HASH, { [email]: signup });
    return { signup, already: false };
  }

  if (kind === 'redis') {
    const existing = await redis().hget(KV_HASH, email);
    if (existing) return { signup: JSON.parse(existing) as Signup, already: true };
    await redis().hset(KV_HASH, email, JSON.stringify(signup));
    return { signup, already: false };
  }

  await fs.mkdir(path.dirname(dataFile()), { recursive: true });
  const all = await fileReadAll();
  const dup = all.find((s) => normalizeEmail(s.email) === email);
  if (dup) return { signup: dup, already: true };
  await fs.appendFile(dataFile(), JSON.stringify(signup) + '\n', 'utf-8');
  return { signup, already: false };
}

export async function listSignups(): Promise<Signup[]> {
  const kind = storageKind();
  if (kind === 'kv') {
    const all = await kv.hgetall<Record<string, Signup>>(KV_HASH);
    if (!all) return [];
    return Object.values(all).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  if (kind === 'redis') {
    const all = await redis().hgetall(KV_HASH);
    return Object.values(all)
      .map((v) => JSON.parse(v) as Signup)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  const all = await fileReadAll();
  return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function countSignups(): Promise<number> {
  const kind = storageKind();
  if (kind === 'kv') return kv.hlen(KV_HASH);
  if (kind === 'redis') return redis().hlen(KV_HASH);
  return (await fileReadAll()).length;
}
