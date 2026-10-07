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
import { useState, useEffect, useCallback, useRef } from 'react';
import { workspacesAPI, oauthAPI, overviewAPI, syncLogsAPI, goalsAPI, alertsAPI, lookupsAPI } from '../services/api';
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
  const query = useQuery({ queryKey: ['workspaces.list', user?.id, user?.workspace_id, user?.client_id], retry: false,
    queryFn: async ({ signal }) => collection((await workspacesAPI.list(undefined, signal)).data) });
  const clients = privateSnapshot(query) || [];
  return { workspaces: clients, clients, loading: query.isPending, refreshing: query.isFetching && !!query.data,
    error: query.error, offline: query.fetchStatus === 'paused', refetch: query.refetch };
}

export function useWorkspaceSummary(clientId, range, platform) {
  const { user } = useSession();
  const params = { ...range, ...(platform && platform !== 'all' ? { platform } : {}) };
  const query = useQuery({ queryKey: ['workspace.summary', user?.id, clientId, params], enabled: !!clientId, retry: false,
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
  const query = useQuery({ queryKey: ['workspace.timeseries', user?.id, clientId, params], enabled: !!clientId, retry: false,
    queryFn: async ({ signal }) => collection((await workspacesAPI.timeseries(clientId, params, signal)).data) });
  return { data: privateSnapshot(query) || [], loading: !!clientId && query.isPending, refreshing: query.isFetching && !!query.data, error: query.error, offline: query.fetchStatus === 'paused', refetch: query.refetch };
}

export function usePosts(clientId, platform, range, pageSize = 20, accountId = null) {
  const { user } = useSession();
  const params = { ...range, ...(platform && platform !== 'all' ? { platform } : {}), ...(accountId ? { social_account: accountId } : {}) };
  const query = useInfiniteQuery({ queryKey: ['workspace.posts', user?.id, clientId, params, pageSize], enabled: !!clientId,
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
  return { posts, total: data?.pages[0]?.total ?? null, datasetCount: data?.pages[0]?.dataset_count ?? null, hasMore: !!query.hasNextPage, loading: !!clientId && query.isPending,
    loadingMore: query.isFetchingNextPage, loadMore: query.fetchNextPage, refreshing: query.isFetching && !!data, offline: query.fetchStatus === 'paused',
    error: query.error, refetch: query.refetch };
}

export function useOAuthStatus(clientId) {
  const [status, setStatus]   = useState({});
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await oauthAPI.status(clientId);
      setStatus(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { status, loading, refetch: fetch };
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

export function useAlerts(clientId, { enabled = true, scopeKey = null } = {}) {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef              = useRef(null);
  const requestRef            = useRef(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      setLoading(true);
      const params = clientId ? { client: clientId } : {};
      const res = await alertsAPI.list(params, { signal: controller.signal });
      setAlerts(res.data.results || res.data);
    } catch (e) { if (e?.code !== 'ERR_CANCELED') console.error(e); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [clientId, enabled, scopeKey]);

  useEffect(() => {
    if (!enabled) {
      setAlerts([]);
      setLoading(false);
      requestRef.current?.abort();
      return undefined;
    }
    fetch();
    timerRef.current = setInterval(fetch, 60000);
    return () => {
      clearInterval(timerRef.current);
      requestRef.current?.abort();
    };
  }, [fetch, enabled]);

  const markRead = useCallback(async (id) => {
    await alertsAPI.markRead(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }, []);

  const markAllRead = useCallback(async () => {
    const params = clientId ? { client: clientId } : {};
    await alertsAPI.markAllRead(params);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
  }, [clientId]);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return { alerts, loading, unreadCount, markRead, markAllRead, refetch: fetch };
}

export function useLookups() {
  const [lookups, setLookups] = useState({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lookupsAPI.get();
      const data = res.data || {};

      if (Array.isArray(data.platforms)) {
        data.platforms = data.platforms
          .filter(item => PLATFORM_LIST.includes(item.key))
          .sort((a, b) => PLATFORM_LIST.indexOf(a.key) - PLATFORM_LIST.indexOf(b.key));
      }

      setLookups(data);
    } catch (e) {
      console.error('Failed to load lookups:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { lookups, loading, refetch: fetch };
}

// Compatibility hooks for existing feature modules.
export const useClients = useWorkspaces;
export const useClientSummary = useWorkspaceSummary;
