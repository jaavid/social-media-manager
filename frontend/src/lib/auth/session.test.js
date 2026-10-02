import axios from 'axios';
import { invalidateSession, refreshAccessToken } from './session';

jest.mock('axios');

describe('auth session coordinator', () => {
  beforeEach(() => {
    localStorage.clear();
    axios.post.mockReset();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: undefined,
    });
  });

  test('serializes concurrent refreshes and persists rotated refresh tokens', async () => {
    localStorage.setItem('access_token', 'access-old');
    localStorage.setItem('refresh_token', 'refresh-old');

    let resolveRefresh;
    axios.post.mockReturnValue(new Promise((resolve) => { resolveRefresh = resolve; }));

    const first = refreshAccessToken('access-old');
    const second = refreshAccessToken('access-old');
    expect(axios.post).toHaveBeenCalledTimes(1);

    resolveRefresh({ data: { access: 'access-new', refresh: 'refresh-new' } });
    await expect(first).resolves.toBe('access-new');
    await expect(second).resolves.toBe('access-new');
    expect(localStorage.getItem('access_token')).toBe('access-new');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-new');
  });

  test('reuses a token refreshed by another tab after acquiring the browser lock', async () => {
    localStorage.setItem('access_token', 'access-old');
    localStorage.setItem('refresh_token', 'refresh-old');
    const request = jest.fn(async (_name, callback) => {
      localStorage.setItem('access_token', 'access-from-other-tab');
      localStorage.setItem('refresh_token', 'refresh-from-other-tab');
      return callback();
    });
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    await expect(refreshAccessToken('access-old')).resolves.toBe('access-from-other-tab');
    expect(request).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
  });

  // Regression coverage for browsers that do not implement navigator.locks.
  test('reuses a token refreshed by another tab when Web Locks are unavailable', async () => {
    localStorage.setItem('access_token', 'access-old');
    localStorage.setItem('refresh_token', 'refresh-old');
    localStorage.setItem('social-stats.jwt-refresh-lease', JSON.stringify({
      owner: 'other-tab',
      expiresAt: Date.now() + 1000,
    }));

    setTimeout(() => {
      localStorage.setItem('access_token', 'access-from-fallback-tab');
      localStorage.setItem('refresh_token', 'refresh-from-fallback-tab');
      localStorage.removeItem('social-stats.jwt-refresh-lease');
    }, 10);

    await expect(refreshAccessToken('access-old')).resolves.toBe('access-from-fallback-tab');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('propagates refresh failure without destroying a newer cross-tab session', async () => {
    localStorage.setItem('access_token', 'access-old');
    localStorage.setItem('refresh_token', 'refresh-old');
    axios.post.mockImplementation(async () => {
      localStorage.setItem('access_token', 'access-newer');
      localStorage.setItem('refresh_token', 'refresh-newer');
      throw new Error('refresh rejected');
    });

    await expect(refreshAccessToken('access-old')).resolves.toBe('access-newer');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-newer');
  });

  test('rejects when refresh fails and no newer session exists', async () => {
    localStorage.setItem('access_token', 'access-old');
    localStorage.setItem('refresh_token', 'refresh-expired');
    axios.post.mockRejectedValue(new Error('refresh rejected'));

    await expect(refreshAccessToken('access-old')).rejects.toThrow('refresh rejected');
    expect(localStorage.getItem('access_token')).toBe('access-old');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  test('invalidates auth tokens without clearing unrelated preferences', () => {
    localStorage.setItem('access_token', 'access');
    localStorage.setItem('refresh_token', 'refresh');
    localStorage.setItem('language', 'fa');

    expect(invalidateSession()).toBe(true);

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('language')).toBe('fa');
  });

  test('does not invalidate a newer access token when an old request fails late', () => {
    localStorage.setItem('access_token', 'access-new');
    localStorage.setItem('refresh_token', 'refresh-new');

    expect(invalidateSession({ expectedAccessToken: 'access-old' })).toBe(false);
    expect(localStorage.getItem('access_token')).toBe('access-new');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-new');
  });
});
