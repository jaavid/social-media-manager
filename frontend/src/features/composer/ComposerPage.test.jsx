import { fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComposerPage from './ComposerPage';
import { composer } from '@/services/domains/composer';
import { connectionsAPI } from '@/services/domains/connections';
import { connectionFixture, connectionAccount } from '@/services/__fixtures__/connections';
import { setLanguage } from '@/i18n';
import { QK } from '@/services/queryClient';

const mockNavigate = jest.fn();
let mockId;
let mockUser;
let fixture;
const stored = { id: 900, client: 7, title: '', content: 'Keep this content', media_type: 'text', media_urls: [],
  target_platforms: ['contract_example'], platform_overrides: {}, status: 'draft', scheduled_at: null };
jest.mock('@/core/navigation', () => ({ useAppNavigate: () => mockNavigate, useAppSearchParams: () => [new URLSearchParams()], useAppParams: () => ({ id: mockId }), useAppLocation: () => ({ pathname: globalThis.window.location.pathname }) }));
jest.mock('@/core/session', () => ({ useSession: () => ({ user: mockUser }) }));
jest.mock('@/services/domains/composer', () => ({ composer: { get: jest.fn(), save: jest.fn(), command: jest.fn(), queues: jest.fn(), resolve: jest.fn(), upload: jest.fn() } }));
jest.mock('@/services/domains/connections', () => ({ connectionsAPI: { get: jest.fn() } }));
jest.mock('@/components/ai/AIWriteButton', () => () => null);
jest.mock('@/components/connections/composerExtensions', () => ({ composerExtensions: {} }));
function mount(existingClient) {
  const client = existingClient || new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><ComposerPage /></QueryClientProvider>);
  return { ...view, client };
}
async function compose() {
  const view = mount();
  await screen.findByRole('button', { name: 'Contract example', pressed: false });
  fireEvent.click(screen.getByRole('button', { name: 'Contract example', pressed: false }));
  fireEvent.click(screen.getByRole('checkbox', { name: /First account/ }));
  fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Keep this content' } });
  return view;
}
function command(label = 'Publish Now') { fireEvent.click(screen.getAllByRole('button', { name: label, exact: true })[0]); }
beforeEach(() => {
  globalThis.crypto.randomUUID = () => '11111111-1111-4111-8111-111111111111';
  globalThis.structuredClone = value => JSON.parse(JSON.stringify(value));
  jest.clearAllMocks(); window.sessionStorage.clear(); mockId = undefined; mockUser = { id: 1, workspace_id: 7 };
  window.history.replaceState({}, '', '/dashboard/analytics/composer'); setLanguage('en');
  fixture = connectionFixture(); fixture.providers[0].accounts = [connectionAccount(), connectionAccount(11)];
  connectionsAPI.get.mockImplementation(async () => fixture);
  composer.queues.mockResolvedValue([{ id: 11, client: 7, name: 'Evening', platforms: ['contract_example'], is_active: true }]);
  composer.save.mockResolvedValue({ post: stored }); composer.command.mockResolvedValue({ status: 'queued' }); composer.get.mockResolvedValue(stored);
});
test('the unmodified reference fixture publishes text with explicit account and no false delivered success', async () => {
  await compose(); command();
  await screen.findByText('Accepted into the queue. Publication is not confirmed.');
  expect(composer.save).toHaveBeenCalledWith(7, null, expect.objectContaining({ content: stored.content,
    platform_overrides: { contract_example: { account_targets: [{ social_account_id: 10, destination_id: 'destination-10' }] } } }), expect.any(String));
  expect(composer.command).toHaveBeenCalledWith(7, 900, 'publish_now', {});
  expect(screen.queryByText('Published.')).not.toBeInTheDocument();
});
test('removing capability removes the fixture publish surface', async () => {
  fixture.providers[0].capabilities.publish_text = 'not_available'; mount();
  await screen.findByText('No publish-capable providers available.');
  expect(screen.queryByRole('button', { name: 'Contract example' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
});
test('multiple accounts preserve both explicit destinations', async () => {
  await compose(); fireEvent.click(screen.getByRole('checkbox', { name: /Second account/ })); command();
  await waitFor(() => expect(composer.save).toHaveBeenCalled());
  expect(composer.save.mock.calls[0][2].platform_overrides.contract_example.account_targets).toHaveLength(2);
});
test('capability, media constraints and readiness block without deleting selections', async () => {
  fixture.providers[0].accounts[1].health = { ready: false, state: 'expired', code: '' };
  await compose(); fireEvent.click(screen.getByRole('checkbox', { name: /Second account/ }));
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: /Second account/ })).toBeChecked();
  fireEvent.click(screen.getByRole('checkbox', { name: /Second account/ }));
  fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'x'.repeat(101) } });
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Contract example', pressed: true })).toBeVisible();
});
test('save failure preserves input and safe manual retry reuses intent key', async () => {
  composer.save.mockRejectedValueOnce({ isAxiosError: true, response: { status: 503, data: {} }, message: 'outage' });
  await compose(); command('Save Draft'); await screen.findByRole('alert');
  expect(screen.getByLabelText('Content')).toHaveValue(stored.content);
  expect(screen.queryByText('Draft saved.')).not.toBeInTheDocument();
  const key = composer.save.mock.calls[0][3]; command('Save Draft');
  await waitFor(() => expect(composer.save).toHaveBeenCalledTimes(2));
  expect(composer.save.mock.calls[1][3]).toBe(key);
});
test('double submit is synchronously locked and controls stay pending until the result', async () => {
  let finish; composer.command.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await compose(); const publish = screen.getByRole('button', { name: 'Publish Now' }); fireEvent.click(publish); fireEvent.click(publish);
  await waitFor(() => expect(composer.command).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Content')).toBeDisabled();
  expect(screen.queryByText('Published.')).not.toBeInTheDocument();
  await act(async () => finish({ status: 'pending_approval' }));
  await screen.findByText('Submitted for approval.');
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
});
test('timeout is ambiguous and cannot automatically or manually replay publication', async () => {
  composer.command.mockRejectedValue({ isAxiosError: true, message: 'timeout' });
  await compose(); command(); await screen.findByRole('alert');
  expect(screen.getByLabelText('Content')).toHaveValue(stored.content);
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(composer.command).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('checkbox', { name: /First account/ })).toBeChecked();
});
test('rate limit remains a distinguishable error and preserves selections', async () => {
  composer.command.mockRejectedValue({ isAxiosError: true, response: { status: 429, data: {}, headers: { 'retry-after': '60' } } });
  await compose(); command(); await screen.findByText('Rate limit reached. Wait before trying again.');
  expect(screen.getByRole('checkbox', { name: /First account/ })).toBeChecked(); expect(composer.command).toHaveBeenCalledTimes(1);
});
test('fixture without scheduling never schedules; switching modes preserves text', async () => {
  await compose(); command('Schedule');
  expect(screen.getAllByRole('button', { name: 'Schedule' })[0]).toBeDisabled();
  expect(screen.getByLabelText('Content')).toHaveValue(stored.content);
  expect(composer.command).not.toHaveBeenCalled();
});
test('queue failure stays in the editor and safe retry reuses the saved draft', async () => {
  fixture.providers[0].capabilities.scheduling = 'supported';
  composer.command.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'invalid_request' } } });
  await compose(); command('Add to Queue'); fireEvent.change(screen.getByLabelText('Destination queue'), { target: { value: '11' } });
  command('Add to Queue'); await screen.findByRole('alert');
  expect(screen.getByLabelText('Content')).toHaveValue(stored.content); expect(screen.getByLabelText('Destination queue')).toHaveValue('11');
  command('Add to Queue'); await waitFor(() => expect(composer.command).toHaveBeenCalledTimes(2));
  expect(composer.save.mock.calls[1][1]).toBe(900);
  expect(composer.command).toHaveBeenLastCalledWith(7, 900, 'add_to_queue', { queue_id: 11 });
});
test('background refresh does not overwrite an edited draft', async () => {
  mockId = '900'; const view = mount(); await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue(stored.content));
  fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'local edit' } });
  act(() => view.client.setQueryData(['composer.post', 7, '900'], { ...stored, content: 'stale server' }));
  expect(screen.getByLabelText('Content')).toHaveValue('local edit');
});
test('recovery is private to workspace and account identity', async () => {
  const view = await compose(); view.unmount(); const restored = mount(); await screen.findByLabelText('Content');
  expect(screen.getByLabelText('Content')).toHaveValue(stored.content); restored.unmount();
  mockUser = { id: 2, workspace_id: 8 }; fixture = connectionFixture(8); mount();
  expect(screen.getByLabelText('Content')).toHaveValue('');
});
test('multiple providers keep incompatible targets selected until explicit content correction', async () => {
  const second = structuredClone(fixture.providers[0]);
  second.key = 'another_provider'; second.titles.en = 'Another provider';
  second.accounts = [{ ...connectionAccount(20), name: 'Another account' }];
  second.contract.publishing_modes.text.constraints.max_characters = 5;
  fixture.providers.push(second);
  await compose(); fireEvent.click(screen.getByRole('button', { name: 'Another provider', pressed: false }));
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Another provider', pressed: true })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Contract example', pressed: true })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'short' } }); command();
  await waitFor(() => expect(composer.save).toHaveBeenCalled());
  expect(composer.save.mock.calls[0][2].target_platforms).toEqual(['contract_example', 'another_provider']);
});
test('known missing provider scopes disable the selected operation despite connected health', async () => {
  fixture.providers[0].accounts[0].publishing_readiness = { text: false };
  await compose(); expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: /First account/ })).toBeChecked();
});
test('a persisted ambiguous delivery cannot enable publication on reopening the post', async () => {
  mockId = '900'; composer.get.mockResolvedValue({ ...stored, status: 'failed', publish_logs: [{ platform: 'contract_example', social_account: 10, status: 'failed', error_code: 'timeout' }] });
  mount(); await screen.findByText(/The outcome is unknown/);
  expect(screen.queryByText('Publication failed.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
});
test('a forbidden refresh hides cached account identities and editor data', async () => {
  const view = await compose();
  connectionsAPI.get.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: { code: 'permission_denied' } } });
  await act(async () => view.client.invalidateQueries({ queryKey: ['connections', 7] }));
  await screen.findByText('You do not have permission for this account or operation.');
  expect(screen.queryByLabelText('Content')).not.toBeInTheDocument();
  expect(screen.queryByText(/First account/)).not.toBeInTheDocument();
});
test('provider rejection and invalid request remain distinguishable', async () => {
  composer.command.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'invalid_request' } } });
  await compose(); command(); await screen.findByText('Review content, media and destinations; the request is invalid.');
  composer.command.mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: { code: 'provider_error' } } });
  command(); await screen.findByText('The provider rejected the request. Review account and content before retrying.');
});
test('an incomplete text draft may be saved but publication is disabled', async () => {
  await compose(); fireEvent.change(screen.getByLabelText('Content'), { target: { value: '   ' } });
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save Draft' })).toBeEnabled();
  expect(composer.command).not.toHaveBeenCalled();
});

