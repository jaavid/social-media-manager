import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import MFAManager from './MFAManager';
import DataPrivacySection from './DataPrivacySection';
import DeleteAccountSection from './DeleteAccountSection';
import { mfaAPI, privacyAPI, profileAPI } from '@/services/domains/identity';
import { enMessages as mockMessages } from '@/i18n/messages';
let mockUser;
jest.mock('@/core/session', () => ({
  useSession: () => ({ user: mockUser, status: 'authenticated' }),
}));
jest.mock('@/services/domains/identity', () => ({
  mfaAPI: {
    status: jest.fn(),
    setup: jest.fn(),
    verifySetup: jest.fn(),
    regenerateBackupCodes: jest.fn(),
    disable: jest.fn(),
  },
  privacyAPI: {
    exportList: jest.fn(),
    exportRequest: jest.fn(),
    consents: jest.fn(),
    setConsent: jest.fn(),
    processingStatus: jest.fn(),
    setProcessingPaused: jest.fn(),
    deletionStatus: jest.fn(),
    deleteAccount: jest.fn(),
    cancelDeleteAccount: jest.fn(),
  },
  profileAPI: { deleteAccount: jest.fn() },
}));
jest.mock('@/i18n', () => ({
  useLanguage: () => ({
    t: (key) => mockMessages[key],
    tr: (v) => v,
    isPersian: false,
    formatDate: (v) => v,
    formatNumber: (v) => String(v),
  }),
}));
const stamp = '2026-10-07T10:00:00Z';
const disabled = { enabled: false, pending: false, backup_codes_remaining: 0, last_used_at: null };
const enabled = { ...disabled, enabled: true, backup_codes_remaining: 10 };
const codes = Array.from({ length: 10 }, (_, i) => String(i).padStart(10, '0'));
const seed = {
  secret: 'A'.repeat(32),
  qr_data_uri: 'data:image/png;base64,AAAA',
  otpauth_url: `otpauth://totp/fixture?secret=${'A'.repeat(32)}`,
};
const deletion = {
  id: 3,
  status: 'queued',
  requested_at: stamp,
  grace_until: stamp,
  cancelled_at: null,
  processed_at: null,
  reason: 'fixture',
};
const failure = (status) => ({
  isAxiosError: true,
  response: { status, data: { error: 'private-token' }, headers: {} },
});
const click = (key, area = screen) =>
  fireEvent.click(area.getByRole('button', { name: mockMessages[key], exact: true }));
const change = (key, value, area = screen) =>
  fireEvent.change(area.getByLabelText(mockMessages[key]), { target: { value } });
