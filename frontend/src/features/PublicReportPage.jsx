import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppParams } from '@/core/navigation';
import { useLanguage } from '@/i18n';
import { publicReportAPI } from '@/services/domains/reporting';
import { parseReport } from '@/services/domains/analytics-reports';
import { apiError } from '@/services/http/errors';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';
import Card from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
function parseShared(wire) {
  if (
    !wire ||
    wire.version !== 2 ||
    !['available', 'unavailable'].includes(wire.availability) ||
    typeof wire.client?.name !== 'string' ||
    !Array.isArray(wire.reports) ||
    typeof wire.period?.from !== 'string' ||
    typeof wire.period?.until !== 'string'
  )
    throw new Error('Invalid shared report');
  const reports = wire.reports.map((report) =>
    parseReport(report, report.workspace_id, {
      social_account: report.account_id,
      since: wire.period.from,
      until: wire.period.until,
      page: 1,
    }),
  );
  if (wire.availability === 'unavailable' && reports.length)
    throw new Error('Invalid unavailable report');
  return { ...wire, reports };
}
export default function PublicReportPage() {
  const { token } = useAppParams();
  return <SharedReport key={token} token={token} />;
}
function SharedReport({ token }) {
  const { t, language, formatDate, formatNumber } = useLanguage();
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(null);
  const [unlocked, setUnlocked] = useState(null);
  const busy = useRef(false);
  const current = useRef(true);
  const failureRef = useRef(null);
  useEffect(() => {
    current.current = true;
    return () => {
      current.current = false;
    };
  }, []);
  useEffect(() => {
    if (failure) failureRef.current?.focus();
  }, [failure]);
  const query = useQuery({
    queryKey: ['public.report', token],
    retry: false,
    queryFn: async ({ signal }) => {
      const wire = (await publicReportAPI.get(token, signal)).data;
      if (wire?.requires_password === true && typeof wire.client_name === 'string') return wire;
      return parseShared(wire);
    },
  });
  async function unlock(event) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFailure(null);
    try {
      const wire = parseShared((await publicReportAPI.verify(token, password)).data);
      if (current.current) setUnlocked(wire);
    } catch (error) {
      if (current.current) setFailure(error);
    } finally {
      busy.current = false;
      if (current.current) setPending(false);
    }
  }
  // Never retain an unlocked payload across an explicit refresh or access revalidation.
  async function refresh() {
    setUnlocked(null);
    setPassword('');
    setFailure(null);
    await query.refetch();
  }
  const error = query.error && apiError(query.error);
  const denied = error && [401, 403, 404, 410].includes(error.status);
  const data = denied ? null : unlocked || (query.data?.version === 2 ? query.data : null);
  return (
    <Page>
      <PageHeader
        title={data?.client.name || query.data?.client_name || t('reports.title')}
        subtitle={t('analytics.report.description')}
        sticky={false}
      />
      {query.fetchStatus === 'paused' && (
        <DataState state="offline" title={t('catalog.state.offline.title')} />
      )}
      {query.isPending && query.fetchStatus !== 'paused' && (
        <DataState state="loading" title={t('engagement.loading')} />
      )}
      {query.error && (
        <DataState
          state={
            data
              ? 'stale'
              : error.status === 404 || error.status === 410
                ? 'not-found'
                : error.status === 403
                  ? 'forbidden'
                  : 'error'
          }
          title={t('analytics.report.error')}
          referenceId={error.referenceId}
          action={<Button onClick={() => query.refetch()}>{t('analytics.report.retry')}</Button>}
        />
      )}
      {!data && !query.error && query.data?.requires_password && (
        <form onSubmit={unlock} className="my-4 max-w-md space-y-3">
          <Input
            type="password"
            required
            autoComplete="current-password"
            label={t('reports.unlockPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={pending}>
            {t('reports.open')}
          </Button>
          {failure && (
            <DataState
              focusRef={failureRef}
              state="error"
              compact
              title={t('analytics.report.error')}
              referenceId={apiError(failure).referenceId}
            />
          )}
        </form>
      )}
      {data?.availability === 'unavailable' && (
        <DataState state="unavailable" title={t('reports.unavailableScope')} />
      )}
      {data?.availability === 'available' && (
        <>
          <p className="my-4">
            <bdi>
              {formatDate(data.period.from, { dateStyle: 'short' })} –{' '}
              {formatDate(data.period.until, { dateStyle: 'short' })}
            </bdi>
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.print()}>{t('reports.print')}</Button>
            <Button onClick={refresh}>{t('analytics.report.refresh')}</Button>
          </div>
          {data.reports.map((report) => (
            <Card key={`${report.provider}:${report.account_id}`} className="my-4">
              <h2 className="mb-3 font-semibold">
                <bdi>
                  {report.provider} · {formatNumber(report.account_id)}
                </bdi>
              </h2>
              <p role="status">
                {t(
                  `analytics.report.${['fresh', 'stale', 'failure', 'pending'].includes(report.sync.state) ? report.sync.state : 'syncUnknown'}`,
                )}
              </p>
              <p>
                {t('analytics.report.lastSuccess', undefined, {
                  time: report.sync.last_success_at
                    ? formatDate(report.sync.last_success_at, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : t('analytics.report.never'),
                })}
              </p>
              {report.availability === 'unavailable' ? (
                <DataState state="unavailable" title={t('analytics.report.unavailable')} />
              ) : !report.rows.length ? (
                <DataState
                  state={report.dataset_count ? 'no-results' : 'empty'}
                  title={t('analytics.report.empty')}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('analytics.report.date')}</TableHead>
                      <TableHead>{t('analytics.report.state')}</TableHead>
                      {report.metrics.map((metric) => (
                        <TableHead key={metric.key}>
                          {metric[`title_${language}`]} ({t(`analytics.report.${metric.unit}`)} /{' '}
                          {t(`analytics.report.${metric.period}`)})
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDate(row.date, { dateStyle: 'short' })}</TableCell>
                        <TableCell>{t(`analytics.report.${row.state}`)}</TableCell>
                        {report.metrics.map((metric) => (
                          <TableCell key={metric.key}>
                            {row.values[metric.key] === null
                              ? '—'
                              : formatNumber(row.values[metric.key])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
