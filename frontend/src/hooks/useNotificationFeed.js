import { useQuery, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSession } from '@/core/session';
import { apiError } from '@/services/http/errors';
import { alertsAPI, notificationAPI } from '@/services/domains/reporting';
import { parseAlerts, parseNotifications, parseMarked } from '@/lib/settingsRecovery';
export default function useNotificationFeed(kind, workspace, { enabled = true, scopeKey = null, filters = {} } = {}) {
  const { user, status } = useSession();
  const client = useQueryClient();
  const identity = JSON.stringify([user?.id, user?.role, user?.account_type, user?.workspace_id, user?.client_id, workspace, scopeKey, filters]);
  const key = ['notification-feed', kind, identity];
  const current = useRef(identity), lock = useRef(false), alive = useRef(false);
  useLayoutEffect(() => { current.current = identity; }, [identity]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const active = enabled && status === 'authenticated' && !!user && (user.role !== 'client' || !!user.client_id);
  const query = useQuery({ queryKey: key, enabled: active, refetchInterval: kind === 'alerts' ? 60000 : 30000,
    queryFn: async ({ signal }) => kind === 'alerts' ? parseAlerts((await alertsAPI.list({ ...filters, ...(workspace ? { client: workspace } : {}) }, { signal })).data) : parseNotifications((await notificationAPI.list({ signal })).data) });
  const [write, setWrite] = useState(null);
  const failure = apiError(query.error), writeFailure = write?.identity === identity ? write : null;
  const denied = !active || [401, 403, 404].includes(failure.status) || [401, 403, 404].includes(writeFailure?.error?.status);
  const rows = denied ? undefined : query.data;
  const mark = async id => {
    if (lock.current || !active || denied || !rows || writeFailure?.uncertain || !onlineManager.isOnline()) return;
    const captured = identity, capturedKey = key;
    lock.current = true; setWrite({ identity: captured, busy: true });
    try {
      const response = kind === 'alerts' ? id === undefined ? await alertsAPI.markAllRead(workspace ? { client: workspace } : {}) : await alertsAPI.markRead(id) : id === undefined ? await notificationAPI.markAll() : await notificationAPI.markRead(id);
      parseMarked(response.data);
      if (!alive.current || current.current !== captured) return;
      await client.cancelQueries({ queryKey: capturedKey, exact: true });
      if (!alive.current || current.current !== captured) return;
      // For filtered collections re-read rather than leave a marked row in an unread filter.
      client.setQueryData(capturedKey, old => old?.map(r => id === undefined || r.id === id ? { ...r, is_read: true } : r).filter(r => filters.is_read === undefined || r.is_read === filters.is_read));
      setWrite({ identity: captured, busy: false, success: true });
      void query.refetch();
    } catch (error) {
      if (alive.current && current.current === captured) { const reason = apiError(error); setWrite({ identity: captured, busy: false, error: reason, uncertain: !reason.status || reason.status >= 500 }); }
    } finally { lock.current = false; }
  };
  const readAgain = query.refetch;
  const refetch = useCallback(async () => {
    const captured = identity;
    const result = await readAgain();
    if (alive.current && current.current === captured && result.isSuccess) setWrite(null);
    return result;
  }, [identity, readAgain]);
  return { query, failure, denied, data: rows, rows: rows || [], loading: query.isPending, error: query.error, offline: query.isPaused, write: writeFailure, busy: !!writeFailure?.busy,
    unreadCount: rows?.filter(r => !r.is_read).length || 0, markRead: mark, markAllRead: () => mark(), refetch };
}
