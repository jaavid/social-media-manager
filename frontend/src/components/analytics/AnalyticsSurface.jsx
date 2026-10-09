/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealtime } from '@/hooks/useRealtime';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import useWorkspaceScope, { workspaceEventMatches } from '@/hooks/useWorkspaceScope';
import { useAppStore } from '@/stores/appStore';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { connectionsAPI } from '@/services/domains/connections';
import { workspacesAPI } from '@/services/domains/accounts';
import { analyticsReports } from '@/services/domains/analytics-reports';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import NativeSelect from '@/components/ui/NativeSelect';
import Card from '@/components/ui/Card';
import DataState from '@/components/ui/DataState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';

export default function AnalyticsSurface({ workspaceId: explicitWorkspace }) {
  const { user } = useSession();
  const { t } = useLanguage();
  const scope = useWorkspaceScope();
  const chosen = scope.workspaceId ?? '';
  const setChosen = id => useAppStore.getState().selectWorkspace(id, user.id, scope.pathname);
  const workspaceId =
    scope.workspaceId;
  const workspaces = useQuery({
    queryKey: ['analytics.workspaces', user?.id],
    enabled: !explicitWorkspace && !user?.workspace_id && !user?.client_id,
    queryFn: async () => {
      const response = await workspacesAPI.list();
      const rows = response.data?.results || response.data;
      if (!Array.isArray(rows)) throw new Error('Invalid workspaces');
      return rows;
    },
    retry: false,
  });
  return (
    <Page>
      <PageHeader
        title={t('analytics.report.title')}
        subtitle={t('analytics.report.description')}
        sticky={false}
      />
      {!explicitWorkspace && !user?.workspace_id && !user?.client_id && (
        <NativeSelect
          label={t('analytics.report.workspace')}
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
        >
          <option value="">{t('analytics.report.workspace')}</option>
          {(workspaces.data || []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name || w.company}
            </option>
          ))}
        </NativeSelect>
      )}
      {workspaces.error && (
        <ReportFailure error={workspaces.error} retry={() => workspaces.refetch()} />
      )}
      {workspaceId && (
        <WorkspaceAnalytics key={`${user?.id}:${workspaceId}`} workspaceId={workspaceId} />
      )}
    </Page>
  );
}
function ReportFailure({ error, retry, preserved = false }) {
  const { t } = useLanguage();
  const normalized = apiError(error);
  const denied = ['authentication', 'permission'].includes(normalized.kind);
  return (
    <DataState
      state={
        preserved && !denied
          ? 'stale'
          : denied
            ? 'forbidden'
            : normalized.status === 404
              ? 'not-found'
              : typeof navigator !== 'undefined' && !navigator.onLine
                ? 'offline'
                : 'error'
      }
      title={t(denied ? 'analytics.report.forbidden' : 'analytics.report.error')}
      referenceId={normalized.referenceId}
      description={preserved ? t('catalog.state.stale.description') : undefined}
      action={<Button onClick={retry}>{t('analytics.report.retry')}</Button>}
    />
  );
}
function WorkspaceAnalytics({ workspaceId }) {
  const { user } = useSession();
  const { t, language } = useLanguage();
  const [accountId, setAccount] = useState('');
  const untilDefault = new Date().toISOString().slice(0, 10);
  const [since, setSince] = useState(() =>
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [until, setUntil] = useState(untilDefault);
  const [page, setPage] = useState(1);
  const metadata = useQuery({
    queryKey: [...QK.connections(workspaceId), user?.id],
    queryFn: ({ signal }) => connectionsAPI.get(workspaceId, signal),
    retry: false,
  });
  const accounts = useMemo(
    () =>
      (metadata.data?.providers || []).flatMap((provider) =>
        provider.accounts
          .filter(
            (account) =>
              account.permissions.view_analytics === true &&
              ['supported', 'beta'].includes(provider.capabilities.analytics),
          )
          .map((account) => ({ provider, account })),
      ),
    [metadata.data],
  );
  const selected = accounts.find((item) => String(item.account.id) === accountId);
  const validRange =
    /^\d{4}-\d{2}-\d{2}$/.test(since) && /^\d{4}-\d{2}-\d{2}$/.test(until) && since <= until;
  const filters = { social_account: Number(accountId), since, until, page };
  const identity = `${user?.id}:${workspaceId}:${accountId}:${since}:${until}:${page}`;
  if (metadata.isPending)
    return (
      <DataState
        state={metadata.fetchStatus === 'paused' ? 'offline' : 'loading'}
        title={t(
          metadata.fetchStatus === 'paused' ? 'catalog.state.offline.title' : 'engagement.loading',
        )}
      />
    );
  if (
    metadata.error &&
    (!metadata.data || ['authentication', 'permission'].includes(apiError(metadata.error).kind))
  )
    return <ReportFailure error={metadata.error} retry={() => metadata.refetch()} />;
  return (
    <>
      {metadata.error && (
        <ReportFailure error={metadata.error} retry={() => metadata.refetch()} preserved />
      )}
      <div className="my-4 grid gap-3 sm:grid-cols-3">
        <NativeSelect
          label={t('analytics.report.account')}
          value={selected ? accountId : ''}
          onChange={(e) => {
            setAccount(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{t('analytics.report.account')}</option>
          {accounts.map(({ account, provider }) => (
            <option key={account.id} value={account.id}>
              {provider.titles[language]} · {account.name} · {account.destination.id}
            </option>
          ))}
        </NativeSelect>
        <Input
          type="date"
          label={t('analytics.report.since')}
          value={since}
          onChange={(e) => {
            setSince(e.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          label={t('analytics.report.until')}
          value={until}
          onChange={(e) => {
            setUntil(e.target.value);
            setPage(1);
          }}
        />
      </div>
      {!validRange ? (
        <DataState state="error" title={t('analytics.report.rangeInvalid')} />
      ) : !selected ? (
        <DataState
          state="empty"
          title={t(accounts.length ? 'analytics.report.account' : 'analytics.report.unavailable')}
        />
      ) : (
        <AccountReport
          key={identity}
          workspaceId={workspaceId}
          selected={selected}
          filters={filters}
          setPage={setPage}
          metadataCurrent={!metadata.error}
        />
      )}
    </>
  );
}
function AccountReport({ workspaceId, selected, filters, setPage, metadataCurrent }) {
  const { t, language, formatNumber, formatDate } = useLanguage();
  const { user } = useSession();
  const report = useQuery({
    queryKey: ['analytics.report', user?.id, workspaceId, filters],
    queryFn: ({ signal }) => analyticsReports.get(workspaceId, filters, signal),
    retry: false,
  });
  const [metricKey, setMetric] = useState('');
  const [operation, setOperation] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const busy = useRef(false);
  const feedbackRef = useRef(null);
  const currentScope = useRef(true);
  useEffect(() => {
    currentScope.current = true;
    return () => {
      currentScope.current = false;
    };
  }, []);
  useEffect(() => {
    if (feedback === 'syncFailed') feedbackRef.current?.focus();
  }, [feedback]);
  // Each filter selection remounts this boundary; obsolete mutations cannot update it.
  const scope = `${workspaceId}:${filters.social_account}:${filters.since}:${filters.until}:${filters.page}`;
  const liveScope = useRef(scope);
  useRealtime((event) => {
    if (
      workspaceEventMatches(event, workspaceId) &&
      ['analytics.synced', 'credential.token_expired'].includes(event.type) &&
      (!event.data?.social_account_id || event.data.social_account_id === selected.account.id)
    )
      report.refetch();
  });
  const { refetch: refetchReport, error: reportError } = report;
  useEffect(() => {
    if (feedback !== 'queued' || [401, 403, 404, 429].includes(apiError(reportError).status))
      return;
    const interval = setInterval(() => refetchReport(), 3000);
    const stop = setTimeout(() => clearInterval(interval), 60000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [feedback, refetchReport, reportError]);
  const data = report.data;
  const descriptor = data?.metrics.find((m) => m.key === metricKey) || data?.metrics[0];
  const canSync =
    metadataCurrent &&
    selected.account.health.ready &&
    selected.provider.contract.analytics?.sync_available === true &&
    selected.provider.contract.analytics.metrics.length > 0;
  async function perform(name) {
    if (busy.current || !metadataCurrent) return;
    const activeScope = liveScope.current;
    busy.current = true;
    setOperation(name);
    setFeedback(null);
    try {
      if (name === 'sync') {
        const response = await workspacesAPI.triggerSync(
          workspaceId,
          [selected.provider.key],
          [selected.account.id],
        );
        if (!response.data?.queued?.some((q) => q.social_account_id === selected.account.id))
          throw new Error('Sync was not queued');
        if (liveScope.current === activeScope && currentScope.current) {
          setFeedback('queued');
          report.refetch();
        }
      } else {
        const blob = await analyticsReports.export(workspaceId, filters);
        if (liveScope.current !== activeScope || !currentScope.current) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analytics.csv';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      if (liveScope.current === activeScope && currentScope.current) {
        setFeedback('syncFailed');
      }
    } finally {
      busy.current = false;
      if (liveScope.current === activeScope && currentScope.current) setOperation(null);
    }
  }
  if (
    report.error &&
    (!data ||
      ['authentication', 'permission'].includes(apiError(report.error).kind) ||
      apiError(report.error).status === 404)
  )
    return <ReportFailure error={report.error} retry={() => report.refetch()} />;
  if (!data)
    return (
      <DataState
        state={report.fetchStatus === 'paused' ? 'offline' : 'loading'}
        title={t(
          report.fetchStatus === 'paused' ? 'catalog.state.offline.title' : 'engagement.loading',
        )}
      />
    );
  return (
    <>
      {report.fetchStatus === 'paused' && (
        <DataState state="offline" compact title={t('catalog.state.offline.title')} />
      )}
      {report.error && (
        <ReportFailure error={report.error} retry={() => report.refetch()} preserved />
      )}
      {report.isFetching && (
        <DataState state="refreshing" title={t('analytics.report.refreshing')} compact />
      )}
      <div className="my-3 flex flex-wrap gap-3">
        <Button disabled={!!operation || report.isFetching} onClick={() => report.refetch()}>
          {t('analytics.report.refresh')}
        </Button>
        <Button disabled={!canSync || !!operation} onClick={() => perform('sync')}>
          {t('analytics.report.sync')}
        </Button>
        <Button
          disabled={
            selected.account.permissions.export_data !== true ||
            !!operation ||
            !metadataCurrent ||
            data.availability !== 'available'
          }
          onClick={() => perform('export')}
        >
          {t('analytics.report.export')}
        </Button>
      </div>
      {!canSync && <p role="status">{t('analytics.report.notReady')}</p>}
      {feedback && (
        <p ref={feedbackRef} tabIndex={-1} role={feedback === 'syncFailed' ? 'alert' : 'status'}>
          {t(`analytics.report.${feedback}`)}
        </p>
      )}
      <Card className="my-4">
        <p role="status">
          {t(
            `analytics.report.${['fresh', 'stale', 'failure', 'pending'].includes(data.sync.state) ? data.sync.state : 'syncUnknown'}`,
          )}
        </p>
        <p>
          {t('analytics.report.lastSuccess', undefined, {
            time: data.sync.last_success_at
              ? formatDate(data.sync.last_success_at, { dateStyle: 'medium', timeStyle: 'short' })
              : t('analytics.report.never'),
          })}
        </p>
        <p>
          {t('analytics.report.freshness', undefined, {
            seconds: formatNumber(data.sync.stale_after_seconds),
          })}
        </p>
      </Card>
      {data.availability === 'unavailable' ? (
        <DataState state="unavailable" title={t('analytics.report.unavailable')} />
      ) : (
        <>
          {data.rows.some((row) => row.state === 'unknown') && (
            <DataState state="partial" title={t('analytics.report.unknown')} compact />
          )}
          {data.rows.some((row) => row.state === 'partial') && (
            <DataState state="partial" title={t('analytics.report.partial')} compact />
          )}
          {!data.rows.length && (
            <DataState
              state={data.dataset_count ? 'no-results' : 'empty'}
              title={t('analytics.report.empty')}
            />
          )}
          {descriptor && data.rows.some((row) => row.values[descriptor.key] !== null) && (
            <Card>
              <NativeSelect
                label={t('analytics.report.metric')}
                value={descriptor.key}
                onChange={(e) => setMetric(e.target.value)}
              >
                {data.metrics.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m[`title_${language}`]} · {t(`analytics.report.${m.unit}`)} ·{' '}
                    {t(`analytics.report.${m.period}`)}
                  </option>
                ))}
              </NativeSelect>
              <figure aria-label={descriptor[`title_${language}`]} className="mt-4 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.rows.map((row) => ({
                      date: row.date,
                      value: row.values[descriptor.key],
                    }))}
                  >
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        formatDate(value, { month: 'short', day: 'numeric' })
                      }
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="linear"
                      dataKey="value"
                      name={descriptor[`title_${language}`]}
                      stroke="var(--chart-1)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </figure>
            </Card>
          )}
          <p className="my-3 text-sm">{t('analytics.report.zero')}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('analytics.report.date')}</TableHead>
                <TableHead>{t('analytics.report.state')}</TableHead>
                {data.metrics.map((m) => (
                  <TableHead key={m.key}>
                    {m[`title_${language}`]} ({t(`analytics.report.${m.unit}`)} /{' '}
                    {t(`analytics.report.${m.period}`)})
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <bdi>{formatDate(row.date, { dateStyle: 'short' })}</bdi>
                  </TableCell>
                  <TableCell>{t(`analytics.report.${row.state}`)}</TableCell>
                  {data.metrics.map((m) => (
                    <TableCell key={m.key}>
                      {row.values[m.key] === null ? '—' : formatNumber(row.values[m.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="my-4 flex gap-3">
            <Button disabled={!data.pagination.has_previous} onClick={() => setPage((n) => n - 1)}>
              {t('analytics.report.previous')}
            </Button>
            <Button disabled={!data.pagination.has_next} onClick={() => setPage((n) => n + 1)}>
              {t('analytics.report.next')}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