test('a gateway 503 body cannot disguise an uncertain command as definite failure', async () => {
  composer.command.mockRejectedValue({ isAxiosError: true, response: { status: 503, data: { code: 'unavailable' } } });
  await compose(); command(); await screen.findByText(/The outcome is unknown/);
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(composer.command).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Content')).toHaveValue(stored.content);
});
test('stored provider content and mode control validation and remain editable without replacing the common payload', async () => {
  mockId = '900'; composer.get.mockResolvedValue({ ...stored, content: 'x'.repeat(101), platform_overrides: { contract_example: { social_account_id: 10, content: 'Provider content', media_type: 'text' } } });
  mount(); const input = await screen.findByLabelText('Contract example · Content');
  expect(input).toHaveValue('Provider content');
  expect(screen.getByRole('button', { name: 'Publish Now' })).toBeEnabled();
  fireEvent.change(input, { target: { value: 'Edited provider content' } }); command();
  await waitFor(() => expect(composer.save).toHaveBeenCalled());
  expect(composer.save.mock.calls[0][2]).toEqual(expect.objectContaining({ content: 'x'.repeat(101), platform_overrides: { contract_example: { social_account_id: 10, content: 'Edited provider content', media_type: 'text' } } }));
});


test.each([403,404])('queue denial %s hides old metadata while preserving the independent editor', async status => {
  const { client } = await compose();
  fireEvent.click(screen.getByRole('button', { name: 'Add to Queue', exact: true }));
  expect(screen.getByRole('option', { name: 'Evening' })).toBeInTheDocument();
  composer.queues.mockRejectedValue({ isAxiosError:true, response: { status } });
  await act(async () => { await client.refetchQueries({ queryKey: ['composer.queues',7] }); });
  await waitFor(() => expect(screen.queryByRole('option', { name: 'Evening' })).not.toBeInTheDocument());
  expect(screen.getByLabelText('Content')).toHaveValue('Keep this content');
  expect(screen.getByLabelText('Destination queue')).toBeDisabled();
  expect(composer.command).not.toHaveBeenCalled();
});
test('same-user role/type changes exclude the previous draft context', async () => {
  const { rerender, client } = await compose();
  mockUser = { ...mockUser, role:'staff', account_type:'agency_member' };
  rerender(<QueryClientProvider client={client}><ComposerPage /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue(''));
  expect(composer.save).not.toHaveBeenCalled();
});

