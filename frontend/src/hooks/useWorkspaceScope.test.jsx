import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useWorkspaceScope, { normalizeWorkspaceId, workspaceEventMatches, resolveWorkspace, useScopedBadgeCount } from './useWorkspaceScope';
import useDashboardCounts from './useDashboardCounts';
import useRealtimeSync from './useRealtimeSync';
import { useAppStore } from '../stores/appStore';
let mockSession = { status: 'authenticated', user: { id: 1, workspace_id: 42 } };
let mockParams = {};
let mockEvent;
jest.mock('../core/session', () => ({ useSession: () => mockSession }));
jest.mock('../core/navigation', () => ({ useAppParams: () => mockParams, useAppLocation: () => ({ pathname: '/analytics' }), useAppSearchParams: () => [new URLSearchParams()] }));
jest.mock('./useRealtime', () => ({ useRealtime: callback => { mockEvent = callback; } }));
jest.mock('../services/domains/accounts', () => ({ workspacesAPI: { get: async id => { if (![42, 99].includes(id)) throw new Error('Forbidden'); return { data: { id } }; } } }));
let mockResponses = {};
jest.mock('../services/http/client', () => ({ api: { get: jest.fn((url, { params }) => mockResponses[params.client_id] ?? Promise.resolve({ data: { client_id: params.client_id, unread_inbox: params.client_id } })) } }));
const base = { user: { id: 1, workspace_id: 42 }, status: 'authenticated', path: '/analytics', allowed: [{ id: 99 }] };
test.each([
  [{ route: '99' }, 99], [{ route: 'bad' }, null], [{ route: 7 }, null],
  [{ selection: '99', owner: 1 }, 99], [{ selection: 99, owner: 2 }, 42],
  [{}, 42], [{ user: { id: 1 } }, null], [{ status: 'anonymous' }, null],
  [{ user: { id: 1, role: 'superadmin' } }, null],
])('resolution %j', (input, expected) => expect(resolveWorkspace({ ...base, ...input })).toBe(expected));
test.each([[42, 42], ['042', 42], [0, null], ['', null], [[], null], ['1.2', null], [-1, null]])('normalize %j', (input, output) => expect(normalizeWorkspaceId(input)).toBe(output));
function Surface() {
  const scope = useWorkspaceScope();
  useDashboardCounts();
  useRealtimeSync();
  const badge = useScopedBadgeCount('unread_inbox');
  return <><button onClick={() => useAppStore.getState().selectWorkspace(99, scope.user.id, scope.pathname)}>Switch workspace</button><span data-testid="scope">{scope.workspaceId ?? 'none'}</span><span data-testid="badge">{badge}</span></>;
}
beforeEach(() => { useAppStore.getState().reset(); mockParams = {}; mockSession = { status: 'authenticated', user: { id: 1, workspace_id: 42 } }; mockResponses = {}; });
test('UI selection, late counts, realtime filtering and logout use the same scope', async () => {
  let resolveOld;
  mockResponses[42] = new Promise(resolve => { resolveOld = resolve; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const tree = () => <QueryClientProvider client={client}><Surface /></QueryClientProvider>;
  const view = render(tree());
  expect(screen.getByTestId('scope')).toHaveTextContent('42');
  act(() => screen.getByText('Switch workspace').click());
  await waitFor(() => expect(screen.getByTestId('badge')).toHaveTextContent('99'));
  act(() => { resolveOld({ data: { client_id: 42, unread_inbox: 500 } }); mockEvent({ type: 'inbox.new_message', client_id: 42 }); });
  expect(screen.getByTestId('badge')).toHaveTextContent('99');
  act(() => mockEvent({ type: 'inbox.new_message', client_id: '99' }));
  expect(screen.getByTestId('badge')).toHaveTextContent('100');
  mockSession = { status: 'anonymous', user: null };
  view.rerender(tree());
  act(() => mockEvent({ type: 'inbox.new_message', client_id: 99 }));
  expect(screen.getByTestId('badge')).toHaveTextContent('0');
  mockSession = { status: 'authenticated', user: { id: 2, workspace_id: 7 } };
  view.rerender(tree());
  expect(screen.getByTestId('scope')).toHaveTextContent('7');
  view.unmount(); client.clear();
});
test('anonymous bootstrap has no scope or requests with absent selection', () => {
  mockSession = { status: 'initializing', user: null };
  const client = new QueryClient();
  const view = render(<QueryClientProvider client={client}><Surface /></QueryClientProvider>);
  expect(screen.getByTestId('scope')).toHaveTextContent('none');
  expect(screen.getByTestId('badge')).toHaveTextContent('0');
  view.unmount(); client.clear();
});
test('restored identity-owned selection is revalidated and route overrides it', async () => {
  localStorage.setItem('social-stats-state', JSON.stringify({ state: { workspaceSelection: { id: '99', owner: 1, path: '/analytics' } }, version: 0 }));
  await useAppStore.persist.rehydrate();
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const tree = () => <QueryClientProvider client={client}><Surface /></QueryClientProvider>;
  const view = render(tree());
  await waitFor(() => expect(screen.getByTestId('scope')).toHaveTextContent('99'));
  mockParams = { workspaceId: 'invalid' };
  view.rerender(tree());
  expect(screen.getByTestId('scope')).toHaveTextContent('none');
  view.unmount(); client.clear();
});

test('unauthorized explicit route fails closed while session has a valid default', async () => {
  mockParams = { workspaceId: '7' };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><Surface /></QueryClientProvider>);
  await waitFor(() => expect(client.getQueryState(['workspace.scope.access', 1, 7])?.status).toBe('error'));
  expect(screen.getByTestId('scope')).toHaveTextContent('none');
  expect(screen.getByTestId('badge')).toHaveTextContent('0');
  view.unmount(); client.clear();
});

test.each([
  [{ client_id: '42' }, 42, true], [{ workspace_id: 42 }, 42, true],
  [{ workspace_id: 42, client_id: 99 }, 42, false], [{}, 42, false],
  [{ client_id: 42 }, null, false], [{ client_id: 99 }, 42, false],
])('event scope %j', (event, id, accepted) => expect(workspaceEventMatches(event, id)).toBe(accepted));
