/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n';
import { AppLink as Link } from '@/core/navigation';
import { endUserAPI } from '@/services/domains/identity';
import { apiError } from '@/services/http/errors';
import { useSession } from '@/core/session';
import useWorkspaceScope, { normalizeWorkspaceId } from '@/hooks/useWorkspaceScope';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataState from '@/components/ui/DataState';

// This endpoint describes the default workspace, not arbitrary URL selections.
// Reject malformed/foreign identity summaries instead of treating them as empty.
function summary(value, userId) {
  if (!value || value.user?.id !== userId || !Object.hasOwn(value, 'workspace') ||
    (value.workspace !== null && !normalizeWorkspaceId(value.workspace?.id))) {
    throw new Error('Invalid end-user summary');
  }
  return value;
}

export default function EndUserDashboard() {
  const session = useSession();
  const scope = useWorkspaceScope();
  const { t } = useLanguage();
  const identity = JSON.stringify([scope.key, session.user?.role, session.user?.account_type,
    session.user?.workspace_id, session.user?.client_id, session.user?.permissions]);
  if (session.status !== 'authenticated' || session.transitioning) {
    return <DataState state="loading" title={t('endDashboard.loading')} />;
  }
  // Remount on scope/access changes; no previous identity's snapshot or focus survives.
  return <DashboardSummary key={identity} identity={identity} user={session.user} workspaceId={scope.workspaceId} />;
}

function DashboardSummary({ identity, user, workspaceId }) {
  const { t, formatNumber } = useLanguage();
  const heading = useRef(null);
  const query = useQuery({
    queryKey: ['end-user.dashboard', identity],
    queryFn: async ({ signal }) => summary((await endUserAPI.me(signal)).data, user.id),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  const failure = apiError(query.error);
  const denied = ['authentication', 'permission'].includes(failure.kind);
  const retry = <Button variant="secondary" disabled={query.isFetching} onClick={async () => {
    const result = await query.refetch();
    if (result.isSuccess) heading.current?.focus();
  }}>{t('endDashboard.retry')}</Button>;
  const organizations = <Button as={Link} to="/u/organizations" variant="secondary">{t('endDashboard.organizations')}</Button>;
  let content;
  if (query.isPending) {
    content = <DataState state={query.fetchStatus === 'paused' ? 'offline' : 'loading'}
      title={t(query.fetchStatus === 'paused' ? 'endDashboard.offline' : 'endDashboard.loading')} />;
  } else if (query.isError && (!query.data?.workspace || denied || failure.status === 404)) {
    // Never keep private data on denied reads, or reinterpret read failures as empty.
    content = <DataState state={denied ? 'forbidden' : 'error'} title={t(denied ? 'endDashboard.denied' : 'endDashboard.failed')}
      description={t('endDashboard.failedHelp')} referenceId={failure.referenceId} action={retry} />;
  } else {
    const workspace = query.data.workspace;
    const matches = workspace ? normalizeWorkspaceId(workspace.id) === workspaceId : workspaceId === null;
    if (!matches) {
      content = <DataState state="unavailable" title={t('endDashboard.scopeUnavailable')}
        description={t('endDashboard.scopeHelp')} action={<>{retry}{organizations}</>} />;
    } else if (!workspace) {
      content = <DataState state="empty" title={t('endDashboard.empty')} description={t('endDashboard.emptyHelp')}
        action={organizations} />;
    } else {
      const relations = query.data.relations;
      const countsKnown = Number.isSafeInteger(relations?.active) && relations.active >= 0 &&
        Number.isSafeInteger(relations?.pending) && relations.pending >= 0;
      content = <div className="grid gap-5">
        {query.isError && <DataState compact state="partial" title={t('endDashboard.refreshFailed')}
          description={t('endDashboard.staleHelp')} action={retry} />}
        {query.fetchStatus === 'paused' && <DataState compact state="offline" title={t('endDashboard.offline')} />}
        {query.isFetching && <DataState compact state="refreshing" title={t('endDashboard.refreshing')} />}
        <Card as="section" className="grid gap-3" aria-labelledby="dashboard-workspace">
          <h2 id="dashboard-workspace" className="text-lg font-semibold">{t('endDashboard.workspace')}</h2>
          <p className="break-words text-xl font-semibold"><bdi>{workspace.display_name || workspace.company || workspace.name}</bdi></p>
          <p className="text-sm text-[var(--text-secondary)]">{t('endDashboard.workspaceHelp')}</p>
          <div className="flex flex-wrap gap-3">
            <Button as={Link} to={`/u/connections?workspace=${workspace.id}`}>{t('endDashboard.connections')}</Button>
            {organizations}
          </div>
        </Card>
        <Card as="section" aria-labelledby="dashboard-stats">
          <h2 id="dashboard-stats" className="text-lg font-semibold">{t('endDashboard.stats')}</h2>
          <DataState compact state="unavailable" title={t('endDashboard.statsUnavailable')} description={t('endDashboard.statsHelp')} />
        </Card>
        <Card as="section" className="grid gap-2" aria-labelledby="dashboard-agencies">
          <h2 id="dashboard-agencies" className="text-lg font-semibold">{t('endDashboard.agencies')}</h2>
          {countsKnown ? <dl className="grid gap-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><dt>{t('endDashboard.active')}</dt><dd>{formatNumber(relations.active)}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt>{t('endDashboard.pending')}</dt><dd>{formatNumber(relations.pending)}</dd></div>
          </dl> : <DataState compact state="unavailable" title={t('endDashboard.relationsUnavailable')} />}
          <p className="text-sm text-[var(--text-secondary)]">{t('endDashboard.relationsHelp')}</p>
        </Card>
      </div>;
    }
  }
  return <div className="mx-auto grid w-full min-w-0 max-w-6xl gap-6" data-end-user-dashboard>
    <header>
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">{t('endDashboard.title')}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('endDashboard.description')}</p>
    </header>
    {content}
  </div>;
}
