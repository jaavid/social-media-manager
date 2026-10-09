import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useNotificationFeed from './useNotificationFeed';
import { alertsAPI, notificationAPI } from '@/services/domains/reporting';
let mockUser;
jest.mock('@/core/session', () => ({ useSession: () => ({ user: mockUser, status: 'authenticated' }) }));
jest.mock('@/services/domains/reporting', () => ({ alertsAPI: { list: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() }, notificationAPI: { list: jest.fn(), markRead: jest.fn(), markAll: jest.fn() } }));
const row = { id: 1, message: 'fixture alert', alert_type: 'sync_failed', is_read: false, created_at: '2026-10-07T10:00:00Z' };
let client;
beforeEach(() => { jest.clearAllMocks(); mockUser = { id: 1, role: 'staff' }; client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); alertsAPI.list.mockResolvedValue({ data: [row] }); });
afterEach(() => client.clear());
const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
test('background failure retains data; rapid scope switch hides old rows and late result', async () => {
  const view = renderHook(({ workspace }) => useNotificationFeed('alerts', workspace), { initialProps: { workspace: 7 }, wrapper });
  await waitFor(() => expect(view.result.current.rows).toHaveLength(1)); alertsAPI.list.mockRejectedValueOnce(new Error('offline'));
  await act(async () => view.result.current.refetch()); expect(view.result.current.rows[0].message).toBe('fixture alert');
  let resolve; alertsAPI.list.mockImplementation(() => new Promise(r => { resolve = r; })); view.rerender({ workspace: 9 }); expect(view.result.current.rows).toEqual([]);
  mockUser = { id: 2, role: 'staff' }; view.rerender({ workspace: 10 }); await act(async () => resolve({ data: [{ ...row, message: 'replacement' }] })); expect(view.result.current.rows.every(r => r.message !== 'fixture alert')).toBe(true);
});
test('malformed mark outcome never marks locally; checked read unlocks only manual new action', async () => {
  alertsAPI.markRead.mockResolvedValue({ data: {} }); const view = renderHook(() => useNotificationFeed('alerts', 7), { wrapper }); await waitFor(() => expect(view.result.current.rows).toHaveLength(1));
  await act(async () => { await Promise.all([view.result.current.markRead(1), view.result.current.markRead(1)]); }); expect(alertsAPI.markRead).toHaveBeenCalledTimes(1); expect(view.result.current.rows[0].is_read).toBe(false); expect(view.result.current.write.uncertain).toBe(true);
  await act(async () => view.result.current.refetch()); expect(view.result.current.write).toBeNull(); expect(alertsAPI.markRead).toHaveBeenCalledTimes(1);
});
test('permission failure hides affected rows; independent notification feed remains valid', async () => {
  notificationAPI.list.mockResolvedValue({ data: [] }); const alerts = renderHook(() => useNotificationFeed('alerts', 7), { wrapper }); const notifications = renderHook(() => useNotificationFeed('notifications', 7), { wrapper }); await waitFor(() => expect(alerts.result.current.rows).toHaveLength(1));
  alertsAPI.list.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {}, headers: {} } }); await act(async () => alerts.result.current.refetch()); await waitFor(() => expect(alerts.result.current.rows).toEqual([])); expect(notifications.result.current.data).toEqual([]);
});
