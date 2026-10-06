import { persistentStorage, clearTransientPrefix } from '../runtime/storage';
const INVALIDATION_KEY = 'social-stats.session-invalidated';
const CHANGED_KEY = 'social-stats.session-changed';
const invalidationListeners = new Set();
const changedListeners = new Set();
export function onSessionInvalidated(listener) {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
}
export function onSessionChanged(listener) {
  changedListeners.add(listener);
  return () => { changedListeners.delete(listener); };
}
export function sessionEpoch() { return persistentStorage.getItem(CHANGED_KEY) || ''; }
export function notifySessionChanged() {
  persistentStorage.setItem(CHANGED_KEY, `${Date.now()}:${Math.random()}`);
}
export function invalidateSession({ broadcast = true } = {}) {
  clearTransientPrefix('composer-draft:');
  persistentStorage.removeItem('access_token');
  persistentStorage.removeItem('refresh_token');
  if (broadcast) persistentStorage.setItem(INVALIDATION_KEY, `${Date.now()}:${Math.random()}`);
  invalidationListeners.forEach(listener => listener());
  return true;
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === INVALIDATION_KEY && event.newValue) invalidateSession({ broadcast: false });
    if (event.key === CHANGED_KEY && event.newValue) changedListeners.forEach(listener => listener());
  });
}
