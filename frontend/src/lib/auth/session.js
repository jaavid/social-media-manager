import axios from 'axios';

const REFRESH_LOCK = 'social-stats.jwt-refresh';
const INVALIDATION_KEY = 'social-stats.session-invalidated';
const sessionInvalidationListeners = new Set();
let refreshPromise = null;

function apiBaseUrl() {
  return process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
}

function storage() {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function notifyInvalidated() {
  sessionInvalidationListeners.forEach((listener) => listener());
}

export function onSessionInvalidated(listener) {
  sessionInvalidationListeners.add(listener);
  return () => sessionInvalidationListeners.delete(listener);
}

export function invalidateSession({ broadcast = true } = {}) {
  const store = storage();
  if (store) {
    try {
      store.removeItem('access_token');
      store.removeItem('refresh_token');
      if (broadcast) store.setItem(INVALIDATION_KEY, String(Date.now()));
    } catch {}
  }
  notifyInvalidated();
}

async function performRefresh(accessSnapshot) {
  const store = storage();
  if (!store) throw new Error('Session storage unavailable');

  // Another tab may have completed a refresh while this caller was queued on
  // the browser-wide lock. Reuse that token instead of rotating refresh again.
  const currentAccess = store.getItem('access_token');
  if (currentAccess && accessSnapshot && currentAccess !== accessSnapshot) {
    return currentAccess;
  }

  const refresh = store.getItem('refresh_token');
  if (!refresh) throw new Error('Refresh token unavailable');

  const response = await axios.post(`${apiBaseUrl()}/auth/refresh/`, { refresh });
  const access = response.data?.access;
  if (!access) throw new Error('Refresh response did not include an access token');

  store.setItem('access_token', access);
  // SimpleJWT returns a new refresh token when rotation is enabled. Persist it;
  // otherwise the next refresh can retry a token that has already been blacklisted.
  if (response.data?.refresh) store.setItem('refresh_token', response.data.refresh);
  return access;
}

async function coordinatedRefresh(accessSnapshot) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK, () => performRefresh(accessSnapshot));
  }
  // Same-tab callers are still serialized by refreshPromise. Web Locks adds the
  // cross-tab guarantee on supported browsers without inventing a racy storage lock.
  return performRefresh(accessSnapshot);
}

export function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const accessSnapshot = storage()?.getItem('access_token') || '';
  refreshPromise = coordinatedRefresh(accessSnapshot)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === INVALIDATION_KEY && event.newValue) {
      invalidateSession({ broadcast: false });
    }
  });
}
