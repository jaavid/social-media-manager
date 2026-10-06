/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLink } from '@/core/navigation';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { workspacesAPI } from '@/services/domains/accounts';
import { apiError } from '@/services/http/errors';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';
import Card from '@/components/ui/Card';
export default function AdminOverview() {
  const { user } = useSession();
  const { t, formatNumber } = useLanguage();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['dashboard.workspaces', user?.id, search, page],
    retry: false,
    queryFn: async ({ signal }) => {
      const wire = (await workspacesAPI.list({ search, page }, signal)).data;
      const rows = Array.isArray(wire) ? wire : wire?.results;
      if (!Array.isArray(rows) || rows.some((row) => !Number.isSafeInteger(row?.id)))
        throw new Error('Invalid workspace list');
      if (
        !Array.isArray(wire) &&
        (!Number.isSafeInteger(wire.count) ||
          wire.count < 0 ||
          ![wire.next, wire.previous].every((value) => value === null || typeof value === 'string'))
      )
        throw new Error('Invalid pagination');
      return {
        rows,
        count: Array.isArray(wire) ? rows.length : wire.count,
        next: !!wire.next,
        previous: !!wire.previous,
      };
    },
  });
  const error = query.error && apiError(query.error);
  const data = error && [401, 403, 404].includes(error.status) ? null : query.data;
  return (
    <Page>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.workspaceDescription')}
        sticky={false}
      />
      <div className="my-4 flex flex-wrap gap-3">
        <Input
          label={t('dashboard.search')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Button disabled={query.isFetching} onClick={() => query.refetch()}>
          {t('analytics.report.refresh')}
        </Button>
      </div>
      {error && (
        <DataState
          state={data ? 'stale' : error.status === 403 ? 'forbidden' : 'error'}
          title={t('analytics.report.error')}
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
      {data && (
        <>
          <p role="status">
            {t('dashboard.workspacesCount', undefined, { count: formatNumber(data.count) })}
          </p>
          {query.isFetching && (
            <DataState state="refreshing" compact title={t('analytics.report.refreshing')} />
          )}
          {!data.rows.length && (
            <DataState
              state={search ? 'no-results' : 'empty'}
              title={t('dashboard.noWorkspaces')}
            />
          )}
          <div className="my-4 grid gap-4 md:grid-cols-2">
            {data.rows.map((workspace) => (
              <Card key={workspace.id}>
                <h2 className="mb-3 font-semibold">{workspace.company || workspace.name}</h2>
                <Button as={AppLink} to={`/admin/workspace/${workspace.id}`}>
                  {t('dashboard.openWorkspace')}
                </Button>
              </Card>
            ))}
          </div>
          <div className="flex gap-3">
            <Button disabled={!data.previous} onClick={() => setPage((n) => n - 1)}>
              {t('analytics.report.previous')}
            </Button>
            <Button disabled={!data.next} onClick={() => setPage((n) => n + 1)}>
              {t('analytics.report.next')}
            </Button>
          </div>
        </>
      )}
    </Page>
  );
}
