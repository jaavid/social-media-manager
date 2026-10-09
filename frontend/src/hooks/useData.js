/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { apiError } from '@/services/http/errors';
import { useState, useEffect, useCallback } from 'react';
import { workspacesAPI, oauthAPI } from '@/services/domains/accounts';
import { overviewAPI, syncLogsAPI, goalsAPI, lookupsAPI } from '@/services/domains/reporting';
import useNotificationFeed from './useNotificationFeed';
import { useAccountRead } from '@/components/ui/accountRecovery';
import { parseOAuthStatus, parseLookups } from '@/lib/auxiliaryRecovery';
import { parseSyncLogs } from '@/lib/recoveryCollections';
import { PLATFORM_LIST } from '../services/platforms';
import { format, subDays } from 'date-fns';

export function useDateRange(defaultDays = 30) {
  const [range, setRange] = useState({
    since: format(subDays(new Date(), defaultDays), 'yyyy-MM-dd'),
    until: format(new Date(), 'yyyy-MM-dd'),
  });
  return [range, setRange];
}

const privateIdentity = user => [user?.id, user?.role, user?.account_type, user?.workspace_id, user?.client_id];
function privateSnapshot(query) {
  return query.error && [401, 403, 404].includes(apiError(query.error).status) ? undefined : query.data;
}
function collection(wire) {
  const rows = Array.isArray(wire) ? wire : wire?.results;
  if (!Array.isArray(rows) || rows.some(row => !row || !Number.isSafeInteger(row.id))) throw new Error('Invalid collection');
  return rows;
}
export function useWorkspaces() {
  const { user } = useSession();
  const query = useQuery({ queryKey: ['workspaces.list', privateIdentity(user)], retry: false,
    queryFn: async ({ signal }) => collection((await workspacesAPI.list(undefined, signal)).data) });
  const clients = privateSnapshot(query) || [];
  return { query, data: privateSnapshot(query), failure: apiError(query.error), denied: [401, 403, 404].includes(apiError(query.error).status), workspaces: clients, clients, loading: query.isPending, refreshing: query.isFetching && !!query.data,
    error: query.error, offline: query.fetchStatus === 'paused', refetch: query.refetch };
}

export function useWorkspaceSummary(clientId, range, platform) {
  const { user } = useSession();
  const params = { ...range, ...(platform && platform !== 'all' ? { platform } : {}) };
  const query = useQuery({ queryKey: ['workspace.summary', privateIdentity(user), clientId, params], enabled: !!clientId, retry: false,
    queryFn: async ({ signal }) => {
      const data = (await workspacesAPI.summary(clientId, params, signal)).data;
      if (!data || typeof data !== 'object' || !data.client || !data.totals || !Array.isArray(data.by_platform)) throw new Error('Invalid summary');
      return data;
    } });
  return { data: privateSnapshot(query), loading: !!clientId && query.isPending, refreshing: query.isFetching && !!query.data, error: query.error, offline: query.fetchStatus === 'paused', refetch: query.refetch };
}

export function useTimeseries(clientId, range, platform) {
  const { user } = useSession();
  const params = { ...range, ...(platform && platform !== 'all' ? { platform } : {}) };
  const query = useQuery({ queryKey: ['workspace.timeseries', privateIdentity(user), clientId, params], enabled: !!clientId, retry: false,
    queryFn: async ({ signal }) => collection((await workspacesAPI.timeseries(clientId, params, signal)).data) });
  return { data: privateSnapshot(query) || [], loading: !!clientId && query.isPending, refreshing: query.isFetching && !!query.data, error: query.error, offline: query.fetchStatus === 'paused', refetch: query.refetch };
}

