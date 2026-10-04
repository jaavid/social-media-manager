import axios from 'axios';
import { apiBaseUrl } from '../runtime/config';
import { persistentStorage } from '../runtime/storage';

let bootstrap: Promise<string> | null = null;
/** Obtain CSRF before mutations. Re-read after login rotates the CSRF cookie. */
export function csrfCookie(): string | undefined {
  return typeof document === 'undefined' ? undefined : document.cookie.split('; ')
    .find(cookie => cookie.startsWith('csrftoken='))?.slice('csrftoken='.length);
}
export async function ensureCsrf(): Promise<string> {
  const current = csrfCookie();
  if (current) return current;
  bootstrap ??= axios.get<{ csrfToken: string }>(`${apiBaseUrl()}/auth/session/`, {
    withCredentials: true, timeout: 15000, headers: { 'X-Browser-Session': '1' },
  }).then(response => response.data.csrfToken).finally(() => { bootstrap = null; });
  return bootstrap;
}
/** One-time migration; never write new credentials to browser storage. */
async function performMigration(): Promise<void> {
  const refresh = persistentStorage.getItem('refresh_token');
  if (!refresh) { persistentStorage.removeItem('access_token'); return; }
  try {
    const csrf = await ensureCsrf();
    await axios.post(`${apiBaseUrl()}/auth/session/`, { refresh }, {
      withCredentials: true, timeout: 15000,
      headers: { 'X-Browser-Session': '1', 'X-CSRFToken': csrf },
    });
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) throw error;
  }
  persistentStorage.removeItem('access_token');
  persistentStorage.removeItem('refresh_token');
}

let migration: Promise<void> | null = null;
export function migrateLegacySession(): Promise<void> {
  if (migration) return migration;
  const work = typeof navigator !== 'undefined' && navigator.locks?.request
    ? navigator.locks.request('socialstats.browser-session-migration', performMigration).then(() => {})
    : performMigration();
  migration = work.finally(() => { migration = null; });
  return migration;
}
