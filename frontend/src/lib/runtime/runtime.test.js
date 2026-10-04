import { persistentStorage, getBrowserStorage } from './storage';
import { apiBaseUrl } from './config';
afterEach(() => localStorage.clear());
it('preserves browser storage keys used by existing sessions', () => {
  persistentStorage.setItem('access_token', 'local-test');
  expect(persistentStorage.getItem('access_token')).toBe('local-test');
  persistentStorage.removeItem('access_token');
  expect(persistentStorage.getItem('access_token')).toBeNull();
});
it('handles storage blocked by browser policy', () => {
  const spy = jest
    .spyOn(window, 'localStorage', 'get')
    .mockImplementation(() => {
      throw new Error('Blocked');
    });
  expect(getBrowserStorage()).toBeNull();
  expect(persistentStorage.getItem('theme')).toBeNull();
  spy.mockRestore();
});
it('normalizes configured API base', () => {
  const original = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = 'https://example.test/api/';
  expect(apiBaseUrl()).toBe('https://example.test/api');
  if (original === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = original;
});
