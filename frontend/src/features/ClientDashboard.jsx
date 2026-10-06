/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/* Existing Dashboard pattern. Provider metrics live in the scoped Analytics surface. */
import { useAppSearchParams } from '@/core/navigation';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { useDateRange, usePosts } from '@/hooks/useData';
import { apiError } from '@/services/http/errors';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';
import SegmentedTabs from '@/components/ui/SegmentedTabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import AnalyticsPage from '@/components/analytics/AnalyticsSurface';
import CalendarPage from './CalendarPage';
import ROICalculatorPage from './ROICalculatorPage';
const tabs = ['overview', 'analytics', 'posts', 'calendar', 'roi'];
export default function ClientDashboard({ clientId: explicitWorkspace }) {
  const { user } = useSession();
  const { t } = useLanguage();
  const workspace = Number(explicitWorkspace || user?.workspace_id || user?.client_id);
  const [search, setSearch] = useAppSearchParams();
  const requested = search.get('tab');
  const tab = tabs.includes(requested) ? requested : 'overview';
  function changeTab(id) {
    const next = new URLSearchParams(search);
    if (id === 'overview') next.delete('tab');
    else next.set('tab', id);
    setSearch(next, { replace: true });
  }
  return (
    <Page>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.description')}
        sticky={false}
      />
      <SegmentedTabs
        items={tabs.map((id) => ({ id, label: t(`dashboard.${id}`) }))}
        active={tab}
        onChange={changeTab}
      />
      {workspace && (
        <div key={`${user?.id}:${workspace}:${tab}`}>
          {tab === 'overview' && <ActivityOverview workspace={workspace} />}
          {tab === 'analytics' && <AnalyticsPage workspaceId={workspace} />}
          {tab === 'posts' && <PostCollection workspace={workspace} />}
          {tab === 'calendar' && <CalendarPage clientId={workspace} />}
          {tab === 'roi' && <ROICalculatorPage clientId={workspace} />}
        </div>
      )}
    </Page>
  );
}
function ActivityOverview({ workspace }) {
  const { t, formatNumber, formatDate } = useLanguage();
  const [range, setRange] = useDateRange(30);
  const query = usePosts(workspace, 'all', range);
  const error = query.error && apiError(query.error);
  return (
    <>
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        <Input
          type="date"
          label={t('analytics.report.since')}
          value={range.since}
          onChange={(e) => setRange((prev) => ({ ...prev, since: e.target.value }))}
        />
        <Input
          type="date"
          label={t('analytics.report.until')}
          value={range.until}
          onChange={(e) => setRange((prev) => ({ ...prev, until: e.target.value }))}
        />
      </div>
      <Button disabled={query.refreshing} onClick={query.refetch}>
        {t('analytics.report.refresh')}
      </Button>
      {error && (
        <DataState
          state={
            query.total !== null
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
          referenceId={error.referenceId}
          action={<Button onClick={query.refetch}>{t('analytics.report.retry')}</Button>}
        />
      )}
      {query.offline && <DataState state="offline" title={t('catalog.state.offline.title')} />}
      {query.loading && !query.offline && (
        <DataState state="loading" title={t('engagement.loading')} />
      )}
      {query.total !== null && (
        <>
          <Card className="my-4">
            <h2>{t('dashboard.publishedRange')}</h2>
            <p className="mt-2 text-2xl font-semibold">{formatNumber(query.total)}</p>
          </Card>
          {query.refreshing && (
            <DataState state="refreshing" compact title={t('analytics.report.refreshing')} />
          )}
          <h2 className="my-3 font-semibold">{t('dashboard.activity')}</h2>
          {!query.posts.length && (
            <DataState
              state={query.datasetCount === 0 ? 'empty' : 'no-results'}
              title={t('dashboard.noPosts')}
            />
          )}
          <ul className="space-y-3">
            {query.posts.slice(0, 10).map((post) => (
              <li key={post.id} className="rounded-lg border border-border p-3">
                <p>{post.caption || post.post_type}</p>
                <bdi>
                  {post.platform} · {post.social_account}
                </bdi>
                {post.published_at && (
                  <p>{formatDate(post.published_at, { dateStyle: 'short', timeStyle: 'short' })}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
function PostCollection({ workspace }) {
  const { t, formatDate } = useLanguage();
  const [range, setRange] = useDateRange(30);
  const query = usePosts(workspace, 'all', range);
  const error = query.error && apiError(query.error);
  return (
    <>
      <div className="my-4 grid gap-3 sm:grid-cols-2">
        <Input
          type="date"
          label={t('analytics.report.since')}
          value={range.since}
          onChange={(e) => setRange((prev) => ({ ...prev, since: e.target.value }))}
        />
        <Input
          type="date"
          label={t('analytics.report.until')}
          value={range.until}
          onChange={(e) => setRange((prev) => ({ ...prev, until: e.target.value }))}
        />
      </div>
      {error && (
        <DataState
          state={
            query.posts.length
              ? 'stale'
              : error.status === 403
                ? 'forbidden'
                : error.status === 404
                  ? 'not-found'
                  : 'error'
          }
          title={t('analytics.report.error')}
          referenceId={error.referenceId}
          action={<Button onClick={query.refetch}>{t('analytics.report.retry')}</Button>}
        />
      )}
      {query.offline && <DataState state="offline" title={t('catalog.state.offline.title')} />}
      {query.loading && !query.offline && (
        <DataState state="loading" title={t('engagement.loading')} />
      )}
      {!query.loading && !query.offline && !query.error && !query.posts.length && (
        <DataState
          state={query.datasetCount === 0 ? 'empty' : 'no-results'}
          title={t('dashboard.noPosts')}
        />
      )}
      {!!query.posts.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('dashboard.posts')}</TableHead>
              <TableHead>{t('analytics.report.account')}</TableHead>
              <TableHead>{t('analytics.report.date')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>{post.caption || post.post_type}</TableCell>
                <TableCell>
                  <bdi>
                    {post.platform} · {post.social_account}
                  </bdi>
                </TableCell>
                <TableCell>
                  {post.published_at ? formatDate(post.published_at, { dateStyle: 'short' }) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {query.hasMore && (
        <Button disabled={query.loadingMore} onClick={() => query.loadMore()}>
          {t('dashboard.more')}
        </Button>
      )}
    </>
  );
}