export function usePosts(clientId, platform, range, pageSize = 20, accountId = null) {
  const { user } = useSession();
  const params = { ...range, ...(platform && platform !== 'all' ? { platform } : {}), ...(accountId ? { social_account: accountId } : {}) };
  const query = useInfiniteQuery({ queryKey: ['workspace.posts', privateIdentity(user), clientId, params, pageSize], enabled: !!clientId,
    initialPageParam: 0, retry: false,
    queryFn: async ({ signal, pageParam }) => {
      const wire = (await workspacesAPI.posts(clientId, { ...params, limit: pageSize, offset: pageParam }, signal)).data;
      if (!wire || !Array.isArray(wire.results) || !Number.isSafeInteger(wire.total) || wire.total < 0 || typeof wire.has_more !== 'boolean'
          || (wire.dataset_count !== undefined && (!Number.isSafeInteger(wire.dataset_count) || wire.dataset_count < 0))
          || (wire.has_more && !wire.results.length) || wire.results.some(row => !row || !Number.isSafeInteger(row.id))) throw new Error('Invalid posts');
      return { ...wire, offset: pageParam };
    },
    getNextPageParam: page => page.has_more ? page.offset + page.results.length : undefined,
  });
  const data = privateSnapshot(query);
  const posts = data?.pages.flatMap(page => page.results) || [];
  return { query, data, failure: apiError(query.error), denied: [401, 403, 404].includes(apiError(query.error).status), posts, total: data?.pages[0]?.total ?? null, datasetCount: data?.pages[0]?.dataset_count ?? null, hasMore: !!data && !!query.hasNextPage, loading: !!clientId && query.isPending,
    loadingMore: query.isFetchingNextPage, loadMore: query.fetchNextPage, refreshing: query.isFetching && !!data, offline: query.fetchStatus === 'paused',
    error: query.error, refetch: query.refetch };
}

export function useOAuthStatus(clientId) {
  const { user, status: session } = useSession();
  const resource = useAccountRead('oauth-status', [user?.id, user?.role, user?.account_type, user?.workspace_id, user?.client_id, clientId], session === 'authenticated' && !!clientId, signal => oauthAPI.status(clientId, signal), parseOAuthStatus);
  return { ...resource, status: resource.data || {}, loading: resource.query.isPending, refetch: resource.query.refetch };
}

export function useOverview(range) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await overviewAPI.get(range);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useSyncLogs(clientId) {
  const { user, status } = useSession();
  const identity = [user?.id, user?.role, user?.account_type, user?.workspace_id, user?.client_id];
  const query = useQuery({
    queryKey: ['sync-logs', identity, clientId], enabled: status === 'authenticated',
    queryFn: async ({ signal }) => parseSyncLogs((await syncLogsAPI.list(clientId ? { client: clientId } : {}, signal)).data),
  });
  const data = privateSnapshot(query);
  return { logs: data || [], hasData: data !== undefined, loading: query.isPending,
    refreshing: query.isFetching && data !== undefined, error: query.error,
    offline: query.fetchStatus === 'paused', refetch: query.refetch };
}

export function useGoalProgress(clientId, month, year) {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading]   = useState(false);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await goalsAPI.progress({ client: clientId, month, year });
      setProgress(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clientId, month, year]);

  useEffect(() => { fetch(); }, [fetch]);
  return { progress, loading, refetch: fetch };
}

export function useGoals(params) {
  const [goals, setGoals]     = useState([]);
  const [loading, setLoading] = useState(false);
  // Serialize to avoid infinite loop from new object reference on every render
  const paramsKey = JSON.stringify(params);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await goalsAPI.list(JSON.parse(paramsKey));
      setGoals(res.data.results || res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [paramsKey]);

  useEffect(() => { fetch(); }, [fetch]);
  return { goals, loading, refetch: fetch };
}

export function useAlerts(clientId, options = {}) {
  const result = useNotificationFeed('alerts', clientId, options);
  return { ...result, alerts: result.rows };
}

export function useLookups() {
  const query = useQuery({ queryKey: ['public.lookups'], queryFn: async ({ signal }) => parseLookups((await lookupsAPI.get(signal)).data) });
  const failure = apiError(query.error), denied = [401, 403, 404].includes(failure.status);
  const data = denied ? undefined : query.data;
  const lookups = data ? { ...data, ...(data.platforms ? { platforms: data.platforms.filter(item => PLATFORM_LIST.includes(item.key)).sort((a, b) => PLATFORM_LIST.indexOf(a.key) - PLATFORM_LIST.indexOf(b.key)) } : {}) } : {};
  return { query, failure, denied, data, lookups, loading: query.isPending, refetch: query.refetch };
}

// Compatibility hooks for existing feature modules.
export const useClients = useWorkspaces;
export const useClientSummary = useWorkspaceSummary;
