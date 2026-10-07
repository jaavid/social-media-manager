import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import APIKeysSection from './APIKeysSection';
import PasswordSection from './PasswordSection';
import { apiKeysAPI, profileAPI } from '@/services/domains/identity';
import { enMessages as mockMessages } from '@/i18n/messages';
let mockUser;
jest.mock('@/core/session', () => ({ useSession: () => ({ user: mockUser, status: 'authenticated' }) }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => mockMessages[key], tr: value => value }) }));
jest.mock('@/services/domains/identity', () => ({ apiKeysAPI: { list: jest.fn(), create: jest.fn(), revoke: jest.fn() }, profileAPI: { get: jest.fn(), changePassword: jest.fn() } }));
jest.mock('./SecuritySections', () => ({ MFAManager: () => null, ActiveSessionsList: () => null }));
const metadata = { id: 1, name: 'fixture', key_prefix: 'sk_live_AAAA', scopes: [], ip_allowlist: [], is_active: true, is_expired: false, created_at: '2026-10-07T10:00:00Z', revoked_at: null, expires_at: null, last_used_at: null, use_count: 0 };
const secret = `sk_live_${'A'.repeat(32)}`;
const click = key => fireEvent.click(screen.getByRole('button', { name: mockMessages[key], exact: true }));
const input = (key, value) => fireEvent.change(screen.getByLabelText(mockMessages[key]), { target: { value } });
let client;
function setup(Component = APIKeysSection) {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><Component /></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); mockUser = { id: 1, role: 'client', client_id: 7 }; apiKeysAPI.list.mockResolvedValue({ data: { keys: [metadata] } }); profileAPI.get.mockResolvedValue({ data: { id: 1, is_social: false } }); });
afterEach(() => client?.clear());
test('initial malformed reader cannot show empty', async () => {
  apiKeysAPI.list.mockResolvedValue({ data: {} }); setup(); await screen.findByText(mockMessages['recovery.failed']); expect(screen.queryByText(mockMessages['keys.empty'])).not.toBeInTheDocument();
});
test('verified key remains outside cache and survives background failure with draft; clipboard awaited', async () => {
  apiKeysAPI.create.mockResolvedValue({ data: { ...metadata, name: 'new', plaintext_key: secret } }); setup(); await screen.findByText('fixture'); input('keys.name', 'new'); click('keys.generate'); await screen.findByText(secret);
  expect(JSON.stringify(client.getQueryCache().getAll().map(q => q.state.data))).not.toContain(secret);
  input('keys.name', 'retained'); apiKeysAPI.list.mockRejectedValue(new Error('offline')); click('recovery.refresh'); await screen.findByText(mockMessages['recovery.stale']); expect(screen.getByLabelText(mockMessages['keys.name'])).toHaveValue('retained'); expect(screen.getByText(secret)).toBeInTheDocument();
  let reject; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: jest.fn(() => new Promise((_, r) => { reject = r; })) } }); click('mfa.copy'); expect(screen.queryByText(mockMessages['mfa.copied'])).not.toBeInTheDocument(); await act(async () => reject(new Error('denied'))); await screen.findByText(mockMessages['mfa.copyFailed']);
});
test('ambiguous issuance locks replay without success or recovered secret', async () => {
  apiKeysAPI.create.mockResolvedValue({ data: {} }); setup(); await screen.findByText('fixture'); input('keys.name', 'draft'); click('keys.generate'); await screen.findByText(mockMessages['keys.unknownCreate']); click('keys.generate'); expect(apiKeysAPI.create).toHaveBeenCalledTimes(1); click('account.checkStatus'); await screen.findByText(mockMessages['keys.checked']); expect(screen.queryByText(mockMessages['account.saved'])).not.toBeInTheDocument(); expect(screen.getByLabelText(mockMessages['keys.name'])).toHaveValue('draft');
});
test('late issuance cannot affect replacement identity', async () => {
  let resolve; apiKeysAPI.create.mockImplementation(() => new Promise(r => { resolve = r; })); const view = setup(); await screen.findByText('fixture'); input('keys.name', 'fixture'); click('keys.generate'); mockUser = { ...mockUser, id: 2 }; view.rerender(<QueryClientProvider client={client}><APIKeysSection /></QueryClientProvider>); await act(async () => resolve({ data: { ...metadata, plaintext_key: secret } })); expect(screen.queryByText(secret)).not.toBeInTheDocument();
});
test('failed profile does not enable password form', async () => {
  profileAPI.get.mockRejectedValue(new Error('offline')); setup(PasswordSection); await screen.findByText(mockMessages['recovery.failed']); expect(screen.queryByLabelText(mockMessages['password.current'])).not.toBeInTheDocument();
});
test('malformed password outcome retains input, locks duplicate and offers no false reconciliation', async () => {
  profileAPI.changePassword.mockResolvedValue({ data: {} }); setup(PasswordSection); await screen.findByLabelText(mockMessages['password.current']); input('password.current', 'fixture-current'); input('password.new', 'fixture-new'); input('password.confirm', 'fixture-new'); click('password.submit'); await screen.findByText(mockMessages['password.unknown']); expect(screen.getByLabelText(mockMessages['password.new'])).toHaveValue('fixture-new'); click('password.submit'); expect(profileAPI.changePassword).toHaveBeenCalledTimes(1); expect(screen.queryByRole('button', { name: mockMessages['account.checkStatus'] })).not.toBeInTheDocument();
});
test('social profile disables password only', async () => {
  profileAPI.get.mockResolvedValue({ data: { id: 1, is_social: true } }); setup(PasswordSection); await screen.findByText(mockMessages['password.social']); expect(screen.queryByLabelText(mockMessages['password.current'])).not.toBeInTheDocument();
});
