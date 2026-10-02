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

    const first = refreshAccessToken();
    const second = refreshAccessToken();
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
      return callback();
    });
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    await expect(refreshAccessToken()).resolves.toBe('access-from-other-tab');
    expect(request).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('invalidates auth tokens without clearing unrelated preferences', () => {
    localStorage.setItem('access_token', 'access');
    localStorage.setItem('refresh_token', 'refresh');
    localStorage.setItem('language', 'fa');

    invalidateSession();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('language')).toBe('fa');
  });
});
