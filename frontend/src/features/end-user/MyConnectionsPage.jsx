/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useLanguage } from '@/i18n';
import useWorkspaceScope from '@/hooks/useWorkspaceScope';
import ConnectedAccounts from '@/components/ConnectedAccounts';
import Page from '@/components/ui/Page';
import DataState from '@/components/ui/DataState';

export default function MyConnectionsPage() {
  const { t } = useLanguage();
  const { workspaceId } = useWorkspaceScope();
  return <Page title={t('connections.pageTitle')} description={t('accounts.subtitle')} maxWidth="lg">
    {workspaceId !== null ? <ConnectedAccounts clientId={workspaceId} />
      : <DataState state="empty" title={t('connections.workspace')} />}
  </Page>;
}
