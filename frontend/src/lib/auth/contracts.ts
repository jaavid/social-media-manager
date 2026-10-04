export type SessionStatus = 'initializing' | 'authenticated' | 'anonymous' | 'unavailable';
export interface SessionUser {
  id: number;
  role: 'client' | 'staff' | 'superadmin';
  account_type: 'end_user' | 'agency_member' | 'legacy';
  workspace_id?: number | null;
  client_id?: number | null;
  name?: string;
  email?: string;
  permissions?: Record<string, boolean>;
  [field: string]: unknown;
}

export function parseSessionUser(value: unknown): SessionUser {
  if (!value || typeof value !== 'object') throw new Error('Invalid session response');
  const user = value as Record<string, unknown>;
  if (!Number.isSafeInteger(user.id) || Number(user.id) < 1 || !['client', 'staff', 'superadmin'].includes(String(user.role))
    || !['end_user', 'agency_member', 'legacy'].includes(String(user.account_type))) {
    throw new Error('Unsupported session identity');
  }
  for (const field of ['workspace_id', 'client_id']) {
    if (user[field] != null && (!Number.isSafeInteger(user[field]) || Number(user[field]) < 1)) throw new Error('Invalid workspace identity');
  }
  if (user.permissions != null && (typeof user.permissions !== 'object' || Array.isArray(user.permissions)
    || Object.values(user.permissions).some(permission => typeof permission !== 'boolean'))) {
    throw new Error('Invalid permission response');
  }
  for (const field of ['email', 'name']) {
    if (user[field] != null && typeof user[field] !== 'string') throw new Error('Invalid identity display field');
  }
  return user as SessionUser;
}

export function internalReturnTo(value: string | null, fallback = '/dashboard'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return fallback;
  const url = new URL(value, 'https://socialstats.invalid');
  return url.origin === 'https://socialstats.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback;
}
