import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConnectedAccounts from './ConnectedAccounts';
import { connectionsAPI } from '@/services/domains/connections';
import { connectionFixture } from '@/services/__fixtures__/connections';

jest.mock('@/components/ApiConnectivityPanel', () => () => null);
jest.mock('@/services/domains/connections', () => ({ connectionsAPI: { get: jest.fn(), connect: jest.fn(), disconnect: jest.fn() } }));
function renderConnections(id = 7) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><ConnectedAccounts clientId={id} /></QueryClientProvider>);
  return { ...view, client, switchTo: id => view.rerender(<QueryClientProvider client={client}><ConnectedAccounts clientId={id} /></QueryClientProvider>) };
}
beforeEach(() => { jest.clearAllMocks(); document.documentElement.lang = 'en'; connectionsAPI.get.mockResolvedValue(connectionFixture()); });
test('reference provider renders metadata, separate account/destination and account health without a source edit', async () => {
  renderConnections();
  expect(await screen.findByText('Contract example')).toBeInTheDocument();
  expect(screen.getByText('Experimental provider')).toBeInTheDocument();
  expect(screen.getByText(/identity-10/)).toBeInTheDocument();
  expect(screen.getByText(/profile · destination-10/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } });
  expect(screen.getByText('Expired or expiring soon · reconnect required')).toBeInTheDocument();
  expect(screen.getByText('Last sync failed')).toBeInTheDocument();
  expect(screen.queryByText(/identity-10/)).not.toBeInTheDocument();
});
test('initial error offers retry, never empty, while background failure keeps existing identity', async () => {
  connectionsAPI.get.mockRejectedValueOnce(new Error('network'));
  renderConnections();
  expect(await screen.findByRole('alert')).toHaveTextContent('Connections could not be loaded.');
  expect(screen.queryByText('No connected accounts yet.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Try again'));
  await screen.findByText('Contract example');
  connectionsAPI.get.mockRejectedValueOnce(new Error('background'));
  fireEvent.click(screen.getByText('Refresh connections'));
  expect(await screen.findByText('Refresh failed. Showing previously loaded connections.')).toBeInTheDocument();
  expect(screen.getByText(/identity-10/)).toBeInTheDocument();
});
test('workspace switch discards late results and cancels old observer', async () => {
  let finish;
  let signal;
  connectionsAPI.get.mockImplementationOnce((_, s) => { signal = s; return new Promise(resolve => { finish = resolve; }); });
  const view = renderConnections();
  await waitFor(() => expect(connectionsAPI.get).toHaveBeenCalled());
  const next = connectionFixture(8); next.providers[0].titles.en = 'New workspace provider';
  connectionsAPI.get.mockResolvedValueOnce(next);
  view.switchTo(8);
  expect(await screen.findByText('New workspace provider')).toBeInTheDocument();
  await act(async () => finish(connectionFixture()));
  expect(signal.aborted).toBe(true);
  expect(screen.queryByText('Contract example')).not.toBeInTheDocument();
});
test('generic custom auth preserves input on failure and does not replay a write', async () => {
  renderConnections(); await screen.findByText('Contract example');
  fireEvent.click(screen.getByText('Reconnect'));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Test credential'), { target: { value: 'test-private' } });
  fireEvent.change(within(dialog).getByLabelText('Destination ID'), { target: { value: 'destination-10' } });
  connectionsAPI.connect.mockRejectedValueOnce(new Error('503'));
  fireEvent.click(within(dialog).getByText('Verify and connect'));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Your input is preserved');
  expect(within(dialog).getByLabelText('Test credential')).toHaveValue('test-private');
  expect(connectionsAPI.connect).toHaveBeenCalledTimes(1);
  expect(connectionsAPI.connect).toHaveBeenCalledWith(7, 'contract_example', { token: 'test-private', destination_id: 'destination-10' }, 10);
});
test('permissions and unavailable capabilities remove actions without inventing healthy state', async () => {
  const data = connectionFixture(); const p = data.providers[0];
  p.permissions.connect = false; p.accounts[0].permissions = { reconnect: false, disconnect: false };
  p.accounts[0].health = { ready: false, state: 'unknown', code: '' };
  p.accounts[0].sync.state = 'stale';
  connectionsAPI.get.mockResolvedValueOnce(data);
  renderConnections(); await screen.findByText('Connection health unknown');
  expect(screen.getByText('Sync stale')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Reconnect' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add account' })).not.toBeInTheDocument();
});
test('planned connection capability and missing OAuth/custom implementations never offer a connection action', async () => {
  const data = connectionFixture(); const p = data.providers[0];
  p.capabilities.connection = 'planned'; p.accounts = [];
  connectionsAPI.get.mockResolvedValueOnce(data);
  renderConnections(); await screen.findByText('Connection capability: Planned');
  expect(screen.queryByRole('button', { name: 'Add account' })).not.toBeInTheDocument();
});
