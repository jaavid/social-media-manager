import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DiscordConnection, RedditConnection } from './CommunityConnection';
import { connectionsAPI } from '@/services/domains/connections';
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => key, tr: value => value }) }));
jest.mock('@/services/domains/connections', () => ({ connectionsAPI: { syncInbox: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

test.each([['discord', DiscordConnection], ['reddit', RedditConnection]])('queues %s only for the selected workspace/account', async (provider, Component) => {
  connectionsAPI.syncInbox.mockResolvedValue(undefined);
  render(<Component workspaceId={7} accountId={12} permissions={{ view_inbox: true }} />);
  fireEvent.click(screen.getByRole('button', { name: 'community.sync' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('community.queued'));
  expect(connectionsAPI.syncInbox).toHaveBeenCalledWith(7, provider, 12);
});

test('a queue failure is not presented as a completed synchronization', async () => {
  connectionsAPI.syncInbox.mockRejectedValue(new Error('failure'));
  render(<DiscordConnection workspaceId={7} accountId={12} permissions={{ view_inbox: true }} />);
  fireEvent.click(screen.getByRole('button', { name: 'community.sync' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('community.failed'));
  expect(screen.queryByText('community.queued')).not.toBeInTheDocument();
});


test('Inbox sync is hidden when the account permission is absent', () => {
  render(<DiscordConnection workspaceId={7} accountId={12} permissions={{ view_inbox: false }} />);
  expect(screen.queryByRole('button', { name: 'community.sync' })).toBeNull();
  expect(connectionsAPI.syncInbox).not.toHaveBeenCalled();
});
