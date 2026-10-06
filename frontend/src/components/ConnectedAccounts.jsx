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
import { AlertTriangle, CheckCircle2, HelpCircle, Globe, RefreshCw } from 'lucide-react';
import { connectionsAPI } from '@/services/domains/connections';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import { useLanguage } from '@/i18n';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataState from '@/components/ui/DataState';
import Dialog from '@/components/ui/Dialog';
import NativeSelect from '@/components/ui/NativeSelect';
import SectionHeader from '@/components/ui/SectionHeader';
import SocialPlatformIcon from '@/components/ui/SocialPlatformIcon';
import ProviderExtensions from '@/components/connections/providerExtensions';
import ApiConnectivityPanel from '@/components/ApiConnectivityPanel';
import PlatformConnectModal from '@/components/PlatformConnectModal';

const enabled = status => ['supported', 'beta'].includes(status);
const healthVariant = { ready: 'success', expired: 'warning', revoked: 'warning', error: 'danger' };
const healthIcon = { ready: CheckCircle2, expired: AlertTriangle, revoked: AlertTriangle, error: AlertTriangle };

export default function ConnectedAccounts({ clientId }) {
  const workspaceId = Number(clientId);
  return <ConnectionCollection key={workspaceId} workspaceId={workspaceId} />;
}

