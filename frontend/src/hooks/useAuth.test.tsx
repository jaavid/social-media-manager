import { useState } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useWorkspaceScope from './useWorkspaceScope';
import { useAppStore } from '../stores/appStore';
import { AuthProvider, useAuth } from './useAuth';
import { authAPI } from '../services/domains/identity';
import { api } from '../services/http/client';
import { invalidateSession } from '../lib/auth/session';
jest.mock('../services/domains/identity', () => ({ authAPI: { me: jest.fn(), login: jest.fn() }, mfaAPI: { login: jest.fn() } }));
jest.mock('../services/http/client', () => ({ api: { delete: jest.fn() } }));
jest.mock('../lib/auth/browser', () => ({ migrateLegacySession: jest.fn(() => Promise.resolve()) }));
jest.mock('../core/navigation', () => ({ useAppParams: () => ({}), useAppLocation: () => ({ pathname: '/dashboard' }), useAppSearchParams: () => [new URLSearchParams()] }));
const mockMe = jest.mocked(authAPI.me);
const user = { id: 1, role: 'staff', account_type: 'legacy', email: 'first@example.com', permissions: {} };
function Probe() {
  const session = useAuth();
  if (!session) throw new Error('Missing provider');
  return <><output>{session.status}:{session.user?.email}</output>
    <button onClick={session.retry}>Retry</button>
    <button onClick={() => void session.logout()}>Logout</button>
  </>;
}
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); });
test('temporary bootstrap failure offers recovery and preserves credentials', async () => {
  localStorage.setItem('refresh_token', 'legacy-session');
  mockMe.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 }, message: 'Unavailable' });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('unavailable'));
  expect(localStorage.getItem('refresh_token')).toBe('legacy-session');
  mockMe.mockResolvedValueOnce({ data: user } as Awaited<ReturnType<typeof authAPI.me>>);
  fireEvent.click(screen.getByText('Retry'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('authenticated:first@example.com'));
});
test('late bootstrap cannot repopulate private data after invalidation', async () => {
  let finish: (value: Awaited<ReturnType<typeof authAPI.me>>) => void = () => {};
  mockMe.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(mockMe).toHaveBeenCalled());
  act(() => { invalidateSession(); });
  await act(async () => { finish({ data: user } as Awaited<ReturnType<typeof authAPI.me>>); });
  expect(screen.getByRole('status')).toHaveTextContent('anonymous:');
  expect(screen.getByRole('status')).not.toHaveTextContent(user.email);
});
test('unsupported identity fails closed', async () => {
  mockMe.mockResolvedValueOnce({ data: { ...user, role: 'unknown' } } as Awaited<ReturnType<typeof authAPI.me>>);
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('unavailable:'));
  expect(screen.getByRole('status')).not.toHaveTextContent(user.email);
});
test('logout revokes on the server before clearing private identity', async () => {
  mockMe.mockResolvedValue({ data: user } as Awaited<ReturnType<typeof authAPI.me>>);
  jest.mocked(api.delete).mockResolvedValueOnce({ status: 204 });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('authenticated'));
  fireEvent.click(screen.getByText('Logout'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('anonymous'));
  expect(api.delete).toHaveBeenCalledWith('/auth/session/');
});

test('cross-tab invalidation clears workspace selection and badge state', async () => {
  mockMe.mockResolvedValue({ data: user } as Awaited<ReturnType<typeof authAPI.me>>);
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('authenticated'));
  useAppStore.getState().selectWorkspace(42, 1, '/admin/analytics');
  useAppStore.getState().setBadgeCounts({ unread_inbox: 20 });
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'social-stats.session-invalidated', newValue: 'logout' })));
  expect(screen.getByRole('status')).toHaveTextContent('anonymous');
  expect(useAppStore.getState().workspaceSelection).toBeNull();
  expect(useAppStore.getState().badgeCounts.unread_inbox).toBe(0);
});

function ScopeProbe() {
  const [outcome, setOutcome] = useState('');
  const session = useAuth();
  const scope = useWorkspaceScope();
  if (!session) throw new Error('Missing provider');
  return <><output>{scope.workspaceId ?? 'none'}</output><span data-testid="login-outcome">{outcome}</span>
    <button onClick={() => void session.login('second@example.test', 'fixture').then(() => setOutcome('resolved')).catch(() => setOutcome('rejected'))}>Switch identity</button>
    <button onClick={() => void session.logout().catch(() => {})}>Revoke</button></>;
}
test('pending login/logout pause workspace scope and account switching ignores A selection', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  mockMe.mockResolvedValueOnce({ data: { ...user, workspace_id: 42 } } as Awaited<ReturnType<typeof authAPI.me>>);
  const view = render(<QueryClientProvider client={client}><AuthProvider><ScopeProbe /></AuthProvider></QueryClientProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('42'));
  useAppStore.getState().selectWorkspace(42, 1, '/dashboard');
  let finishLogin: (value: Awaited<ReturnType<typeof authAPI.login>>) => void = () => {};
  jest.mocked(authAPI.login).mockImplementationOnce(() => new Promise(resolve => { finishLogin = resolve; }));
  mockMe.mockResolvedValueOnce({ data: { ...user, id: 2, workspace_id: 7 } } as Awaited<ReturnType<typeof authAPI.me>>);
  fireEvent.click(screen.getByText('Switch identity'));
  expect(screen.getByRole('status')).toHaveTextContent('none');
  await act(async () => { finishLogin({ data: {} } as Awaited<ReturnType<typeof authAPI.login>>); });
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('7'));
  let finishLogout: (value: unknown) => void = () => {};
  jest.mocked(api.delete).mockImplementationOnce(() => new Promise(resolve => { finishLogout = resolve; }));
  fireEvent.click(screen.getByText('Revoke'));
  expect(screen.getByRole('status')).toHaveTextContent('none');
  await act(async () => { finishLogout({ status: 204 }); });
  expect(useAppStore.getState().workspaceSelection).toBeNull();
  view.unmount(); client.clear();
});

test.each([{}, { mfa_required: true, mfa_token: 'superseded' }])('invalidation rejects superseded login/MFA result %j', async result => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  mockMe.mockResolvedValueOnce({ data: { ...user, workspace_id: 42 } } as Awaited<ReturnType<typeof authAPI.me>>);
  const view = render(<QueryClientProvider client={client}><AuthProvider><ScopeProbe /></AuthProvider></QueryClientProvider>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('42'));
  let finish: (value: Awaited<ReturnType<typeof authAPI.login>>) => void = () => {};
  jest.mocked(authAPI.login).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByText('Switch identity'));
  act(() => { invalidateSession(); });
  await act(async () => { finish({ data: result } as Awaited<ReturnType<typeof authAPI.login>>); });
  expect(mockMe).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('login-outcome')).toHaveTextContent('rejected');
  expect(screen.getByRole('status')).toHaveTextContent('none');
  view.unmount(); client.clear();
});
