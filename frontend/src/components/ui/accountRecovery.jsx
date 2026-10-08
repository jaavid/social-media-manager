/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { apiError } from '@/services/http/errors';
import { useLanguage } from '@/i18n';
import Button from '@/components/ui/Button';
import DataState from '@/components/ui/DataState';
import Skeleton from '@/components/ui/Skeleton';

export function AccountScope({ children }) {
  const { user, status } = useSession();
  const identity = [user?.id, user?.role, user?.account_type, user?.workspace_id, user?.client_id];
  return children(identity, status === 'authenticated', JSON.stringify(identity));
}
export function useAccountRead(name, identity, enabled, read, parse) {
  const client = useQueryClient();
  const queryKey = ['account-recovery', name, identity];
  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async ({ signal }) => parse((await read(signal)).data),
  });
  const failure = apiError(query.error);
  const denied = !enabled || [401, 403, 404].includes(failure.status);
  return {
    query,
    failure,
    denied,
    data: denied ? undefined : query.data,
    commit: async (update) => {
      await client.cancelQueries({ queryKey, exact: true });
      client.setQueryData(queryKey, update);
    },
  };
}
export function useCheckedAction() {
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(null),
    [uncertain, setUncertain] = useState(false),
    [success, setSuccess] = useState(false);
  const alive = useRef(false),
    lock = useRef(false),
    errorRef = useRef(null);
  const online = useSyncExternalStore(
    (fn) => onlineManager.subscribe(fn),
    () => onlineManager.isOnline(),
    () => true,
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);
  const run = async (operation, apply) => {
    if (lock.current || uncertain || !online) return;
    lock.current = true;
    setBusy(true);
    setFailure(null);
    setSuccess(false);
    try {
      const result = await operation();
      if (!alive.current) return;
      await apply?.(result);
      if (alive.current) setSuccess(true);
    } catch (error) {
      if (!alive.current) return;
      const reason = apiError(error);
      setFailure(reason);
      setUncertain(!reason.status || reason.status >= 500);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return {
    run,
    busy,
    failure,
    uncertain,
    success,
    errorRef,
    alive,
    invalidate: () => { alive.current = false; },
    online,
    denied: [401, 403, 404].includes(failure?.status),
    locked: busy || uncertain || !online,
    verified: () => {
      if (alive.current) {
        setUncertain(false);
        setFailure(null);
        setSuccess(false);
      }
    },
  };
}
export function ReadState({ resource, refresh, busy = false, returnFocusRef }) {
  const { t } = useLanguage();
  const { query, failure, denied, data } = resource;
  const state = denied
    ? failure.status === 404
      ? 'not-found'
      : 'forbidden'
    : query.isPaused
      ? 'offline'
      : query.isError
        ? data !== undefined
          ? 'stale'
          : 'error'
        : query.isPending
          ? 'loading'
          : query.isFetching
            ? 'refreshing'
            : null;
  if (!state) return null;
  const key = denied
    ? failure.status === 404
      ? 'notFound'
      : failure.status === 403
        ? 'forbidden'
        : 'denied'
    : failure.status === 429
      ? 'rateLimited'
      : query.isPaused
        ? 'offline'
        : query.isError
          ? data !== undefined
            ? 'stale'
            : 'failed'
          : state;
  return (
    <>
      <DataState
        compact
        state={state}
        title={t(`recovery.${key}`)}
        referenceId={failure.referenceId}
        action={
          !['loading', 'refreshing'].includes(state) && (
            <Button
              disabled={query.isFetching || busy}
              onClick={async () => {
                const result = await refresh();
                if (result?.isSuccess) returnFocusRef?.current?.focus();
              }}
            >
              {t('recovery.retry')}
            </Button>
          )
        }
      />
      {state === 'loading' && (
        <div aria-hidden="true">
          <Skeleton height={100} />
        </div>
      )}
    </>
  );
}
export function WriteState({ action, recover, uncertainKey = 'account.uncertain' }) {
  const { t } = useLanguage();
  return (
    <>
      {action.busy && <DataState compact state="refreshing" title={t('account.pending')} />}
      {!action.online && <DataState compact state="offline" title={t('recovery.offline')} />}
      {action.failure && (
        <DataState
          compact
          focusRef={action.errorRef}
          state={
            action.denied ? (action.failure.status === 404 ? 'not-found' : 'forbidden') : 'error'
          }
          title={t(
            action.uncertain
              ? uncertainKey
              : action.failure.status === 429
                ? 'account.rateLimited'
                : 'account.writeFailed',
          )}
          referenceId={action.failure.referenceId}
          action={
            recover && (
              <Button disabled={action.busy} onClick={recover}>
                {t('account.checkStatus')}
              </Button>
            )
          }
        />
      )}
    </>
  );
}
