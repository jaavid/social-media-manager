/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState } from 'react';
import { useSyncLogs } from '@/hooks/useData';
import { useLanguage } from '@/i18n';
import { apiError } from '@/services/http/errors';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import DataState from '@/components/ui/DataState';
import NativeSelect from '@/components/ui/NativeSelect';
import Skeleton from '@/components/ui/Skeleton';

export default function SyncLogsPage() {
  const { t, formatDate, formatNumber } = useLanguage();
  const { logs, hasData, loading, refreshing, error, offline, refetch } = useSyncLogs(null);
  const [platform, setPlatform] = useState('all');
  const [status, setStatus] = useState('all');
  const [workspace, setWorkspace] = useState('');
  const failure = apiError(error);
  const denied = [401, 403, 404].includes(failure.status);
  const filtered = logs.filter(
    (row) =>
      (platform === 'all' || row.platform === platform) &&
      (status === 'all' || row.status === status) &&
      (!workspace || row.client_name === workspace),
  );
  const clear = () => {
    setPlatform('all');
    setStatus('all');
    setWorkspace('');
  };
  const retry = (
    <Button onClick={() => refetch()} disabled={refreshing}>
      {t('recovery.retry')}
    </Button>
  );
  const state = denied
    ? failure.status === 404
      ? 'not-found'
      : 'forbidden'
    : offline
      ? 'offline'
      : error
        ? hasData
          ? 'stale'
          : 'error'
        : loading
          ? 'loading'
          : refreshing
            ? 'refreshing'
            : null;
  return (
    <section className="app-page app-page--wide space-y-4" aria-label={t('syncLogs.title')}>
      <PageHeader
        title={t('syncLogs.title')}
        subtitle={t('syncLogs.description')}
        actions={
          <Button onClick={() => refetch()} disabled={refreshing}>
            {t('recovery.refresh')}
          </Button>
        }
      />
      <div className="app-surface app-surface--compact flex flex-wrap gap-3">
        <NativeSelect
          label={t('syncLogs.workspace')}
          value={workspace}
          onChange={(e) => setWorkspace(e.target.value)}
        >
          <option value="">{t('recovery.all')}</option>
          {[...new Set(logs.map((row) => row.client_name).filter(Boolean))].sort().map((name) => (
            <option key={name}>{name}</option>
          ))}
        </NativeSelect>
        <NativeSelect
          label={t('syncLogs.platform')}
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="all">{t('recovery.all')}</option>
          {[...new Set(logs.map((row) => row.platform))].sort().map((name) => (
            <option key={name}>{name}</option>
          ))}
        </NativeSelect>
        <NativeSelect
          label={t('syncLogs.status')}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {['all', 'success', 'failed', 'running', 'pending'].map((name) => (
            <option key={name} value={name}>
              {t(name === 'all' ? 'recovery.all' : `syncLogs.${name}`)}
            </option>
          ))}
        </NativeSelect>
        <Button variant="ghost" onClick={clear}>
          {t('recovery.clearFilters')}
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
                    : offline
                      ? 'recovery.offline'
                      : error
                        ? hasData
                          ? 'recovery.stale'
                          : 'recovery.failed'
                        : refreshing
                          ? 'recovery.refreshing'
                          : 'recovery.loading',
          )}
          action={state !== 'loading' && state !== 'refreshing' ? retry : undefined}
        />
      )}
      {loading && !hasData && !error && !offline && (
        <div aria-hidden="true" className="space-y-3">
          <Skeleton height={40} />
          <Skeleton height={180} />
        </div>
      )}
      {hasData &&
        !denied &&
        (filtered.length ? (
          <div className="app-surface overflow-x-auto" aria-busy={refreshing || undefined}>
            <table className="w-full text-start text-sm">
              <caption className="sr-only">{t('syncLogs.title')}</caption>
              <thead>
                <tr>
                  {['workspace', 'platform', 'status', 'records', 'started', 'duration'].map(
                    (key) => (
                      <th className="p-3 text-start" scope="col" key={key}>
                        {t(`syncLogs.${key}`)}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="p-3">{row.client_name}</td>
                    <td className="p-3">
                      <bdi>{row.platform}</bdi>
                    </td>
                    <td className="p-3">{t(`syncLogs.${row.status}`)}</td>
                    <td className="p-3">{formatNumber(row.records_synced)}</td>
                    <td className="p-3">
                      {formatDate(row.started_at, { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="p-3">
                      {row.duration_seconds === null
                        ? t('recovery.unknown')
                        : t('syncLogs.seconds', { count: row.duration_seconds })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !error &&
          !offline && (
            <DataState
              compact
              state={logs.length ? 'no-results' : 'empty'}
              title={t(logs.length ? 'recovery.noResults' : 'syncLogs.empty')}
              action={
                logs.length ? (
                  <Button onClick={clear}>{t('recovery.clearFilters')}</Button>
                ) : undefined
              }
            />
          )
        ))}
    </section>
  );
}
