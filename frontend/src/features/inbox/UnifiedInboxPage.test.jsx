import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UnifiedInboxPage from './UnifiedInboxPage';
import { inboxAPI } from '../../services/api';
import { setLanguage } from '../../i18n';

const conversations = [
  { id: 1, contact_name: 'Bob', platform: 'facebook', type: 'dm', messages: [] },
  { id: 2, contact_name: 'Alice', platform: 'facebook', type: 'dm', messages: [] },
];
jest.mock('../../hooks/useInbox', () => ({
  ...jest.requireActual('../../hooks/useInbox'),
  useConversations: () => ({ data: conversations, refetch: jest.fn(), loading: false }),
}));
jest.mock('../../core/session', () => ({ useSession: () => ({ user: { client_id: 7 } }) }));
jest.mock('../../services/api', () => ({ inboxAPI: { conversations: { get: jest.fn(), reply: jest.fn() } } }));
jest.mock('../../components/TelegramSuggestions', () => () => null);
jest.mock('../../components/ai/AIReplySuggestions', () => () => null);
jest.mock('../../components/ui/toast', () => ({ success: jest.fn(), error: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, '', '/admin/analytics/inbox');
  setLanguage('en');
  inboxAPI.conversations.get.mockImplementation(async id => ({ data: conversations.find(item => item.id === id) }));
});

test('switching recipients clears unsent replies and returning starts a fresh reply', async () => {
  render(<UnifiedInboxPage />);
  const reply = await screen.findByPlaceholderText('Type a reply… (⌘↵ to send)');
  fireEvent.change(reply, { target: { value: 'Private reply for Bob' } });
  fireEvent.click(screen.getByRole('button', { name: /Alice/ }));
  await waitFor(() => expect(screen.getByPlaceholderText('Type a reply… (⌘↵ to send)')).toHaveValue(''));
  expect(screen.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Bob/ }));
  await waitFor(() => expect(screen.getByPlaceholderText('Type a reply… (⌘↵ to send)')).toHaveValue(''));
  expect(inboxAPI.conversations.reply).not.toHaveBeenCalled();
});

test('a late send for Bob cannot erase the reply currently being written to Alice', async () => {
  let complete;
  inboxAPI.conversations.reply.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  render(<UnifiedInboxPage />);
  fireEvent.change(await screen.findByPlaceholderText('Type a reply… (⌘↵ to send)'), { target: { value: 'For Bob' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send', exact: true }));
  expect(inboxAPI.conversations.reply).toHaveBeenCalledWith(1, 'For Bob');
  fireEvent.click(screen.getByRole('button', { name: /Alice/ }));
  const reply = await screen.findByPlaceholderText('Type a reply… (⌘↵ to send)');
  fireEvent.change(reply, { target: { value: 'For Alice' } });
  await act(async () => complete({ data: {} }));
  expect(reply).toHaveValue('For Alice');
  expect(inboxAPI.conversations.get).toHaveBeenCalledTimes(2);
});
