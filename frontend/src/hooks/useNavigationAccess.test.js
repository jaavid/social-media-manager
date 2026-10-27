import { navigationPermission } from './useNavigationAccess';
const granted = () => true;
const account = permissions => ({ permissions });
test('legacy grants never invent effective account access', () => {
  for (const code of ['composer.view', 'inbox.view', 'analytics.view', 'reports.view']) {
    expect(navigationPermission(code, granted, [])).toBe(false);
  }
  expect(navigationPermission('composer.view', granted, [account({ view_posts: true })])).toBe(true);
  expect(navigationPermission('inbox.view', granted, [account({ view_inbox: false })])).toBe(false);
  expect(navigationPermission('reports.view', granted, [account({ view_analytics: true }), account({ generate_reports: true })])).toBe(false);
  expect(navigationPermission('reports.view', granted, [account({ view_analytics: true, generate_reports: true })])).toBe(true);
  expect(navigationPermission('reports.view', () => false, [account({ view_analytics: true, generate_reports: true })])).toBe(false);
});

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useNavigationAccess from './useNavigationAccess';
import { connectionsAPI } from '../services/domains/connections';
let mockScope;
jest.mock('./useWorkspaceScope', () => ({ __esModule: true, default: () => mockScope }));
jest.mock('../core/session', () => ({ useSession: () => ({ status: 'authenticated', user: { id: 1, permissions: {} }, can: () => true }) }));
jest.mock('../services/domains/connections', () => ({ connectionsAPI: { get: jest.fn() } }));
function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return { client, Wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
beforeEach(() => { mockScope = { workspaceId: 7, key: 'user-1:7' }; connectionsAPI.get.mockReset(); });
test('workspace change immediately removes old grants; late old response cannot restore them', async () => {
  let finishOld;
  connectionsAPI.get.mockImplementation(id => id === 7 ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve({ workspace_id: 8, providers: [{ accounts: [account({ view_posts: true, view_inbox: false })] }] }));
  const { client, Wrapper } = wrapper();
  const view = renderHook(() => useNavigationAccess(), { wrapper: Wrapper });
  expect(view.result.current('inbox.view')).toBe(false);
  mockScope = { workspaceId: 8, key: 'user-1:8' }; view.rerender();
  await waitFor(() => expect(view.result.current('composer.view')).toBe(true));
  await act(async () => finishOld({ workspace_id: 7, providers: [{ accounts: [account({ view_inbox: true })] }] }));
  expect(view.result.current('inbox.view')).toBe(false);
  view.unmount(); client.clear();
});
test('failed refresh and mismatched workspace metadata remove discovery grants', async () => {
  connectionsAPI.get.mockResolvedValue({ workspace_id: 7, providers: [{ accounts: [account({ view_inbox: true })] }] });
  const { client, Wrapper } = wrapper();
  const view = renderHook(() => useNavigationAccess(), { wrapper: Wrapper });
  await waitFor(() => expect(view.result.current('inbox.view')).toBe(true));
  connectionsAPI.get.mockRejectedValue(new Error('Forbidden'));
  await act(async () => { await client.invalidateQueries({ queryKey: ['connections'] }); });
  await waitFor(() => expect(view.result.current('inbox.view')).toBe(false));
  mockScope = { workspaceId: 8, key: 'user-1:8' };
  connectionsAPI.get.mockResolvedValue({ workspace_id: 7, providers: [{ accounts: [account({ view_inbox: true })] }] });
  view.rerender();
  await waitFor(() => expect(client.getQueryState(['connections', 8])?.status).toBe('success'));
  expect(view.result.current('inbox.view')).toBe(false);
  view.unmount(); client.clear();
});
