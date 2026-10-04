import { api, onSessionInvalidated } from './api';
import axios from 'axios';
beforeEach(() => { localStorage.clear(); jest.restoreAllMocks(); });
test('temporary network/5xx errors preserve the session and do not replay a mutation', async () => {
  const invalidated = jest.fn(), unsubscribe = onSessionInvalidated(invalidated);
  const adapter = jest.fn(config => Promise.reject({ config, response: { status: 503 } }));
  api.defaults.adapter = adapter;
  await expect(api.post('/composer/', { caption: 'test' })).rejects.toBeDefined();
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(invalidated).not.toHaveBeenCalled();
  unsubscribe();
});
test('cookie requests never send localStorage JWT and use CSRF on mutations', async () => {
  localStorage.setItem('access_token', 'retired-token');
  const adapter = jest.fn(config => Promise.resolve({ data: {}, status: 200, config }));
  api.defaults.adapter = adapter;
  await api.post('/profile/', {});
  const config = adapter.mock.calls[0][0];
  expect(config.headers.Authorization).toBeUndefined();
  expect(config.headers['X-CSRFToken']).toBe('test-csrf');
  expect(config.withCredentials).toBe(true);
  expect(config.timeout).toBe(15000);
});
test('a definitive 401 clears private session without refreshing or navigating in an interceptor', async () => {
  const refresh = jest.spyOn(axios, 'post');
  const invalidated = jest.fn(), unsubscribe = onSessionInvalidated(invalidated);
  api.defaults.adapter = config => Promise.reject({ config, response: { status: 401 } });
  await expect(api.get('/auth/me/')).rejects.toBeDefined();
  expect(invalidated).toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
  unsubscribe();
});
test('an old request 401 cannot invalidate the next account identity', async () => {
  const { notifySessionChanged } = await import('../lib/auth/session');
  const invalidated = jest.fn(), unsubscribe = onSessionInvalidated(invalidated);
  let rejectRequest, started;
  const ready = new Promise(resolve => { started = resolve; });
  api.defaults.adapter = config => new Promise((_, reject) => { rejectRequest = () => reject({ config, response: { status: 401 } }); started(); });
  const request = api.get('/profile/');
  await ready;
  notifySessionChanged();
  rejectRequest();
  await expect(request).rejects.toBeDefined();
  expect(invalidated).not.toHaveBeenCalled();
  unsubscribe();
});
