import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccountWatchlist from './AccountWatchlist';
import { calendarAPI } from '@/services/domains/publishing';

jest.mock('@/services/domains/publishing', () => ({ calendarAPI: {
  getSources: jest.fn(), addSource: jest.fn(), removeSource: jest.fn(), syncSource: jest.fn(),
} }));
jest.mock('@/services/domains/connections', () => ({ connectionsAPI: { oauthPath: jest.fn() } }));
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => key, tr: value => value, formatDate: value => value }) }));
function setup(props = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AccountWatchlist workspaceId={7} canAdd {...props} /></QueryClientProvider>);
}
beforeEach(() => { jest.clearAllMocks(); calendarAPI.getSources.mockResolvedValue({ data: [] }); });
test('shows an empty provider result without claiming that content is up to date', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 1, username: 'example', is_active: true,
    sync_status: 'error', error_code: 'brightdata_empty_result', permissions: {} }] });
  setup();
  expect(await screen.findByText('watchlist.emptyResult')).toHaveAttribute('role', 'status');
  expect(screen.queryByText('watchlist.status.ok')).not.toBeInTheDocument();
});
test('adding a public profile enrolls it without any ownership claim', async () => {
  setup();
  fireEvent.change(screen.getByLabelText('watchlist.username'), { target: { value: '@example' } });
  fireEvent.click(screen.getByRole('button', { name: 'watchlist.add' }));
  await waitFor(() => expect(calendarAPI.addSource).toHaveBeenCalledWith({ client: 7, platform: 'instagram', username: '@example' }));
});
test('read-only viewers see collection state but cannot collect or verify management', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 1, social_account: 3, username: 'example', is_active: true,
    sync_status: 'error', publishing_ready: false, permissions: {} }] });
  setup({ canAdd: false, canVerify: true });
  expect(await screen.findByText('@example')).toBeInTheDocument();
  expect(screen.getByText('watchlist.status.error')).toBeInTheDocument();
  expect(screen.getByText('watchlist.readOnly')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'watchlist.verify' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'watchlist.refresh' })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('watchlist.username')).not.toBeInTheDocument();
});
test('pausing a monitor calls the source endpoint without disconnecting credentials', async () => {
  calendarAPI.getSources.mockResolvedValue({ data: [{ id: 1, social_account: 3, username: 'example', is_active: true,
    sync_status: 'ok', publishing_ready: true, permissions: { disconnect_platforms: true, schedule_posts: true } }] });
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'watchlist.pause' }));
  await waitFor(() => expect(calendarAPI.removeSource).toHaveBeenCalledWith(1));
  expect(screen.getByRole('link', { name: 'watchlist.compose' })).toHaveAttribute('href', '/dashboard/composer?workspace=7&account=3');
});
