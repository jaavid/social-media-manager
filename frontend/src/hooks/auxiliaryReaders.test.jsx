import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOAuthStatus, useLookups, usePosts, useWorkspaces } from './useData';
import { oauthAPI, lookupsAPI, workspacesAPI } from '@/services/api';
const oauth = Object.fromEntries(['facebook','instagram','youtube','linkedin','google_my_business'].map(key => [key, { status: 'not_connected', last_successful_sync: null, accounts: [] }]));
let mockUser, mockStatus;
jest.mock('@/core/session', () => ({ useSession: () => ({ user: mockUser, status: mockStatus }) }));
jest.mock('@/services/api', () => ({ oauthAPI: { status: jest.fn() }, lookupsAPI: { get: jest.fn() }, workspacesAPI: { posts: jest.fn(), list: jest.fn() } }));
let client;
beforeEach(() => { jest.clearAllMocks(); mockUser = { id: 1, role: 'client', account_type: 'legacy', client_id: 7 }; mockStatus = 'authenticated'; client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); oauthAPI.status.mockResolvedValue({ data: oauth }); lookupsAPI.get.mockResolvedValue({ data: {} }); workspacesAPI.posts.mockResolvedValue({ data: { results: [{ id: 1 }], total: 1, has_more: false } }); workspacesAPI.list.mockResolvedValue({ data: [{ id: 7 }] }); });
afterEach(() => client.clear());
const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
test('OAuth keeps valid same-context status through outage; old late response cannot appear in new workspace or logout', async () => {
  const view = renderHook(({ workspace }) => useOAuthStatus(workspace), { wrapper, initialProps: { workspace: 7 } }); await waitFor(() => expect(view.result.current.data).toBeDefined());
  oauthAPI.status.mockRejectedValueOnce({ response: { status: 503 } }); await act(async () => view.result.current.refetch()); expect(view.result.current.data).toBeDefined(); await waitFor(() => expect(view.result.current.query.isError).toBe(true));
  let finish; oauthAPI.status.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); view.rerender({ workspace: 8 }); await waitFor(() => expect(finish).toBeDefined()); expect(view.result.current.data).toBeUndefined();
  view.rerender({ workspace: 9 }); await waitFor(() => expect(view.result.current.query.isSuccess).toBe(true)); await act(async () => finish({ data: { ...oauth, facebook: { ...oauth.facebook, status: 'expired', connected_at: '2026-10-07T10:00:00Z', expires_at: null, account_name: 'old' } } })); expect(view.result.current.data.facebook.status).toBe('not_connected');
  mockStatus = 'anonymous'; mockUser = null; view.rerender({ workspace: 9 }); expect(view.result.current.data).toBeUndefined();
});
test('lookup refresh malformed data does not replace valid options or silently become empty', async () => {
  lookupsAPI.get.mockResolvedValueOnce({ data: { platforms: [] } }); const view = renderHook(() => useLookups(), { wrapper }); await waitFor(() => expect(view.result.current.data).toEqual({ platforms: [] })); lookupsAPI.get.mockResolvedValueOnce({ data: [] }); await act(async () => view.result.current.refetch()); await waitFor(() => expect(view.result.current.query.isError).toBe(true)); expect(view.result.current.data).toEqual({ platforms: [] });
});
test('posts and workspace keys change when role changes without reusing the old private snapshot', async () => {
  const view = renderHook(() => ({ posts: usePosts(7, 'all', {}), workspaces: useWorkspaces() }), { wrapper }); await waitFor(() => expect(view.result.current.posts.total).toBe(1));
  workspacesAPI.posts.mockImplementation(() => new Promise(() => {})); workspacesAPI.list.mockImplementation(() => new Promise(() => {})); mockUser = { ...mockUser, role: 'staff' }; view.rerender(); expect(view.result.current.posts.total).toBeNull(); expect(view.result.current.workspaces.data).toBeUndefined();
});
