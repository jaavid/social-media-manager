import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EndUserDashboard from './EndUserDashboard';
import { endUserAPI } from '@/services/domains/identity';

let mockSession;
let mockWorkspace;
jest.mock('@/core/session', () => ({ useSession: () => mockSession }));
jest.mock('@/hooks/useWorkspaceScope', () => ({
  __esModule: true,
  default: () => ({ workspaceId: mockWorkspace, key: JSON.stringify([mockSession.status, mockSession.user?.id, mockWorkspace]) }),
  normalizeWorkspaceId: value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null,
}));
jest.mock('@/core/navigation', () => ({ AppLink: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }));
jest.mock('@/services/domains/identity', () => ({ endUserAPI: { me: jest.fn() } }));
const workspace = { id: 10, company: 'Current brand' };
const response = (space = workspace, relations = { active: 0, pending: 2 }, id = 1) => ({ data: { user: { id }, workspace: space, relations } });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
let client;
let view;
const tree = () => <QueryClientProvider client={client}><EndUserDashboard /></QueryClientProvider>;
beforeEach(() => {
  jest.clearAllMocks();
  document.documentElement.lang = 'en';
  mockSession = { status: 'authenticated', user: { id: 1, workspace_id: 10, permissions: {} } };
  mockWorkspace = 10;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { view?.unmount(); client.clear(); });
const mount = () => { view = render(tree()); };

test('loading has no zero, empty-workspace guidance or workspace actions', async () => {
  const pending = deferred(); endUserAPI.me.mockReturnValue(pending.promise); mount();
  expect(screen.getByRole('status')).toHaveTextContent('Checking your workspace');
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  await act(async () => pending.resolve(response()));
});

test.each([401, 403, 404, 429, 503])('read failure %i stays an error and explicit retry reads only', async status => {
  endUserAPI.me.mockRejectedValueOnce({ isAxiosError: true, response: { status, headers: {}, data: { detail: 'private backend detail' } } });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be');
  expect(screen.queryByText(/No workspace is set up/)).not.toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.queryByText('private backend detail')).not.toBeInTheDocument();
  expect(endUserAPI.me).toHaveBeenCalledTimes(1);
  endUserAPI.me.mockResolvedValueOnce(response());
  fireEvent.click(screen.getByRole('button', { name: 'Reload status' }));
  expect(await screen.findByText('Current brand')).toBeInTheDocument();
  expect(endUserAPI.me).toHaveBeenCalledTimes(2);
  expect(endUserAPI.me.mock.calls.every(([signal]) => signal instanceof AbortSignal)).toBe(true);
});

