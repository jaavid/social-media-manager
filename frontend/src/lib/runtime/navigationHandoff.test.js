import { saveNavigationHandoff, restoreNavigationHandoff, applyNavigationHandoff } from './navigationHandoff';
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
test('MFA state crosses hosts once without entering shared storage or the URL', () => {
  const state = { mfaToken: 'test-mfa' };
  const before = window.location.href;
  saveNavigationHandoff('/login', state);
  expect(localStorage.length).toBe(0);
  expect(applyNavigationHandoff('/login')).toEqual(state);
  expect(window.location.href).toBe(before);
  expect(window.history.state.usr).toEqual(state);
  expect(restoreNavigationHandoff('/login')).toBeNull();
});
test('stale and mismatched handoffs cannot reach another route', () => {
  jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(32000);
  saveNavigationHandoff('/login', { mfaToken: 'expired' });
  expect(restoreNavigationHandoff('/login')).toBeNull();
  jest.restoreAllMocks();
  saveNavigationHandoff('/login', { mfaToken: 'wrong-route' });
  expect(restoreNavigationHandoff('/privacy')).toBeNull();
  expect(restoreNavigationHandoff('/login')).toBeNull();
});
