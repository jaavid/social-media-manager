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

/**
 *
 * Defaults tuned for an SPA with frequent navigation:
 *   - staleTime 30s — most lists stay "fresh" for half a minute, killing
 *     the re-fetch storm when a user navigates away and back.
 *   - gcTime 5min — keep stale results around for 5 min so re-mounts are
 *     instant (data shows immediately, then revalidates in background).
 *   - retry once — we already wrap network failures in toast.error in
 *     individual fetchers; React Query retries on top would be noisy.
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
      retry:               1,
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: 0, // never silently re-do a write — let the caller decide
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
