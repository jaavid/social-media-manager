import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TelegramSettings from './TelegramSettings';
import { api } from '@/services/http/client';
jest.mock('../i18n', () => ({ useLanguage: () => ({ tr: value => value, t: key => key }) }));
jest.mock('@/services/http/client', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
const original = { destination_context: {}, assistant_enabled: false, rich_enabled: false, assistant_rich: false, webhook_enabled: false, last_update_at: null };
let client;
const setup = () => { client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); return render(<QueryClientProvider client={client}><TelegramSettings workspaceId={7} accountId={10} /></QueryClientProvider>); };
beforeEach(() => { jest.resetAllMocks(); api.get.mockResolvedValue({ data: original }); api.post.mockResolvedValue({ status: 200, data: { ...original, rich_enabled: true } }); });
afterEach(() => client?.clear());
test('ordinary toggles do not revalidate unchanged default destination with the provider', async () => {
  setup(); fireEvent.click(await screen.findByLabelText('Enable Rich Messages'));
  fireEvent.click(screen.getByRole('button', { name: 'Save Telegram settings' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/telegram-accounts/10/settings/', { assistant_enabled: false, rich_enabled: true, assistant_rich: false }));
});
test('context is sent on an actual change and omitted after reverting to the default', async () => {
  setup(); const destination = await screen.findByLabelText('Destination');
  fireEvent.change(destination, { target: { value: 'forum_supergroup' } });
  api.post.mockResolvedValue({ status: 200, data: { ...original, destination_context: { destination_type: 'forum_supergroup' } } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Telegram settings' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/telegram-accounts/10/settings/', expect.objectContaining({ destination_context: { destination_type: 'forum_supergroup' } })));
});
test('changing and reverting before save does not send a destination mutation', async () => {
  setup(); const destination = await screen.findByLabelText('Destination');
  fireEvent.change(destination, { target: { value: 'forum_supergroup' } });
  fireEvent.change(destination, { target: { value: 'channel' } });
  api.post.mockResolvedValue({ status: 200, data: original });
  fireEvent.click(screen.getByRole('button', { name: 'Save Telegram settings' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/telegram-accounts/10/settings/', { assistant_enabled: false, rich_enabled: false, assistant_rich: false }));
});
test('malformed write acknowledgment cannot show Saved or replay', async () => {
  setup(); await screen.findByLabelText('Destination'); api.post.mockResolvedValue({ status: 200, data: {} });
  fireEvent.click(screen.getByRole('button', { name: 'Save Telegram settings' }));
  await screen.findByText('connections.unknownMutation');
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Telegram settings' }));
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('workspace switch clears an unsaved draft and ignores a late old read', async () => {
  let finish;
  const old = new Promise(resolve => { finish = resolve; });
  api.get.mockImplementationOnce(() => old).mockResolvedValueOnce({ data: original });
  const view = setup();
  view.rerender(<QueryClientProvider client={client}><TelegramSettings workspaceId={8} accountId={11} /></QueryClientProvider>);
  await screen.findByLabelText('Destination');
  await act(async () => finish({data:{...original, destination_context:{destination_type:'private_forum'}}}));
  expect(screen.getByLabelText('Destination')).toHaveValue('channel');
  fireEvent.click(screen.getByRole('button', {name:'Save Telegram settings'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/telegram-accounts/11/settings/', expect.any(Object)));
  expect(api.post).toHaveBeenCalledTimes(1);
});


test('managed project bots do not offer account-level webhook registration', async () => {
  api.get.mockResolvedValue({ data: { ...original, webhook_managed: true } });
  setup();
  await screen.findByText('botConnect.centralWebhook');
  expect(screen.queryByRole('button', { name: 'Configure secure webhook' })).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
