import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SyncLogsPage from './SyncLogsPage';
import { syncLogsAPI } from '@/services/domains/reporting';
import { enMessages as mockMessages } from '@/i18n/messages';
let mockUser;
jest.mock('@/core/session', () => ({
  useSession: () => ({ user: mockUser, status: 'authenticated' }),
}));
jest.mock('@/services/domains/reporting', () => ({ syncLogsAPI: { list: jest.fn() } }));
jest.mock(
  '@/components/layout/PageHeader',
  () =>
    function Header({ title, actions }) {
      return (
        <header>
          {title}
          {actions}
        </header>
      );
    },
);
jest.mock('@/i18n', () => ({
  useLanguage: () => ({
    t: (key) => mockMessages[key],
    tr: (v) => v,
    isPersian: false,
    formatDate: (v) => v,
    formatNumber: (v) => String(v),
  }),
}));
const row = {
  id: 1,
  platform: 'fixture',
  status: 'success',
  client_name: 'Verified workspace',
  records_synced: 0,
  started_at: '2026-10-07T10:00:00Z',
  duration_seconds: null,
  error_message: 'private-token',
};
const failure = (status) => ({
  isAxiosError: true,
  response: { status, data: { detail: 'private-token' }, headers: {} },
});
let clients = [];
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const root = () => (
    <QueryClientProvider client={client}>
      <SyncLogsPage />
    </QueryClientProvider>
  );
  const view = render(root());
  return {
    ...view,
    switch: (user) => {
      mockUser = user;
      view.rerender(root());
    },
  };
}
beforeEach(() => {
  jest.resetAllMocks();
  mockUser = { id: 1, role: 'staff', account_type: 'legacy', workspace_id: 7 };
  syncLogsAPI.list.mockResolvedValue({ data: [row] });
});
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients = [];
});
test.each([401, 403, 404, 429, 503])(
  'initial %s never becomes empty; retry is the same read',
  async (status) => {
    syncLogsAPI.list.mockRejectedValueOnce(failure(status));
    setup();
    await screen.findByRole('alert');
    expect(screen.queryByText(mockMessages['syncLogs.empty'])).toBeNull();
    expect(screen.queryByText('private-token')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: mockMessages['recovery.retry'] }));
    await screen.findByRole('table');
    expect(
      syncLogsAPI.list.mock.calls.every(
        ([params, signal]) => Object.keys(params).length === 0 && signal instanceof AbortSignal,
      ),
    ).toBe(true);
  },
);
test('refresh failure keeps table and filter; malformed response is a failure; forbidden hides private rows', async () => {
  setup();
  await screen.findByRole('table');
  fireEvent.change(screen.getByLabelText(mockMessages['syncLogs.platform']), {
    target: { value: 'fixture' },
  });
  syncLogsAPI.list.mockResolvedValueOnce({ data: {} });
  fireEvent.click(screen.getByRole('button', { name: mockMessages['recovery.refresh'] }));
  await screen.findByText(mockMessages['recovery.stale']);
  expect(screen.getByRole('table')).toBeVisible();
  expect(screen.getByLabelText(mockMessages['syncLogs.platform'])).toHaveValue('fixture');
  expect(screen.queryByText('private-token')).toBeNull();
  syncLogsAPI.list.mockRejectedValueOnce(failure(403));
  fireEvent.click(screen.getByRole('button', { name: mockMessages['recovery.retry'] }));
  await waitFor(() => expect(screen.queryByRole('table')).toBeNull());
});
test('no-results differs from a successful empty collection', async () => {
  setup();
  await screen.findByRole('table');
  fireEvent.change(screen.getByLabelText(mockMessages['syncLogs.status']), {
    target: { value: 'failed' },
  });
  expect(screen.getByText(mockMessages['recovery.noResults'])).toBeVisible();
  syncLogsAPI.list.mockResolvedValueOnce({ data: [] });
  fireEvent.click(screen.getByRole('button', { name: mockMessages['recovery.refresh'] }));
  await screen.findByText(mockMessages['syncLogs.empty']);
});
test('slow previous identity is cancelled and cannot publish stale rows after account/workspace switch', async () => {
  let signal, resolve;
  syncLogsAPI.list.mockImplementationOnce((params, s) => {
    signal = s;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const view = setup();
  expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  view.switch({ ...mockUser, id: 2, workspace_id: 8 });
  await screen.findByRole('table');
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: [{ ...row, client_name: 'Old private workspace' }] }));
  expect(screen.queryByText('Old private workspace')).toBeNull();
});
