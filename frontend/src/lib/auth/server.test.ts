import { authorizeServerRoute } from './server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('react', () => ({ ...jest.requireActual('react'), cache: (fn: unknown) => fn }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn(), headers: jest.fn() }));

test('an expired server session redirects with the original internal path and query', async () => {
  (cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'expired-fixture' }), has: () => true });
  (headers as jest.Mock).mockResolvedValue(new Headers({ 'x-socialstats-return-to': '/admin/analytics/calendar?view=list' }));
  const originalTimeout = AbortSignal.timeout;
  AbortSignal.timeout = () => new AbortController().signal;
  jest.spyOn(global, 'fetch').mockResolvedValue({ status: 401 } as Response);
  (redirect as unknown as jest.Mock).mockImplementation(() => { throw new Error('Redirect'); });
  await expect(authorizeServerRoute(['staff', 'superadmin'])).rejects.toThrow('Redirect');
  expect(redirect).toHaveBeenCalledWith('/login?next=%2Fadmin%2Fanalytics%2Fcalendar%3Fview%3Dlist');
  AbortSignal.timeout = originalTimeout;
  jest.restoreAllMocks();
});
