/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/i18n';
import { connectionsAPI } from '@/services/domains/connections';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import ConnectedAccounts from '@/components/ConnectedAccounts';
import Page from '@/components/ui/Page';
import DataState from '@/components/ui/DataState';
import Button from '@/components/ui/Button';

export default function MyConnectionsPage() {
  const { t } = useLanguage();
  const workspace = useQuery({ queryKey: QK.connectionWorkspace(),
    queryFn: ({ signal }) => connectionsAPI.workspace(signal), retry: false });
  const forbidden = apiError(workspace.error).status === 403;
  return <Page title={t('connections.pageTitle')} description={t('accounts.subtitle')} maxWidth="lg">
    {workspace.isPending ? <DataState state="loading" title={t('connections.loading')} />
      : workspace.isError ? <DataState state={forbidden ? 'forbidden' : 'error'}
        title={t(forbidden ? 'connections.forbidden' : 'connections.failed')}
        action={<Button variant="secondary" onClick={() => workspace.refetch()}>{t('connections.retry')}</Button>} />
      : workspace.data ? <ConnectedAccounts clientId={workspace.data.id} />
      : <DataState state="empty" title={t('connections.workspace')} />}
  </Page>;
}
