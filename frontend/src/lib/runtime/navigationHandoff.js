import { getSessionStorage } from './storage';
const KEY = 'social-stats.navigation-handoff';
const MAX_AGE = 30_000;
// One-use tab-local bridge for React Router state (including OAuth MFA).
// Never put this state in a URL, server request, or shared localStorage.
export function saveNavigationHandoff(pathname, state) {
  const store = getSessionStorage();
  if (!store || state == null) return;
  try { store.setItem(KEY, JSON.stringify({ pathname, state, at: Date.now() })); } catch {}
}
export function restoreNavigationHandoff(pathname) {
  const store = getSessionStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    store.removeItem(KEY);
    const value = JSON.parse(raw || 'null');
    if (value?.pathname === pathname && Date.now() - value.at < MAX_AGE) return value.state;
  } catch {}
  return null;
}

export function applyNavigationHandoff(pathname) {
  const state = restoreNavigationHandoff(pathname);
  if (state != null && typeof window !== 'undefined') {
    window.history.replaceState({ ...window.history.state, usr: state }, '');
  }
  return state;
}
