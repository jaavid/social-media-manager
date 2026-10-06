import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UnifiedInboxPage from './UnifiedInboxPage';
import { connectionsAPI } from '@/services/domains/connections';
import { inboxAPI } from '@/services/domains/messaging';
import { connectionFixture } from '@/services/__fixtures__/connections';
import { setLanguage } from '@/i18n';

jest.mock('@/core/session', () => ({ useSession: () => ({ user: { id: 1, client_id: 7 } }) }));
jest.mock('@/services/domains/connections', () => ({ connectionsAPI: { get: jest.fn() } }));
jest.mock('@/services/domains/messaging', () => ({ inboxAPI: { conversations: { list: jest.fn(), get: jest.fn(), reply: jest.fn() }, reviews: { list: jest.fn() } } }));
jest.mock('@/components/ai/AIReplySuggestions', () => () => null);
const rows = [{ id: 1, contact_name: 'Bob', platform: 'contract_example', type: 'dm', messages: [], client: 7 },
  { id: 2, contact_name: 'Alice', platform: 'contract_example', type: 'dm', messages: [], client: 7 }];
let wire;
function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><UnifiedInboxPage /></QueryClientProvider>);
}
async function selectAccount() {
  await screen.findByRole('option', { name: /First account/ });
  fireEvent.change(screen.getByRole('combobox', { name: 'Account / destination' }), { target: { value: '10' } });
}
beforeEach(() => {
  jest.clearAllMocks(); window.history.replaceState({}, '', '/dashboard/analytics/inbox'); setLanguage('en'); wire = connectionFixture();
  wire.providers[0].capabilities.inbox = 'supported';
  connectionsAPI.get.mockImplementation(async () => wire);
  inboxAPI.conversations.list.mockResolvedValue({ data: rows });
  inboxAPI.conversations.get.mockImplementation(async id => ({ data: rows.find(r => r.id === id) }));
});
test('generic fixture renders without a feature registry; unsupported fixture exposes no reply', async () => {
  wire.providers[0].capabilities.inbox = 'not_available';
  renderInbox();
  await screen.findByText('No accounts support this capability.');
  expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  expect(inboxAPI.conversations.list).not.toHaveBeenCalled();
});
test('late send for Bob cannot clear the reply for Alice; failure preserves input', async () => {
  let complete;
  inboxAPI.conversations.reply.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  renderInbox(); await selectAccount();
  fireEvent.click(await screen.findByRole('button', { name: /Bob/ }));
  fireEvent.change(await screen.findByLabelText('Reply'), { target: { value: 'For Bob' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: /Alice/ }));
  const reply = await screen.findByLabelText('Reply');
  fireEvent.change(reply, { target: { value: 'For Alice' } });
  await act(async () => complete({ status: 201, data: { id: 99 } }));
  expect(reply).toHaveValue('For Alice');
  inboxAPI.conversations.reply.mockRejectedValue({ isAxiosError: true, response: { status: 429 } });
  fireEvent.click(screen.getByRole('button', { name: 'Send', exact: true }));
  await screen.findByRole('alert');
  expect(reply).toHaveValue('For Alice');
});
test('malformed initial response is error; background failure retains rows; denied refresh hides private rows', async () => {
  inboxAPI.conversations.list.mockResolvedValueOnce({ data: {} });
  renderInbox(); await selectAccount(); await screen.findByRole('alert');
  expect(screen.queryByText('No conversations yet.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('button', { name: /Bob/ });
  inboxAPI.conversations.list.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503 } });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await screen.findByText('Previous results are retained and may be stale.');
  expect(screen.getByRole('button', { name: /Bob/ })).toBeInTheDocument();
  inboxAPI.conversations.list.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403 } });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: /Bob/ })).not.toBeInTheDocument());
});
