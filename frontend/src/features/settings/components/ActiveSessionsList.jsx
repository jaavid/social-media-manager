/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { sessionsAPI } from '@/services/domains/identity';
import { apiError } from '@/services/http/errors';
import { parseSessions, parseRevocation } from '@/lib/recoveryCollections';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';
import Skeleton from '@/components/ui/Skeleton';

export default function ActiveSessionsList() {
  const { user, status } = useSession();
  const identity = [user?.id, user?.role, user?.account_type, user?.workspace_id, user?.client_id];
  return (
    <SessionList
      key={JSON.stringify(identity)}
      identity={identity}
      enabled={status === 'authenticated'}
    />
  );
}
function SessionList({ identity, enabled }) {
  const { t, formatDate } = useLanguage();
  const query = useQuery({
    queryKey: ['account-sessions', identity],
    enabled,
    queryFn: async ({ signal }) => parseSessions((await sessionsAPI.list(signal)).data),
  });
  const failure = apiError(query.error);
  const denied = !enabled || [401, 403, 404].includes(failure.status);
  const sessions = denied ? undefined : query.data;
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [writeError, setWriteError] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState(false);
  const [restoreHeading, setRestoreHeading] = useState(false);
  const lock = useRef(false),
    alive = useRef(false),
    cancel = useRef(null),
    trigger = useRef(null),
    heading = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const refresh = async () => {
    const result = await query.refetch();
    if (!alive.current || !result.isSuccess) return;
    // A verified read is required before retrying an ambiguous revocation.
    setUncertain(false);
    if (
      target !== null &&
      (target === 'all'
        ? result.data.every((row) => !row.is_active)
        : !result.data.some((row) => row.id === target && row.is_active))
    ) {
      setRestoreHeading(true);
      setTarget(null);
      setWriteError(null);
    }
  };
  const revoke = async () => {
    if (lock.current || uncertain || target === null || denied || !sessions) return;
    const captured = target;
    lock.current = true;
    setBusy(true);
    setWriteError(null);
    setNotice(false);
    try {
      const response =
        captured === 'all' ? await sessionsAPI.revokeAll() : await sessionsAPI.revoke(captured);
      parseRevocation(response.data, captured === 'all');
      if (!alive.current) return;
      setRestoreHeading(true);
      setTarget(null);
      setNotice(true);
      // Do not infer the resulting list from a write; reload the authoritative API.
      await query.refetch();
    } catch (error) {
      if (!alive.current) return;
      const reason = apiError(error);
      setWriteError(reason);
      setUncertain(!reason.status || reason.status >= 500);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const retry = (
    <Button onClick={refresh} disabled={query.isFetching || busy}>
      {t('recovery.retry')}
    </Button>
  );
  const state = denied
    ? failure.status === 404
      ? 'not-found'
      : 'forbidden'
    : query.isPaused
      ? 'offline'
      : query.isError
        ? sessions
          ? 'stale'
          : 'error'
        : query.isPending
          ? 'loading'
          : query.isFetching
            ? 'refreshing'
            : null;
  return (
    <Card padding="md">
      <section className="space-y-4" aria-label={t('sessions.title')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 ref={heading} tabIndex={-1} className="font-semibold">
            {t('sessions.title')}
          </h3>
          <Button onClick={refresh} disabled={query.isFetching || busy}>
            {t('recovery.refresh')}
          </Button>
        </div>
        {state && (
          <DataState
            compact
            state={state}
            referenceId={failure.referenceId}
            title={t(
              failure.status === 404
                ? 'recovery.notFound'
                : failure.status === 403
                  ? 'recovery.forbidden'
                  : denied
                    ? 'recovery.denied'
                    : failure.status === 429
                      ? 'recovery.rateLimited'
                      : query.isPaused
                        ? 'recovery.offline'
                        : query.isError
                          ? sessions
                            ? 'recovery.stale'
                            : 'recovery.failed'
                          : query.isFetching && sessions
                            ? 'recovery.refreshing'
                            : 'recovery.loading',
            )}
            action={state !== 'loading' && state !== 'refreshing' ? retry : undefined}
          />
        )}
        {query.isPending && !query.isError && !query.isPaused && !denied && (
          <div aria-hidden="true">
            <Skeleton height={100} />
          </div>
        )}
        {notice && !denied && (
          <p role="status" className="text-sm">
            {t('sessions.revoked')}
          </p>
        )}
        {sessions &&
          (sessions.length ? (
            <>
              <p className="text-sm text-muted-foreground">{t('sessions.allHint')}</p>
              {sessions.some((row) => row.is_active) && (
                <Button
                  variant="danger"
                  disabled={busy || uncertain || query.isFetching}
                  onClick={(event) => {
                    trigger.current = event.currentTarget;
                    setRestoreHeading(false);
                    setTarget('all');
                    setWriteError(null);
                    setNotice(false);
                  }}
                >
                  {t('sessions.revokeAll')}
                </Button>
              )}
              <ul className="divide-y divide-border" aria-busy={query.isFetching || undefined}>
                {sessions.map((row) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                    key={row.id}
                  >
                    <div className="min-w-0 space-y-1">
                      <p>
                        <bdi>
                          {row.browser || t('recovery.unknown')} · {row.os || t('recovery.unknown')}{' '}
                          · {row.device || t('recovery.unknown')}
                        </bdi>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <bdi>{row.ip || t('recovery.unknown')}</bdi> ·{' '}
                        {formatDate(row.last_used_at, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      <p>{t(row.is_active ? 'sessions.active' : 'sessions.inactive')}</p>
                    </div>
                    {row.is_active && (
                      <Button
                        variant="danger"
                        disabled={busy || uncertain || query.isFetching}
                        onClick={(event) => {
                          trigger.current = event.currentTarget;
                          setRestoreHeading(false);
                          setTarget(row.id);
                          setWriteError(null);
                          setNotice(false);
                        }}
                      >
                        {t('sessions.revoke')}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            !query.isError &&
            !query.isPaused && <DataState compact state="empty" title={t('sessions.empty')} />
          ))}
        <Modal
          open={target !== null && !denied}
          role="alertdialog"
          title={t('sessions.confirm')}
          description={t(target === 'all' ? 'sessions.allHint' : 'sessions.singleHint')}
          initialFocusRef={cancel}
          returnFocusRef={busy || restoreHeading || denied ? heading : trigger}
          showClose={!busy}
          closeOnBackdrop={!busy}
          onClose={() => {
            if (!lock.current) setTarget(null);
          }}
          footer={
            <>
              <Button ref={cancel} variant="ghost" onClick={() => setTarget(null)} disabled={busy}>
                {t('recovery.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={revoke}
                disabled={busy || uncertain || query.isFetching}
                loading={busy}
                aria-label={t('sessions.revoke')}
              >
                {t('sessions.revoke')}
              </Button>
            </>
          }
        >
          {busy && <DataState compact state="refreshing" title={t('sessions.pending')} />}
          {writeError && (
            <DataState
              compact
              state="error"
              title={t(uncertain ? 'sessions.uncertain' : 'sessions.failed')}
              referenceId={writeError.referenceId}
              action={retry}
            />
          )}
        </Modal>
      </section>
    </Card>
  );
}