let clients = [];
function setup(Component = MFAManager, props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const root = () => (
    <QueryClientProvider client={client}>
      <Component {...props} />
    </QueryClientProvider>
  );
  const view = render(root());
  return {
    ...view,
    client,
    switch: (user) => {
      mockUser = user;
      view.rerender(root());
    },
  };
}
const area = (key) => within(screen.getByRole('region', { name: mockMessages[key], exact: true }));
async function startMfa() {
  await screen.findByText(mockMessages['mfa.disabled']);
  click('mfa.setup');
  click('account.confirm', within(screen.getByRole('alertdialog')));
  await screen.findByLabelText(mockMessages['mfa.code']);
}
beforeEach(() => {
  jest.resetAllMocks();
  mockUser = { id: 1, role: 'client', workspace_id: 7 };
  mfaAPI.status.mockResolvedValue({ data: disabled });
  mfaAPI.setup.mockResolvedValue({ data: seed });
  mfaAPI.verifySetup.mockResolvedValue({ data: { ok: true, backup_codes: codes } });
  mfaAPI.regenerateBackupCodes.mockResolvedValue({
    data: { ok: true, count: 10, backup_codes: codes },
  });
  mfaAPI.disable.mockResolvedValue({ data: { ok: true } });
  privacyAPI.exportList.mockResolvedValue({ data: { requests: [] } });
  privacyAPI.consents.mockResolvedValue({
    data: {
      consents: { data_processing: true },
      available: [{ type: 'data_processing', label: 'Core data processing' }],
    },
  });
  privacyAPI.processingStatus.mockResolvedValue({
    data: { workspaces: [{ id: 7, name: 'Workspace fixture', is_processing_paused: false }] },
  });
  privacyAPI.deletionStatus.mockResolvedValue({ data: { request: null } });
});
afterEach(() => {
  clients.forEach((c) => c.clear());
  clients = [];
  onlineManager.setOnline(true);
});
test.each([401, 403, 404, 429, 503, 'malformed'])(
  'MFA initial %s never guesses disabled',
  async (status) => {
    if (status === 'malformed') mfaAPI.status.mockResolvedValueOnce({ data: { enabled: false } });
    else mfaAPI.status.mockRejectedValueOnce(failure(status));
    setup();
    await screen.findByRole('alert');
    expect(screen.queryByText(mockMessages['mfa.disabled'])).toBeNull();
    expect(screen.queryByText('private-token')).toBeNull();
    click('recovery.retry');
    await screen.findByText(mockMessages['mfa.disabled']);
  },
);
test('enrollment input and secret survive background failure; issued codes survive refresh failure; clipboard awaits actual success', async () => {
  setup();
  await startMfa();
  change('mfa.code', '123456');
  mfaAPI.status.mockRejectedValueOnce(failure(503));
  click('recovery.refresh');
  await screen.findByText(mockMessages['recovery.stale']);
  expect(screen.getByLabelText(mockMessages['mfa.code'])).toHaveValue('123456');
  expect(screen.getByText(seed.secret)).toBeVisible();
  mfaAPI.status.mockRejectedValueOnce(failure(503));
  click('mfa.verify');
  await screen.findByText(codes[0]);
  expect(screen.getByText(mockMessages['mfa.saveCodes'])).toBeVisible();
  let reject;
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: jest.fn(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      ),
    },
  });
  click('mfa.copy');
  expect(screen.queryByText(mockMessages['mfa.copied'])).toBeNull();
  await act(async () => reject(new Error('denied')));
  await screen.findByText(mockMessages['mfa.copyFailed']);
  navigator.clipboard.writeText.mockResolvedValueOnce();
  click('mfa.copy');
  await screen.findByText(mockMessages['mfa.copied']);
  expect(
    clients[0]
      .getQueryCache()
      .getAll()
      .every((q) => !JSON.stringify(q.state.data).includes(seed.secret)),
  ).toBe(true);
});
test.each(['setup', 'verify', 'regenerate', 'disable'])(
  'MFA %s unknown result locks duplicate writes, no replay, and requires verified status',
  async (type) => {
    if (['regenerate', 'disable'].includes(type))
      mfaAPI.status.mockResolvedValue({ data: enabled });
    const api = {
      setup: 'setup',
      verify: 'verifySetup',
      regenerate: 'regenerateBackupCodes',
      disable: 'disable',
    }[type];
    let reject;
    mfaAPI[api].mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    setup();
    if (type === 'verify') {
      await startMfa();
      change('mfa.code', '123456');
      click('mfa.verify');
    } else {
      await screen.findByText(
        mockMessages[['regenerate', 'disable'].includes(type) ? 'mfa.enabled' : 'mfa.disabled'],
      );
      click(`mfa.${type}`);
      const dialog = within(screen.getByRole('alertdialog'));
      if (type !== 'setup') change('mfa.code', '123456', dialog);
      if (type === 'disable') change('mfa.password', 'fixture-password', dialog);
      const confirm = dialog.getByRole('button', { name: mockMessages['account.confirm'] });
      fireEvent.click(confirm);
      fireEvent.click(confirm);
    }
    await waitFor(() => expect(mfaAPI[api]).toHaveBeenCalledTimes(1));
    await act(async () => reject(failure(503)));
    await screen.findByText(mockMessages['mfa.uncertain']);
    if (type === 'verify')
      expect(screen.getByLabelText(mockMessages['mfa.code'])).toHaveValue('123456');
    act(() => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(mfaAPI[api]).toHaveBeenCalledTimes(1);
    mfaAPI.status.mockRejectedValueOnce(failure(503));
    click('account.checkStatus');
    await waitFor(() => expect(screen.getByText(mockMessages['mfa.uncertain'])).toBeVisible());
    mfaAPI.status.mockResolvedValue({
      data:
        type === 'disable' ? disabled : type === 'setup' ? { ...disabled, pending: true } : enabled,
    });
    click('account.checkStatus');
    await waitFor(() => expect(screen.queryByText(mockMessages['mfa.uncertain'])).toBeNull());
    if (type === 'verify' || type === 'regenerate')
      await screen.findByText(mockMessages['mfa.lostCodes']);
    if (type === 'setup') await screen.findByText(mockMessages['mfa.lostSetup']);
    expect(mfaAPI[api]).toHaveBeenCalledTimes(1);
  },
);
test('MFA rejects empty codes and false disable acknowledgment', async () => {
  mfaAPI.status.mockResolvedValue({ data: enabled });
  mfaAPI.disable.mockResolvedValue({ data: { ok: false } });
  setup();
  await screen.findByText(mockMessages['mfa.enabled']);
  click('mfa.disable');
  const dialog = within(screen.getByRole('alertdialog'));
  change('mfa.password', 'fixture', dialog);
  change('mfa.code', '123456', dialog);
  click('account.confirm', dialog);
  await screen.findByText(mockMessages['mfa.uncertain']);
  expect(screen.getByText(mockMessages['mfa.enabled'])).toBeVisible();
});
test('context change aborts old MFA status and discards late secret mutation', async () => {
  let resolve, signal;
  mfaAPI.status.mockImplementationOnce((s) => {
    signal = s;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const view = setup();
  view.switch({ id: 2, role: 'client', workspace_id: 9 });
  await screen.findByText(mockMessages['mfa.disabled']);
  expect(signal.aborted).toBe(true);
  await act(async () => resolve({ data: enabled }));
  expect(screen.queryByText(mockMessages['mfa.enabled'])).toBeNull();
  let secret;
  mfaAPI.setup.mockImplementationOnce(
    () =>
      new Promise((done) => {
        secret = done;
      }),
  );
  click('mfa.setup');
  click('account.confirm', within(screen.getByRole('alertdialog')));
  await waitFor(() => expect(mfaAPI.setup).toHaveBeenCalledTimes(1));
  view.switch({ id: 3, role: 'client', workspace_id: 11 });
  await screen.findByText(mockMessages['mfa.disabled']);
  await act(async () => secret({ data: seed }));
  expect(screen.queryByText(seed.secret)).toBeNull();
});
test.each([401, 403, 404, 429, 503, 'malformed'])(
  'privacy export %s is local; other data stays real',
  async (status) => {
    if (status === 'malformed') privacyAPI.exportList.mockResolvedValueOnce({ data: {} });
    else privacyAPI.exportList.mockRejectedValueOnce(failure(status));
    setup(DataPrivacySection);
    await waitFor(() => expect(area('privacy.exports').getByRole('alert')).toBeVisible());
    expect(area('privacy.exports').queryByText(mockMessages['privacy.noExports'])).toBeNull();
    await screen.findByText('Workspace fixture');
    expect(area('privacy.consents').getByRole('switch')).toBeChecked();
    click('recovery.retry', area('privacy.exports'));
    await screen.findByText(mockMessages['privacy.noExports']);
  },
);
test('privacy readers preserve previous data independently; denial hides just the affected section', async () => {
  setup(DataPrivacySection);
  await screen.findByText('Workspace fixture');
  privacyAPI.processingStatus.mockRejectedValueOnce(failure(503));
  click('recovery.refresh', area('privacy.processing'));
  await screen.findByText(mockMessages['recovery.stale']);
  expect(screen.getByText('Workspace fixture')).toBeVisible();
  privacyAPI.processingStatus.mockRejectedValueOnce(failure(403));
  click('recovery.retry', area('privacy.processing'));
  await waitFor(() => expect(screen.queryByText('Workspace fixture')).toBeNull());
  expect(area('privacy.consents').getByRole('switch')).toBeChecked();
});
test.each(['setConsent', 'setProcessingPaused', 'exportRequest'])(
  'privacy %s malformed write never succeeds and cannot replay',
  async (method) => {
    privacyAPI[method].mockResolvedValue({ data: {} });
    setup(DataPrivacySection);
    await screen.findByText('Workspace fixture');
    if (method === 'exportRequest') click('privacy.requestExport');
    else
      fireEvent.click(
        area(method === 'setConsent' ? 'privacy.consents' : 'privacy.processing').getByRole(
          'switch',
        ),
      );
    await screen.findByText(mockMessages['account.uncertain']);
    expect(screen.queryByText(mockMessages['account.saved'])).toBeNull();
    expect(screen.queryByText(mockMessages['privacy.exportAccepted'])).toBeNull();
    act(() => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    expect(privacyAPI[method]).toHaveBeenCalledTimes(1);
  },
);
test('scheduled deletion loads its own status; unknown write reconciles without replay and input is retained', async () => {
  privacyAPI.deleteAccount.mockRejectedValueOnce(failure(503));
  setup(DataPrivacySection);
  await screen.findByText(mockMessages['privacy.noDeletion']);
  click('privacy.requestDeletion');
  const dialog = within(screen.getByRole('alertdialog'));
  change('privacy.reason', 'fixture reason', dialog);
  change('privacy.typeDelete', 'DELETE', dialog);
  click('account.confirm', dialog);
  await screen.findByText(mockMessages['account.uncertain']);
  expect(dialog.getByLabelText(mockMessages['privacy.reason'])).toHaveValue('fixture reason');
  privacyAPI.deletionStatus.mockResolvedValue({ data: { request: deletion } });
  click('account.checkStatus', dialog);
  await screen.findByRole('button', { name: mockMessages['privacy.cancelDeletion'] });
  expect(privacyAPI.deleteAccount).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(mockMessages['privacy.deletionAccepted'])).toBeNull();
  privacyAPI.cancelDeleteAccount.mockResolvedValue({
    data: { ...deletion, status: 'cancelled', cancelled_at: stamp },
  });
  privacyAPI.deletionStatus.mockRejectedValueOnce(failure(503));
  click('privacy.cancelDeletion');
  click('account.confirm', within(screen.getByRole('alertdialog')));
  await screen.findByText(mockMessages['privacy.deletionAccepted']);
  expect(screen.getByText(/Cancelled/)).toBeVisible();
});
test('immediate DELETE rejects malformed result, retains reason/confirmation, never logs out or repeats', async () => {
  const logout = jest.fn(),
    navigate = jest.fn();
  profileAPI.deleteAccount.mockResolvedValue({ data: {} });
  setup(DeleteAccountSection, { logout, navigate });
  click('privacy.immediateTitle');
  const dialog = within(screen.getByRole('alertdialog'));
  change('privacy.reason', 'fixture', dialog);
  change('privacy.typeDelete', 'DELETE', dialog);
  click('account.confirm', dialog);
  await screen.findByText(mockMessages['privacy.immediateUnknown']);
  expect(logout).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
  expect(dialog.getByLabelText(mockMessages['privacy.reason'])).toHaveValue('fixture');
  expect(dialog.getByRole('button', { name: mockMessages['account.confirm'] })).toBeDisabled();
  expect(privacyAPI.deleteAccount).not.toHaveBeenCalled();
  expect(profileAPI.deleteAccount).toHaveBeenCalledTimes(1);
});

test('verified immediate deletion never repeats when subsequent logout fails; only logout is retried', async () => {
  const logout = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(),
    navigate = jest.fn();
  profileAPI.deleteAccount.mockResolvedValue({
    data: { detail: 'Your account has been permanently deleted.' },
  });
  setup(DeleteAccountSection, { logout, navigate });
  click('privacy.immediateTitle');
  const dialog = within(screen.getByRole('alertdialog'));
  change('privacy.typeDelete', 'DELETE', dialog);
  click('account.confirm', dialog);
  await screen.findByText(mockMessages['privacy.logoutFailed']);
  expect(navigate).not.toHaveBeenCalled();
  expect(dialog.getByRole('button', { name: mockMessages['account.confirm'] })).toBeDisabled();
  click('privacy.signOut', dialog);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  expect(profileAPI.deleteAccount).toHaveBeenCalledTimes(1);
  expect(logout).toHaveBeenCalledTimes(2);
});
