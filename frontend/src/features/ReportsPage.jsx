/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/* Reports: existing Collection page pattern, with scoped server-backed results. */
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { useWorkspaces } from '@/hooks/useData';
import { sharedReportsAPI, roiAPI } from '@/services/domains/reporting';
import { apiError } from '@/services/http/errors';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import NativeSelect from '@/components/ui/NativeSelect';
import DataState from '@/components/ui/DataState';
import Modal from '@/components/ui/Modal';
import ShareReportModal from '@/components/ui/ShareReportModal';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';

function parseRows(wire, kind, workspace) {
  const rows = Array.isArray(wire) ? wire : wire?.results;
  if (!Array.isArray(rows) || rows.some((row) => !row || !Number.isSafeInteger(row.id)))
    throw new Error('Invalid report list');
  const validDate = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value));
  if (
    rows.some(
      (row) =>
        row.client !== workspace ||
        (kind === 'shared'
          ? !validDate(row.date_from) ||
            !validDate(row.date_until) ||
            row.date_from > row.date_until ||
            typeof row.is_active !== 'boolean' ||
            typeof row.is_expired !== 'boolean' ||
            typeof row.token !== 'string' ||
            !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(row.token)
          : !Number.isSafeInteger(row.year) ||
            !Number.isSafeInteger(row.month) ||
            row.month < 1 ||
            row.month > 12),
    )
  )
    throw new Error('Invalid scoped report');
  return rows;
}
export default function ReportsPage() {
  const { user } = useSession();
  const { t } = useLanguage();
  const { workspaces, error, refetch } = useWorkspaces();
  const [chosen, setChosen] = useState('');
  const [tab, setTab] = useState('shared');
  const workspace = Number(user?.workspace_id || user?.client_id || chosen) || null;
  return (
    <Page>
      <PageHeader title={t('reports.title')} subtitle={t('reports.description')} sticky={false} />
      {!user?.workspace_id && !user?.client_id && (
        <NativeSelect
          label={t('analytics.report.workspace')}
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
        >
          <option value="">{t('analytics.report.workspace')}</option>
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.company || w.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {error && (
        <DataState
          state="error"
          title={t('analytics.report.error')}
          action={<Button onClick={refetch}>{t('analytics.report.retry')}</Button>}
        />
      )}
      <SegmentedTabs
        items={[
          { id: 'shared', label: t('reports.shared') },
          { id: 'roi', label: t('reports.roi') },
        ]}
        active={tab}
        onChange={setTab}
      />
      {workspace && (
        <ReportCollection
          key={`${user?.id}:${workspace}:${tab}`}
          workspace={workspace}
          kind={tab}
        />
      )}
    </Page>
  );
}
function ReportCollection({ workspace, kind }) {
  const { user } = useSession();
  const { t, formatDate, formatNumber } = useLanguage();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState(null);
  const cancelRef = useRef(null);
  const busy = useRef(false);
  const current = useRef(true);
  useEffect(() => {
    current.current = true;
    return () => {
      current.current = false;
    };
  }, []);
  const query = useQuery({
    queryKey: ['reports.collection', user?.id, workspace, kind, year],
    retry: false,
    queryFn: async ({ signal }) =>
      parseRows(
        (
          await (kind === 'shared'
            ? sharedReportsAPI.list({ client: workspace }, signal)
            : roiAPI.getReports({ client_id: workspace, year }, signal))
        ).data,
        kind,
        workspace,
      ),
  });
  const error = query.error && apiError(query.error);
  const denied = error && [401, 403, 404].includes(error.status);
  const data = denied ? undefined : query.data;
  const rows = (data || []).filter(
    (row) => kind !== 'roi' || !month || row.month === Number(month),
  );
  async function deactivate() {
    if (busy.current || !confirm) return;
    busy.current = true;
    setPending(true);
    setActionError(null);
    try {
      const response = await sharedReportsAPI.delete(confirm.id);
      if (response.status !== 204) throw new Error('Invalid deactivation response');
      if (current.current) {
        setConfirm(null);
        query.refetch();
      }
    } catch (failure) {
      if (current.current) setActionError(failure);
    } finally {
      busy.current = false;
      if (current.current) setPending(false);
    }
  }
  const number = (value) =>
    value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
      ? '—'
      : formatNumber(Number(value));
  return (
    <>
      <div className="my-4 flex flex-wrap gap-3">
        <Button onClick={() => query.refetch()} disabled={query.isFetching}>
          {t('analytics.report.refresh')}
        </Button>
        {kind === 'roi' && <p role="status">{t('reports.legacyEstimate')}</p>}
        {kind === 'shared' ? (
          <Button onClick={() => setShareOpen(true)}>{t('reports.create')}</Button>
        ) : (
          <>
            <NativeSelect
              label={t('reports.year')}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>
                  {formatNumber(y)}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              label={t('reports.month')}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">{t('reports.allMonths')}</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {formatDate(new Date(year, m - 1, 15), { month: 'long' })}
                </option>
              ))}
            </NativeSelect>
          </>
        )}
      </div>
      {error && (
        <DataState
          state={
            data
              ? 'stale'
              : error.status === 403
                ? 'forbidden'
                : error.status === 404
                  ? 'not-found'
                  : navigator.onLine
                    ? 'error'
                    : 'offline'
          }
          title={t('analytics.report.error')}
          description={data ? t('catalog.state.stale.description') : undefined}
          referenceId={error.referenceId}
          action={<Button onClick={() => query.refetch()}>{t('analytics.report.retry')}</Button>}
        />
      )}
      {query.fetchStatus === 'paused' && (
        <DataState state="offline" title={t('catalog.state.offline.title')} />
      )}
      {!data && query.isPending && query.fetchStatus !== 'paused' && (
        <DataState state="loading" title={t('engagement.loading')} />
      )}
      {data && query.isFetching && (
        <DataState state="refreshing" title={t('analytics.report.refreshing')} compact />
      )}
      {data && !rows.length && (
        <DataState state={data.length ? 'no-results' : 'empty'} title={t('reports.empty')} />
      )}
      {!!rows.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reports.period')}</TableHead>
              <TableHead>{t(kind === 'shared' ? 'reports.status' : 'reports.roi')}</TableHead>
              <TableHead>
                {t(kind === 'shared' ? 'reports.actions' : 'reports.investment')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  {kind === 'shared' ? (
                    <>
                      {formatDate(row.date_from, { dateStyle: 'short' })} –{' '}
                      {formatDate(row.date_until, { dateStyle: 'short' })}
                    </>
                  ) : (
                    <>
                      {formatNumber(row.year)} / {formatNumber(row.month)}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  {kind === 'shared'
                    ? t(row.is_active && !row.is_expired ? 'reports.active' : 'reports.inactive')
                    : number(row.roi_percentage)}
                </TableCell>
                <TableCell>
                  {kind === 'shared' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={!row.is_active || row.is_expired}
                        onClick={() => {
                          const url = new URL(
                            `/report/${encodeURIComponent(row.token)}`,
                            window.location.origin,
                          );
                          window.open(url.href, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        {t('reports.open')}
                      </Button>
                      <Button
                        variant="danger"
                        disabled={!row.is_active}
                        onClick={() => {
                          setConfirm(row);
                          setActionError(null);
                        }}
                      >
                        {t('reports.deactivate')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {number(row.total_investment)} · {t('reports.currencyUnknown')}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {shareOpen && (
        <ShareReportModal
          clientId={workspace}
          onClose={() => {
            setShareOpen(false);
            query.refetch();
          }}
        />
      )}
      <Modal
        role="alertdialog"
        initialFocusRef={cancelRef}
        open={!!confirm}
        title={t('reports.deactivate')}
        description={t('reports.confirm')}
        onClose={() => {
          if (!pending) setConfirm(null);
        }}
        footer={
          <>
            <Button ref={cancelRef} disabled={pending} onClick={() => setConfirm(null)}>
              {t('reports.cancel')}
            </Button>
            <Button variant="danger" disabled={pending} onClick={deactivate}>
              {t('reports.deactivate')}
            </Button>
          </>
        }
      >
        {actionError && (
          <DataState
            state="error"
            compact
            title={t('analytics.report.error')}
            referenceId={apiError(actionError).referenceId}
          />
        )}
      </Modal>
    </>
  );
}