test('successful empty response offers creation, invitation and existing-membership guidance', async () => {
  mockWorkspace = null; mockSession.user.workspace_id = null;
  endUserAPI.me.mockResolvedValue(response(null)); mount();
  expect(await screen.findByText('No workspace is set up for this account yet')).toBeInTheDocument();
  expect(screen.getByText(/review and accept a team invitation/)).toBeInTheDocument();
  expect(screen.getByRole('link')).toHaveAttribute('href', '/u/organizations');
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

test('workspace summary shows valid relationship zero, unknown statistics and scoped read destination', async () => {
  endUserAPI.me.mockResolvedValue(response()); mount();
  expect(await screen.findByText('Current brand')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('Statistics are not available in this dashboard')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View social connections' })).toHaveAttribute('href', '/u/connections?workspace=10');
  expect(screen.queryByText('—')).not.toBeInTheDocument();
});

test.each([undefined, { active: -1, pending: 0 }, { active: 0 }, { active: '0', pending: 2 }])('missing/invalid relationships do not become zero: %j', async relations => {
  const data = response(); data.data.relations = relations;
  endUserAPI.me.mockResolvedValue(data); mount();
  expect(await screen.findByText('Agency relationship counts are unavailable')).toBeInTheDocument();
  expect(screen.queryByText('0')).not.toBeInTheDocument();
});

test.each([{}, { user: { id: 2 }, workspace }, { user: { id: 1 } }, { user: { id: 1 }, workspace: [] }])('invalid response is not a successful empty state: %j', data => {
  endUserAPI.me.mockResolvedValue({ data }); mount();
  return screen.findByRole('alert');
});

test('workspace and identity changes abort pending reads and ignore late answers', async () => {
  const old = deferred(); const next = deferred();
  endUserAPI.me.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise); mount();
  await waitFor(() => expect(endUserAPI.me).toHaveBeenCalledTimes(1));
  const signal = endUserAPI.me.mock.calls[0][0];
  mockWorkspace = 20; mockSession = { ...mockSession, user: { ...mockSession.user, id: 2, workspace_id: 20 } };
  view.rerender(tree()); expect(signal.aborted).toBe(true);
  await act(async () => old.resolve(response()));
  expect(screen.queryByText('Current brand')).not.toBeInTheDocument();
  await act(async () => next.resolve(response({ id: 20, company: 'New brand' }, { active: 3, pending: 0 }, 2)));
  expect(await screen.findByText('New brand')).toBeInTheDocument();
  mockWorkspace = 30; endUserAPI.me.mockResolvedValue(response({ id: 20, company: 'New brand' }, undefined, 2));
  view.rerender(tree());
  expect(screen.queryByText('New brand')).not.toBeInTheDocument();
  expect(await screen.findByText('This workspace summary is unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'View social connections' })).not.toBeInTheDocument();
});

test('denied refresh removes private data and retry restores focus on success', async () => {
  endUserAPI.me.mockResolvedValueOnce(response()); mount(); await screen.findByText('Current brand');
  endUserAPI.me.mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, headers: {} } });
  await act(async () => client.invalidateQueries({ queryKey: ['end-user.dashboard'] }));
  await screen.findByRole('alert'); expect(screen.queryByText('Current brand')).not.toBeInTheDocument();
  endUserAPI.me.mockResolvedValueOnce(response()); fireEvent.click(screen.getByRole('button', { name: 'Reload status' }));
  await screen.findByText('Current brand'); await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
});

test('recoverable refresh failure retains same-scope data with an explicit stale notice', async () => {
  endUserAPI.me.mockResolvedValueOnce(response()); mount(); await screen.findByText('Current brand');
  endUserAPI.me.mockRejectedValueOnce(new Error('network unavailable'));
  await act(async () => client.invalidateQueries({ queryKey: ['end-user.dashboard'] }));
  expect(await screen.findByText('Status could not be updated')).toBeInTheDocument();
  expect(screen.getByText('Current brand')).toBeInTheDocument();
  expect(screen.getByText(/It may be out of date/)).toBeInTheDocument();
});

test('transition and permission changes immediately hide the previous snapshot', async () => {
  endUserAPI.me.mockResolvedValueOnce(response()); mount(); await screen.findByText('Current brand');
  mockSession = { ...mockSession, transitioning: true }; view.rerender(tree());
  expect(screen.queryByText('Current brand')).not.toBeInTheDocument();
  const pending = deferred(); endUserAPI.me.mockReturnValue(pending.promise);
  mockSession = { ...mockSession, transitioning: false, user: { ...mockSession.user, permissions: { 'posts.read': true } } };
  view.rerender(tree()); expect(screen.queryByText('Current brand')).not.toBeInTheDocument();
  await act(async () => pending.resolve(response()));
  expect(await screen.findByText('Current brand')).toBeInTheDocument();
});

test('refresh failure after successful empty never silently keeps the empty guidance', async () => {
  mockWorkspace = null; mockSession.user.workspace_id = null;
  endUserAPI.me.mockResolvedValueOnce(response(null)); mount(); await screen.findByText('No workspace is set up for this account yet');
  endUserAPI.me.mockRejectedValueOnce(new Error('unavailable'));
  await act(async () => client.invalidateQueries({ queryKey: ['end-user.dashboard'] }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Workspace status could not be loaded');
  expect(screen.queryByText('No workspace is set up for this account yet')).not.toBeInTheDocument();
});