test('an existing post route cannot flash a new empty draft while dynamic parameters hydrate', async () => {
  window.history.replaceState({}, '', '/admin/analytics/composer/900');
  let resolve; composer.get.mockReturnValue(new Promise(done => { resolve = done; }));
  mount();
  expect(screen.queryByLabelText('Content')).not.toBeInTheDocument();
  await waitFor(() => expect(composer.get).toHaveBeenCalledWith(7, '900', expect.any(AbortSignal)));
  await act(async () => resolve(stored));
  await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue(stored.content));
  expect(composer.save).not.toHaveBeenCalled();
});

test('404 after an existing post read hides the snapshot and a valid retry restores the local draft', async () => {
  mockId = '900'; const { client } = mount();
  await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue(stored.content));
  fireEvent.change(screen.getByLabelText('Content'), { target: { value:'Synthetic edited draft' } });
  composer.get.mockRejectedValue({ isAxiosError:true, response:{status:404} });
  await act(async () => client.refetchQueries({queryKey:['composer.post',7,'900']}));
  await waitFor(() => expect(screen.queryByLabelText('Content')).not.toBeInTheDocument());
  expect(screen.getByText('This resource is no longer available. Use navigation to choose another resource.')).toBeInTheDocument();
  composer.get.mockResolvedValue(stored);fireEvent.click(screen.getByRole('button',{name:'Try again',exact:true}));
  await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue('Synthetic edited draft'));
  expect(composer.save).not.toHaveBeenCalled();
});

