import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

function mount() {
  return render(<MemoryRouter><NotificationBell /></MemoryRouter>);
}

beforeEach(() => {
  jest.clearAllMocks();
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
  useAuth.mockReturnValue(authenticated);
  const view = mount();
  await waitFor(() => expect(notificationAPI.list).toHaveBeenCalledTimes(1));
  const alertSignal = alertsAPI.list.mock.calls[0][1].signal;
  const notificationSignal = notificationAPI.list.mock.calls[0][0].signal;

  useAuth.mockReturnValue({ status: 'anonymous', user: null, refreshAuth: jest.fn() });
  view.rerender(<MemoryRouter><NotificationBell /></MemoryRouter>);
  expect(alertSignal.aborted).toBe(true);
  expect(notificationSignal.aborted).toBe(true);
  jest.advanceTimersByTime(120000);
  expect(alertsAPI.list).toHaveBeenCalledTimes(1);
  expect(notificationAPI.list).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
