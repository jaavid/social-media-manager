import { invalidateSession, notifySessionChanged, onSessionChanged, onSessionInvalidated } from './session';
beforeEach(() => localStorage.clear());
test('logout clears legacy credentials and broadcasts no credentials', () => {
  localStorage.setItem('access_token', 'private-access');
  localStorage.setItem('refresh_token', 'private-refresh');
  const listener = jest.fn(); const unsubscribe = onSessionInvalidated(listener);
  invalidateSession();
  expect(listener).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('refresh_token')).toBeNull();
  expect(localStorage.getItem('social-stats.session-invalidated')).not.toContain('private');
  unsubscribe();
});
test('account changes and logout synchronize tabs independently', () => {
  const changed = jest.fn(), invalidated = jest.fn();
  const stopChanged = onSessionChanged(changed), stopInvalidated = onSessionInvalidated(invalidated);
  notifySessionChanged();
  const marker = localStorage.getItem('social-stats.session-changed');
  window.dispatchEvent(new StorageEvent('storage', { key: 'social-stats.session-changed', newValue: marker }));
  expect(changed).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new StorageEvent('storage', { key: 'social-stats.session-invalidated', newValue: 'logout' }));
  expect(invalidated).toHaveBeenCalledTimes(1);
  stopChanged(); stopInvalidated();
});