function ConnectionCollection({ workspaceId }) {
  const { t, isPersian, formatDate, formatNumber } = useLanguage();
  const [selected, setSelected] = useState({});
  const [connect, setConnect] = useState(null);
  const [disconnect, setDisconnect] = useState(null);
  const [pending, setPending] = useState(false);
  const [mutationError, setMutationError] = useState(false);
  const query = useQuery({
    queryKey: QK.connections(workspaceId),
    queryFn: ({ signal }) => connectionsAPI.get(workspaceId, signal),
    enabled: Number.isSafeInteger(workspaceId) && workspaceId > 0,
    retry: false,
  });
  const retry = <Button variant="secondary" onClick={() => query.refetch()}>{t('connections.retry')}</Button>;
  if (!Number.isSafeInteger(workspaceId) || workspaceId <= 0) return <DataState state="empty" title={t('connections.workspace')} />;
  if (query.isPending) return <DataState state="loading" title={t('connections.loading')} />;
  const forbidden = apiError(query.error).status === 403;
  if (forbidden || (!query.data && query.isError)) return <DataState state={forbidden ? 'forbidden' : 'error'} title={t(forbidden ? 'connections.forbidden' : 'connections.failed')} action={retry} />;
  const data = query.data;
  if (!data) return null;
  const label = provider => provider.titles[isPersian ? 'fa' : 'en'];
  const canConnect = provider => provider.permissions.connect && enabled(provider.capabilities.connection)
    && provider.auth_type !== 'unsupported' && !['blocked', 'deprecated'].includes(provider.rollout_status)
    && (provider.contract.auth.start_path || provider.contract.auth.fields.length > 0);
  const start = (provider, account = null) => {
    if (provider.contract.auth.start_path) {
      window.location.assign(connectionsAPI.oauthPath(workspaceId, provider.key, account?.id));
    } else {
      setConnect({ provider, account });
    }
  };
  const complete = () => {
    void query.refetch();
  };
  const remove = async () => {
    setPending(true);
    setMutationError(false);
    try {
      await connectionsAPI.disconnect(workspaceId, disconnect.provider.key, disconnect.account.id);
      setDisconnect(null);
      complete();
    } catch {
      setMutationError(true);
    } finally {
      setPending(false);
    }
  };
  const content = <div className="space-y-6" data-connected-accounts>
    <SectionHeader className="flex-wrap" style={{ textAlign: 'start' }} title={t('accounts.title')} description={t('accounts.subtitle')}
      actions={<Button variant="secondary" size="sm" icon={RefreshCw} disabled={query.isFetching} onClick={() => query.refetch()}>{t('connections.refresh')}</Button>} />
    {!data.providers.length && <DataState state="empty" title={t('connections.noProviders')} />}
    {data.providers.length > 0 && data.providers.every(p => !p.accounts.length) && <DataState compact state="empty" title={t('connections.empty')} />}
    {data.categories.map(category => {
      const providers = data.providers.filter(p => p.category === category.key);
      if (!providers.length) return null;
      return <section key={category.key} aria-label={category[isPersian ? 'title_fa' : 'title_en']}>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{category[isPersian ? 'title_fa' : 'title_en']}</h3>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          {providers.map(provider => {
            const account = provider.accounts.find(a => a.id === selected[provider.key]) || provider.accounts[0];
            const auth = provider.contract.auth;
            const allowed = canConnect(provider);
            const needsSetup = provider.readiness?.configured === false;
            const oauthUnknown = ['oauth2', 'oidc'].includes(provider.auth_type) && !provider.readiness;
            const accountReconnect = account?.permissions.reconnect && enabled(provider.capabilities.connection)
              && provider.auth_type !== 'unsupported' && !['blocked', 'deprecated'].includes(provider.rollout_status) && (auth.start_path || auth.fields.length > 0);
            const variant = healthVariant[account?.health.state] || 'default';
            return <Card key={provider.key} padding="md" className="min-w-0" data-provider={provider.key}>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted" aria-hidden>
                    {provider.contract.brand.icon ? <SocialPlatformIcon platform={provider.contract.brand.icon} color={/^#[0-9a-f]{6}$/i.test(provider.contract.brand.color) ? provider.contract.brand.color : undefined} size={24} /> : <Globe size={24} />}
                  </span>
                  <h4 className="m-0 break-words text-base font-semibold">{label(provider)}</h4>
                </div>
                <Badge>{t(`connections.rollout.${provider.rollout_status}`)}</Badge>
              </div>
              <p className="mb-1 mt-4 text-xs text-muted-foreground">{t('connections.authenticationLabel', undefined, { strategy: t(`connections.auth.${provider.auth_type}`) })}</p>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">{t('connections.capability', undefined, { status: t(`connections.cap.${provider.capabilities.connection}`) })}</p>
              {provider.accounts.length > 0 && <NativeSelect label={t('connections.select')} value={account.id}
                onChange={event => setSelected(current => ({ ...current, [provider.key]: Number(event.target.value) }))}>
                {provider.accounts.map(item => <option key={item.id} value={item.id}>{item.name || item.external_id} · {item.destination.id}</option>)}
              </NativeSelect>}
              {account && <div className="mt-4 space-y-3" data-account-id={account.id}>
                <dl className="grid gap-1 text-sm">
                  <dt className="text-muted-foreground">{t('connections.account')}</dt>
                  <dd className="m-0 break-all"><bdi>{account.identity.name || account.name} · {account.identity.id}</bdi></dd>
                  <dt className="mt-1 text-muted-foreground">{t('connections.destination')}</dt>
                  <dd className="m-0 break-all"><bdi>{account.destination.kind} · {account.destination.id}</bdi></dd>
                </dl>
                <Badge variant={variant} icon={healthIcon[account.health.state] || HelpCircle}>{t(`connections.health.${account.health.state}`)}</Badge>
                <p className="text-xs text-muted-foreground">{t('connections.localHealth')}</p>
                <p className="text-xs text-muted-foreground">{account.expires_at ? t('accounts.tokenExpires', undefined, { date: formatDate(account.expires_at) }) : t('connections.expiryUnknown')}</p>
                <div className="space-y-1 text-xs">
                  <Badge variant={account.sync.state === 'failure' ? 'danger' : account.sync.state === 'stale' ? 'warning' : 'default'}>{t(`connections.sync.${account.sync.state}`)}</Badge>
                  {account.sync.last_success_at && <p>{t('connections.lastSuccess', undefined, { date: formatDate(account.sync.last_success_at) })}</p>}
                  {account.sync.last_failure_at && <p>{t('connections.lastFailure', undefined, { date: formatDate(account.sync.last_failure_at) })}</p>}
                  {account.sync.state !== 'not_available' && <p className="text-muted-foreground">{t('connections.stalePolicy', undefined, { hours: formatNumber(account.sync.stale_after_seconds / 3600) })}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {accountReconnect && !needsSetup && <Button size="sm" icon={RefreshCw} onClick={() => start(provider, account)}>{t('connections.reconnect')}</Button>}
                  {account.permissions.disconnect && enabled(provider.capabilities.disconnect) && <Button size="sm" variant="danger" onClick={() => { setMutationError(false); setDisconnect({ provider, account }); }}>{t('accounts.disconnect')}</Button>}
                </div>
              </div>}
              {provider.readiness?.configured === true && <p className="mt-3 text-sm text-muted-foreground">{t('connections.providerReady')}</p>}
              {account && <ProviderExtensions key={`${workspaceId}:${account.id}`} names={provider.contract.ui_extensions} workspaceId={workspaceId} accountId={account.id} />}
              {needsSetup && <p className="mt-3 text-sm text-muted-foreground">{t('connections.setup')}</p>}
              {oauthUnknown && <p className="mt-3 text-sm text-muted-foreground">{t('connections.readinessUnknown')}</p>}
              {allowed && !needsSetup && <Button className="mt-4" variant="secondary" size="sm" onClick={() => start(provider)}>{t('connections.add')}</Button>}
            </Card>;
          })}
        </div>
      </section>;
    })}
    <ApiConnectivityPanel />
    <PlatformConnectModal key={connect ? `${connect.provider.key}:${connect.account?.id || 'new'}` : 'closed'}
      open={Boolean(connect)} provider={connect?.provider} account={connect?.account} workspaceId={workspaceId}
      onClose={() => setConnect(null)} onConnected={complete} />
    <Dialog open={Boolean(disconnect)} title={t('connections.confirmTitle')}
      description={t('accounts.disconnectConfirm', undefined, { platform: disconnect?.account.name || '' })}
      onClose={() => { if (!pending) setDisconnect(null); }} closeOnBackdrop={!pending} showClose={!pending}>
      {mutationError && <DataState compact state="error" title={t('connections.mutationFailed')} />}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => setDisconnect(null)}>{t('connections.cancel')}</Button>
        <Button variant="danger" loading={pending} onClick={remove}>{t('accounts.disconnect')}</Button>
      </div>
    </Dialog>
  </div>;
  if (query.isError) return <DataState state="partial" title={t('connections.partial')} action={retry}>{content}</DataState>;
  if (query.isFetching) return <DataState state="refreshing" title={t('connections.refreshing')}>{content}</DataState>;
  return content;
}
