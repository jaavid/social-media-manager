import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { NavigationProvider } from '../../core/navigation';
import NotificationBell from './NotificationBell';
import { alertsAPI, notificationAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

jest.mock('../../hooks/useAuth');
jest.mock('../../services/api', () => ({
  alertsAPI: { list: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() },
  notificationAPI: { list: jest.fn(), markRead: jest.fn(), markAll: jest.fn() },
  invitationAPI: { respond: jest.fn() },
}));

const authenticated = {
  status: 'authenticated', user: { id: 7, role: 'client', client_id: 12 },
  refreshAuth: jest.fn(),
};

let client;
function wrap(child = <NotificationBell />) { return <QueryClientProvider client={client}><NavigationProvider>{child}</NavigationProvider></QueryClientProvider>; }
function mount() { return render(wrap()); }
afterEach(() => { client.clear(); jest.useRealTimers(); });

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  alertsAPI.list.mockResolvedValue({ data: [] });
  notificationAPI.list.mockResolvedValue({ data: [] });
});

test.each([
  ['anonymous', { status: 'anonymous', user: null, refreshAuth: jest.fn() }],
  ['hydrating', { status: 'initializing', user: null, refreshAuth: jest.fn() }],
  ['missing client scope', { status: 'authenticated', user: { id: 7, role: 'client', client_id: null }, refreshAuth: jest.fn() }],
])('%s session never requests alerts or notifications', async (_label, auth) => {
  useAuth.mockReturnValue(auth);
  mount();
  await Promise.resolve();
  expect(alertsAPI.list).not.toHaveBeenCalled();
  expect(notificationAPI.list).not.toHaveBeenCalled();
});

test('authenticated session starts both pollers', async () => {
  useAuth.mockReturnValue(authenticated);
  mount();
  await waitFor(() => expect(alertsAPI.list).toHaveBeenCalledTimes(1));
  expect(notificationAPI.list).toHaveBeenCalledTimes(1);
});

test('logout aborts requests, clears caches, and stops future polling', async () => {
  jest.useFakeTimers();
  alertsAPI.list.mockImplementation(() => new Promise(() => {}));
  notificationAPI.list.mockImplementation(() => new Promise(() => {}));
  useAuth.mockReturnValue(authenticated);
  const view = mount();
  await waitFor(() => expect(notificationAPI.list).toHaveBeenCalledTimes(1));
  const alertSignal = alertsAPI.list.mock.calls[0][1].signal;
  const notificationSignal = notificationAPI.list.mock.calls[0][0].signal;

  useAuth.mockReturnValue({ status: 'anonymous', user: null, refreshAuth: jest.fn() });
  view.rerender(wrap());
  expect(alertSignal.aborted).toBe(true);
  expect(notificationSignal.aborted).toBe(true);
  jest.advanceTimersByTime(120000);
  expect(alertsAPI.list).toHaveBeenCalledTimes(1);
  expect(notificationAPI.list).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});


test('header variant fits inside the 56px top bar', () => {
  useAuth.mockReturnValue(authenticated);
  render(wrap(<NotificationBell variant="ghost" />));
  expect(screen.getByTitle('Notifications & Alerts')).toHaveStyle({ width: '36px', height: '36px', boxShadow: 'none' });
});
