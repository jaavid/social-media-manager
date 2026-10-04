import axios from 'axios';
import { api, onSessionInvalidated } from './api';

function unauthorized(config) {
  return Promise.reject({ config, response: { status: 401 } });
}

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

test('concurrent 401 responses share one successful refresh', async () => {
  localStorage.setItem('refresh_token', 'refresh');
  jest.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'new-access' } });
  const attempts = new Map();
  api.defaults.adapter = (config) => {
    const count = attempts.get(config.url) || 0;
    attempts.set(config.url, count + 1);
    return count === 0 ? unauthorized(config) : Promise.resolve({ data: {}, status: 200, config });
  };

  await Promise.all([api.get('/alerts/'), api.get('/notifications/')]);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('access_token')).toBe('new-access');
});

test('definitive refresh failure invalidates session and rejects queued requests', async () => {
  localStorage.setItem('refresh_token', 'expired');
  jest.spyOn(axios, 'post').mockRejectedValue(new Error('expired'));
  api.defaults.adapter = unauthorized;
  const invalidated = jest.fn();
  const unsubscribe = onSessionInvalidated(invalidated);

  const results = await Promise.allSettled([api.get('/alerts/'), api.get('/notifications/')]);
  expect(results.every(({ status }) => status === 'rejected')).toBe(true);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(invalidated).toHaveBeenCalled();
  expect(localStorage.getItem('refresh_token')).toBeNull();
  unsubscribe();
});
