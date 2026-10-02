import axios from 'axios';

const REFRESH_LOCK = 'social-stats.jwt-refresh';
const REFRESH_LEASE_KEY = 'social-stats.jwt-refresh-lease';
const INVALIDATION_KEY = 'social-stats.session-invalidated';
const LEASE_TTL_MS = 10000;
const LEASE_POLL_MS = 40;
const COMPETING_REFRESH_GRACE_MS = 400;
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

function leaseOwner() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readLease(store) {
  try {
    const value = JSON.parse(store.getItem(REFRESH_LEASE_KEY) || 'null');
    if (!value || !value.owner || !value.expiresAt) return null;
    return value;
  } catch {
    return null;
  }
}

async function acquireStorageLease(store, accessSnapshot) {
  const owner = leaseOwner();
  const deadline = Date.now() + LEASE_TTL_MS;

  while (Date.now() < deadline) {
    const currentAccess = store.getItem('access_token');
    if (currentAccess && accessSnapshot && currentAccess !== accessSnapshot) {
      return { reusedAccess: currentAccess };
    }

    const current = readLease(store);
    if (!current || current.expiresAt <= Date.now()) {
      const candidate = { owner, expiresAt: Date.now() + LEASE_TTL_MS };
      store.setItem(REFRESH_LEASE_KEY, JSON.stringify(candidate));

      // localStorage has no atomic compare-and-set. Give competing tabs a full
      // polling interval to publish their candidate, then confirm ownership.
      await sleep(LEASE_POLL_MS);

      const accessAfterClaim = store.getItem('access_token');
      if (accessAfterClaim && accessSnapshot && accessAfterClaim !== accessSnapshot) {
        return { reusedAccess: accessAfterClaim };
      }
      if (readLease(store)?.owner === owner) return { owner };
    }

    await sleep(LEASE_POLL_MS);
  }

  throw new Error('Timed out waiting for cross-tab refresh coordination');
}

function releaseStorageLease(store, owner) {
  if (!owner) return;
  const current = readLease(store);
  if (current?.owner === owner) store.removeItem(REFRESH_LEASE_KEY);
}

async function waitForCompetingRefresh(store, accessSnapshot, refreshSnapshot) {
  const deadline = Date.now() + COMPETING_REFRESH_GRACE_MS;

  while (Date.now() < deadline) {
    const updatedAccess = store.getItem('access_token');
    const updatedRefresh = store.getItem('refresh_token');
    if (updatedAccess && accessSnapshot && updatedAccess !== accessSnapshot) {
      return updatedAccess;
    }
    if (updatedRefresh && refreshSnapshot && updatedRefresh !== refreshSnapshot) {
      await sleep(LEASE_POLL_MS);
      const accessAfterRotation = store.getItem('access_token');
      if (accessAfterRotation && accessAfterRotation !== accessSnapshot) return accessAfterRotation;
    }
    await sleep(LEASE_POLL_MS);
  }

  return null;
}

export function onSessionInvalidated(listener) {
  sessionInvalidationListeners.add(listener);
  return () => sessionInvalidationListeners.delete(listener);
}

export function invalidateSession({ broadcast = true, expectedAccessToken } = {}) {
  const store = storage();
  if (store) {
    try {
      const currentAccess = store.getItem('access_token');
      if (expectedAccessToken && currentAccess !== expectedAccessToken) return false;
      store.removeItem('access_token');
      store.removeItem('refresh_token');
      store.removeItem(REFRESH_LEASE_KEY);
      if (broadcast) {
        store.setItem(INVALIDATION_KEY, JSON.stringify({
          at: Date.now(),
          expectedAccessToken: expectedAccessToken || null,
        }));
      }
    } catch {}
  }
  notifyInvalidated();
  return true;
}

async function performRefresh(accessSnapshot) {
  const store = storage();
  if (!store) throw new Error('Session storage unavailable');

  const currentAccess = store.getItem('access_token');
  if (currentAccess && accessSnapshot && currentAccess !== accessSnapshot) {
    return currentAccess;
  }

  const refresh = store.getItem('refresh_token');
  if (!refresh) throw new Error('Refresh token unavailable');

  let response;
  try {
    response = await axios.post(`${apiBaseUrl()}/auth/refresh/`, { refresh });
  } catch (error) {
    // localStorage lease claiming is advisory, not an atomic mutex. If two tabs
    // race, the losing refresh can fail because the winner rotated the token.
    // Give that winner a bounded grace period to publish its new credentials
    // before treating the rejection as terminal.
    const competingAccess = await waitForCompetingRefresh(store, accessSnapshot, refresh);
    if (competingAccess) return competingAccess;
    throw error;
  }

  const updatedAccess = store.getItem('access_token');
  const updatedRefresh = store.getItem('refresh_token');
  if (
    (updatedAccess && accessSnapshot && updatedAccess !== accessSnapshot)
    || (updatedRefresh && refresh && updatedRefresh !== refresh)
  ) {
    if (updatedAccess) return updatedAccess;
    throw new Error('Session changed while refresh was in flight');
  }

  const access = response.data?.access;
  if (!access) throw new Error('Refresh response did not include an access token');

  store.setItem('access_token', access);
  if (response.data?.refresh) store.setItem('refresh_token', response.data.refresh);
  return access;
}

async function coordinatedRefresh(accessSnapshot) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(REFRESH_LOCK, () => performRefresh(accessSnapshot));
  }

  const store = storage();
  if (!store) return performRefresh(accessSnapshot);
  const lease = await acquireStorageLease(store, accessSnapshot);
  if (lease.reusedAccess) return lease.reusedAccess;

  try {
    return await performRefresh(accessSnapshot);
  } finally {
    releaseStorageLease(store, lease.owner);
  }
}

export function refreshAccessToken(failedAccessToken) {
  if (refreshPromise) return refreshPromise;

  const accessSnapshot = failedAccessToken || storage()?.getItem('access_token') || '';
  refreshPromise = coordinatedRefresh(accessSnapshot)
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== INVALIDATION_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue);
      invalidateSession({
        broadcast: false,
        expectedAccessToken: payload.expectedAccessToken || undefined,
      });
    } catch {
      invalidateSession({ broadcast: false });
    }
  });
}
