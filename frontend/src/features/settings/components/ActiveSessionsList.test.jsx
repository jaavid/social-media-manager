import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import ActiveSessionsList from './ActiveSessionsList';
import { sessionsAPI } from '@/services/domains/identity';
import { enMessages as mockMessages } from '@/i18n/messages';
let mockUser;
jest.mock('@/core/session', () => ({
  useSession: () => ({ user: mockUser, status: 'authenticated' }),
}));
jest.mock('@/services/domains/identity', () => ({
  sessionsAPI: { list: jest.fn(), revoke: jest.fn(), revokeAll: jest.fn() },
}));
jest.mock('@/i18n', () => ({
  useLanguage: () => ({
    t: (key) => mockMessages[key],
    tr: (v) => v,
    isPersian: false,
    formatDate: (v) => v,
  }),
}));
const row = {
  id: 5,
  browser: 'Fixture browser',
  os: 'Test OS',
  device: 'Desktop',
  ip: null,
  last_used_at: '2026-10-07T10:00:00Z',
  is_active: true,
};
const response = (rows = [row]) => ({ data: { sessions: rows, count: rows.length } });
const failure = (status) => ({
  isAxiosError: true,
  response: { status, data: { error: 'private-token' }, headers: {} },
});
const click = (key) => fireEvent.click(screen.getByRole('button', { name: mockMessages[key] }));
let clients = [];
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const root = (
    <QueryClientProvider client={client}>
      <ActiveSessionsList />
    </QueryClientProvider>
  );
  const view = render(root);
  return {
    ...view,
    client,
    switch: (user) => {
      mockUser = user;
      view.rerender(
        <QueryClientProvider client={client}>
          <ActiveSessionsList />
        </QueryClientProvider>,
      );
    },
  };
}
beforeEach(() => {
  jest.resetAllMocks();
  mockUser = { id: 1, role: 'staff', account_type: 'legacy', workspace_id: 7 };
  sessionsAPI.list.mockResolvedValue(response());
  sessionsAPI.revoke.mockResolvedValue({ data: { ok: true } });
});
afterEach(() => {
  clients.forEach((client) => client.clear());
  clients = [];
  onlineManager.setOnline(true);
});
test.each([401, 403, 404, 429, 503])(
  'initial %s never shows empty or exposes raw errors; read recovery works',
  async (status) => {
    sessionsAPI.list.mockRejectedValueOnce(failure(status));
    setup();
    await screen.findByRole('alert');
    expect(screen.queryByText(mockMessages['sessions.empty'])).toBeNull();
    expect(screen.queryByText('private-token')).toBeNull();
    click('recovery.retry');
    expect(await screen.findByText('Fixture browser · Test OS · Desktop')).toBeVisible();
  },
);
test('same-scope background failure retains rows; forbidden hides them', async () => {
  setup();
  await screen.findByText('Fixture browser · Test OS · Desktop');
  sessionsAPI.list.mockRejectedValueOnce(failure(503));
  click('recovery.refresh');
  await screen.findByText(mockMessages['recovery.stale']);
  expect(screen.getByText('Fixture browser · Test OS · Desktop')).toBeVisible();
  sessionsAPI.list.mockRejectedValueOnce(failure(403));
  click('recovery.retry');
  await waitFor(() => expect(screen.queryByText('Fixture browser · Test OS · Desktop')).toBeNull());
});
test('scope change aborts the obsolete read; late response never replaces the new identity', async () => {
  let resolve, signal;
  sessionsAPI.list.mockImplementationOnce((s) => {
    signal = s;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const view = setup();
  view.switch({ ...mockUser, id: 2, workspace_id: 9 });
  await screen.findByText('Fixture browser · Test OS · Desktop');
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(response([{ ...row, browser: 'Old private browser' }])));
  expect(screen.queryByText(/Old private browser/)).toBeNull();
});
test('unconfirmed revocation preserves target; verification unlocks a manual retry and no offline replay occurs', async () => {
  sessionsAPI.revoke.mockRejectedValueOnce(failure(503));
  setup();
  await screen.findByText('Fixture browser · Test OS · Desktop');
  click('sessions.revoke');
  const dialog = screen.getByRole('alertdialog');
  fireEvent.click(within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] }));
  await screen.findByText(mockMessages['sessions.uncertain']);
  expect(
    within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] }),
  ).toBeDisabled();
  await act(async () => {
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
  });
  expect(sessionsAPI.revoke).toHaveBeenCalledTimes(1);
  fireEvent.click(within(dialog).getByRole('button', { name: mockMessages['recovery.retry'] }));
  await waitFor(() =>
    expect(
      within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] }),
    ).toBeEnabled(),
  );
  sessionsAPI.list.mockResolvedValue(response([{ ...row, is_active: false }]));
  fireEvent.click(within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] }));
  await screen.findByText(mockMessages['sessions.revoked']);
  expect(sessionsAPI.revoke).toHaveBeenNthCalledWith(2, 5);
});
test('malformed write never claims success; late writes after context switch do not touch the new screen', async () => {
  sessionsAPI.revoke.mockResolvedValueOnce({ data: {} });
  const view = setup();
  await screen.findByText('Fixture browser · Test OS · Desktop');
  click('sessions.revoke');
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', {
      name: mockMessages['sessions.revoke'],
    }),
  );
  await screen.findByText(mockMessages['sessions.uncertain']);
  expect(screen.queryByText(mockMessages['sessions.revoked'])).toBeNull();
  click('recovery.retry');
  await waitFor(() =>
    expect(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: mockMessages['sessions.revoke'],
      }),
    ).toBeEnabled(),
  );
  let resolve;
  sessionsAPI.revoke.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', {
      name: mockMessages['sessions.revoke'],
    }),
  );
  view.switch({ ...mockUser, workspace_id: 9 });
  await act(async () => resolve({ data: { ok: true } }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.queryByText(mockMessages['sessions.revoked'])).toBeNull();
});
test('pending revocation locks duplicate submission and dismissal; authoritative inactive read resolves uncertainty without another write', async () => {
  let reject;
  sessionsAPI.revoke.mockImplementationOnce(
    () =>
      new Promise((resolve, fail) => {
        reject = fail;
      }),
  );
  setup();
  await screen.findByText('Fixture browser · Test OS · Desktop');
  click('sessions.revoke');
  const dialog = screen.getByRole('alertdialog');
  const submit = within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(sessionsAPI.revoke).toHaveBeenCalledTimes(1);
  expect(
    within(dialog).getByRole('button', { name: mockMessages['recovery.cancel'] }),
  ).toBeDisabled();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(dialog).toBeInTheDocument();
  await act(async () => reject(failure(503)));
  await screen.findByText(mockMessages['sessions.uncertain']);
  sessionsAPI.list.mockResolvedValue(response([{ ...row, is_active: false }]));
  fireEvent.click(within(dialog).getByRole('button', { name: mockMessages['recovery.retry'] }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(sessionsAPI.revoke).toHaveBeenCalledTimes(1);
  expect(screen.getByText(mockMessages['sessions.inactive'])).toBeVisible();
});
test('sign-out-everywhere retains the current-session warning and validates the distinct write contract', async () => {
  sessionsAPI.revokeAll.mockResolvedValueOnce({ data: { ok: true } });
  setup();
  await screen.findByText('Fixture browser · Test OS · Desktop');
  click('sessions.revokeAll');
  const dialog = screen.getByRole('alertdialog');
  expect(within(dialog).getByText(mockMessages['sessions.allHint'])).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] }));
  await screen.findByText(mockMessages['sessions.uncertain']);
  expect(sessionsAPI.revokeAll).toHaveBeenCalledTimes(1);
  expect(sessionsAPI.revoke).not.toHaveBeenCalled();
  expect(screen.queryByText(mockMessages['sessions.revoked'])).toBeNull();
});

test('cancelled refetch with cached success cannot unlock an ambiguous revocation', async () => {
  sessionsAPI.revoke.mockRejectedValueOnce(failure(503));
  const view = setup();
  await screen.findByText('Fixture browser · Test OS · Desktop');
  click('sessions.revoke');
  const dialog = screen.getByRole('alertdialog');
  const submit = within(dialog).getByRole('button', { name: mockMessages['sessions.revoke'] });
  fireEvent.click(submit);
  await screen.findByText(mockMessages['sessions.uncertain']);
  sessionsAPI.list.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(within(dialog).getByRole('button', { name: mockMessages['recovery.retry'] }));
  await waitFor(() => expect(sessionsAPI.list).toHaveBeenCalledTimes(2));
  await act(async () => view.client.cancelQueries({ queryKey: ['account-sessions'] }));
  expect(submit).toBeDisabled();
  expect(sessionsAPI.revoke).toHaveBeenCalledTimes(1);
});