test('initial post hydration never persists an empty recovery draft and later edits survive remount', async () => {
  mockId = '900';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(QK.connections(7), fixture);
  client.setQueryData(['composer.post', 7, '900'], stored);
  const writes = jest.spyOn(Storage.prototype, 'setItem');
  try {
    const view = mount(client);
    await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue(stored.content));
    expect(writes.mock.calls.filter(([key]) => key.startsWith('composer-draft:'))).toEqual([]);
    fireEvent.change(screen.getByLabelText('Content'), { target: { value: 'Synthetic unsaved edit' } });
    await waitFor(() => expect(writes.mock.calls.some(([key, value]) => key.startsWith('composer-draft:') && JSON.parse(value).content === 'Synthetic unsaved edit')).toBe(true));
    view.unmount();
    mount();
    await waitFor(() => expect(screen.getByLabelText('Content')).toHaveValue('Synthetic unsaved edit'));
    expect(composer.save).not.toHaveBeenCalled();
  } finally { writes.mockRestore(); }
});

// Off-diff #96 review: active native editor already preserves the chosen mode.
test('uploading two media items preserves an explicitly chosen album editor mode', async () => {
  const provider = fixture.providers[0];
  provider.capabilities.publish_image = 'supported';
  provider.contract.publishing_modes.album = {
    capability: 'publish_image', ui_extension: '',
    constraints: { ...provider.contract.publishing_modes.text.constraints, status: 'supported', media_types: ['image', 'video'], min_items: 2, max_items: 10 },
  };
  composer.upload.mockImplementation(async (_workspace, file) => ({ id: file.name === 'first.png' ? 21 : 22, client: 7, mime_type: 'image/png', file_url: `https://example.test/${file.name}` }));
  await compose();
  const mode = screen.getByLabelText('Content mode');
  fireEvent.change(mode, { target: { value: 'album' } });
  fireEvent.change(screen.getByLabelText('Upload'), { target: { files: [new File(['public fixture'], 'first.png', { type: 'image/png' }), new File(['public fixture'], 'second.png', { type: 'image/png' })] } });
  await waitFor(() => expect(composer.upload).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByLabelText('Upload')).toBeEnabled());
  expect(mode).toHaveValue('album');
});
