/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
type WorkspaceId = number | null | undefined;
type Filters = Readonly<Record<string, unknown>>;
import { QueryClient } from '@tanstack/react-query';
import { apiError } from './http/errors';

/**
 *
 * Defaults tuned for an SPA with frequent navigation:
 *   - staleTime 30s — most lists stay "fresh" for half a minute, killing
 *     the re-fetch storm when a user navigates away and back.
 *   - gcTime 5min — keep stale results around for 5 min so re-mounts are
 *     instant (data shows immediately, then revalidates in background).
 *   - retry once only for unavailable transport/5xx reads; malformed,
 *     authentication, permission and rate-limit failures need explicit recovery.
 *   - refetchOnWindowFocus on — when the user comes back to the tab, the
 *     critical lists revalidate. WebSocket events handle the inter-tab
 *     case for free.
 *
 * Keys follow a `[feature, ...params]` convention. The invalidation
 * helpers in `useRealtimeSync.js` rely on this — touch only the right
 * subtree on each event.
 */
export function createQueryClient() { return new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,        // 30s
      gcTime:              5 * 60_000,    // 5min
      retry: (failures, error) => failures < 1 && apiError(error).kind === 'unavailable',
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: 0, // never silently re-do a write — let the caller decide
      networkMode: 'always', // offline writes fail immediately; never queue an unsafe replay
    },
  },
}); }


/**
 * Query-key factory. Use these everywhere instead of inline arrays so
 * invalidation in `useRealtimeSync.js` always hits the right keys.
 *
 * Pattern: `[feature, scope, ...filters]`. The `scope` is typically a
 * client id so cross-tenant queries don't collide in the cache.
 */
export const QK = {
  metaAds: (identity: readonly unknown[], workspace: WorkspaceId, collection: string, account = '', campaign = '') => ['meta-ads', identity, workspace, collection, account, campaign],
  connectionExtension: (workspaceId: WorkspaceId, accountId: number, name: string) => ['connections.extension', workspaceId, accountId, name],
  connectionWorkspace: () => ['connections.workspace'],
  connections: (workspaceId: WorkspaceId) => ['connections', workspaceId],
  dashboardCounts: (clientId: WorkspaceId) => ['dashboard.counts', clientId],
  dashboardToday:  (clientId: WorkspaceId) => ['dashboard.today', clientId],
  search:          (clientId: WorkspaceId, q: string) => ['search', clientId, q],

  posts:           (clientId: WorkspaceId, filters: Filters = {}) => ['posts', clientId, filters],
  post:            (postId: number) => ['post', postId],
  calendar:        (clientId: WorkspaceId, range: Filters = {}) => ['calendar', clientId, range],

  conversations:   (clientId: WorkspaceId, filters: Filters = {}) => ['conversations', clientId, filters],
  conversation:    (conversationId: number) => ['conversation', conversationId],

  leads:           (clientId: WorkspaceId, filters: Filters = {}) => ['leads', clientId, filters],
  lead:            (leadId: number) => ['lead', leadId],

  botFlows:        (clientId: WorkspaceId) => ['bot-flows', clientId],
  botFlow:         (flowId: number) => ['bot-flow', flowId],

  approvals:       (clientId: WorkspaceId) => ['approvals', clientId],
  notifications:   () => ['notifications'],

  whatsappCampaigns: (clientId: WorkspaceId) => ['whatsapp.campaigns', clientId],
  whatsappContacts:  (clientId: WorkspaceId) => ['whatsapp.contacts', clientId],
};
