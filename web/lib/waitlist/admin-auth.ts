import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'bwx_admin';
const SESSION_LABEL = 'bwx-admin-session';

function expectedToken(): string {
  return process.env['ADMIN_TOKEN'] ?? '';
}

export function adminConfigured() {
  return expectedToken().length > 0;
}

export function verifyAdminToken(candidate: string) {
  const expected = expectedToken();
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sessionValue() {
  return createHmac('sha256', expectedToken()).update(SESSION_LABEL).digest('hex');
}

export function isAdminRequest(req: Request) {
  if (!adminConfigured()) return false;
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.split(';').find((p) => p.trim().startsWith(`${ADMIN_COOKIE}=`));
  const value = match?.split('=').slice(1).join('=').trim() ?? '';
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(sessionValue());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminSessionCookie() {
  const secure = process.env['NODE_ENV'] === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${sessionValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`;
}

export function clearSessionCookie() {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
