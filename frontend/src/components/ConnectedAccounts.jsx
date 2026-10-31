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
import { AlertTriangle, CheckCircle2, HelpCircle, Globe, RefreshCw, ChevronDown, Eye, ShieldCheck } from 'lucide-react';
import { connectionsAPI } from '@/services/domains/connections';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import { useLanguage } from '@/i18n';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataState from '@/components/ui/DataState';
import Dialog from '@/components/ui/Modal';
import NativeSelect from '@/components/ui/NativeSelect';
import SectionHeader from '@/components/ui/SectionHeader';
import SocialPlatformIcon from '@/components/ui/SocialPlatformIcon';
import ProviderExtensions from '@/components/connections/providerExtensions';
import ApiConnectivityPanel from '@/components/ApiConnectivityPanel';
import AccountWatchlist from '@/components/AccountWatchlist';
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
      const categoryName = category[isPersian ? 'title_fa' : 'title_en'];
      return <section key={category.key} aria-label={categoryName} className="space-y-3">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
          <h3 className="m-0 text-sm font-semibold text-foreground">{categoryName}</h3>
          <span className="text-xs text-muted-foreground">{formatNumber(providers.length)}</span>
        </div>
        <div className="grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2">
          {providers.map(provider => {
            const account = provider.accounts.find(a => a.id === selected[provider.key]) || provider.accounts[0];
            const auth = provider.contract.auth;
            const allowed = canConnect(provider);
            const needsSetup = provider.readiness?.configured === false;
            const oauthUnknown = ['oauth2', 'oidc'].includes(provider.auth_type) && !provider.readiness;
            const accountReconnect = account?.permissions.reconnect && enabled(provider.capabilities.connection)
              && provider.auth_type !== 'unsupported' && !['blocked', 'deprecated'].includes(provider.rollout_status) && (auth.start_path || auth.fields.length > 0);
            const variant = healthVariant[account?.health.state] || 'default';
            const HealthIcon = healthIcon[account?.health.state] || HelpCircle;
            const canDisconnect = account?.permissions.disconnect && enabled(provider.capabilities.disconnect);
            return <Card key={provider.key} padding="sm"
              className="min-w-0 self-start space-y-3 border-[var(--border-subtle)] shadow-sm"
              data-provider={provider.key}>
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-sunken)]">
                    {provider.contract.brand.icon
                      ? <SocialPlatformIcon platform={provider.contract.brand.icon} size={23} />
                      : <Globe size={21} aria-hidden />}
                  </span>
                  <div className="min-w-0">
                    <h4 className="m-0 break-words text-sm font-semibold text-foreground">{label(provider)}</h4>
                    <span className="text-xs text-muted-foreground">
                      {account
                        ? (account.identity.name || account.name)
                        : t('connections.auth.' + provider.auth_type)}
                    </span>
                  </div>
                </div>
                <Badge variant={account ? variant : 'default'} icon={account ? HealthIcon : undefined}>
                  {account ? t(`connections.health.${account.health.state}`) : t(`connections.rollout.${provider.rollout_status}`)}
                </Badge>
              </div>
              {provider.accounts.length > 1 && <NativeSelect label={t('connections.select')}
                value={account.id} onChange={event => setSelected(current => ({
                  ...current, [provider.key]: Number(event.target.value),
                }))}>
                {provider.accounts.map(item => <option key={item.id} value={item.id}>
                  {item.name || item.external_id} · {item.destination.id}
                </option>)}
              </NativeSelect>}
              {account && <div className="space-y-2 rounded-xl bg-[var(--surface-sunken)] px-3 py-2.5" data-account-id={account.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <ShieldCheck size={15} className="shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 break-all text-xs font-medium text-foreground" dir="auto">
                    <bdi>{account.identity.name || account.name} · {account.identity.id}</bdi>
                  </span>
                  <Badge variant={account.sync.state === 'failure' ? 'danger' : account.sync.state === 'stale' ? 'warning' : 'default'}>
                    {t(`connections.sync.${account.sync.state}`)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <bdi>{account.destination.kind} · {account.destination.id}</bdi>
                </div>
                <div className="flex flex-wrap gap-2">
                  {accountReconnect && !needsSetup && <Button size="sm" icon={RefreshCw}
                    onClick={() => start(provider, account)}>{t('connections.reconnect')}</Button>}
                  {canDisconnect && <Button size="sm" variant="ghost"
                    onClick={() => { setMutationError(false); setDisconnect({ provider, account }); }}>
                    {t('accounts.disconnect')}
                  </Button>}
                </div>
              </div>}
              {!account && allowed && !needsSetup && <Button size="sm" variant="secondary"
                onClick={() => start(provider)}>{t('connections.add')}</Button>}
              {account && allowed && !needsSetup && <Button size="sm" variant="ghost"
                onClick={() => start(provider)}>{t('connections.add')}</Button>}
              {needsSetup && <p className="m-0 text-xs text-muted-foreground">{t('connections.setup')}</p>}
              {oauthUnknown && <p className="m-0 text-xs text-muted-foreground">{t('connections.readinessUnknown')}</p>}
              {account && <ProviderExtensions key={`${workspaceId}:${account.id}`}
                names={provider.contract.ui_extensions} workspaceId={workspaceId}
                accountId={account.id} permissions={account.permissions} />}
              <details className="group border-t border-[var(--border-subtle)] pt-2">
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
                  <span>{isPersian ? 'جزئیات اتصال' : 'Connection details'}</span>
                  <ChevronDown size={15} className="transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <dt className="text-muted-foreground">{t('connections.authenticationLabel', undefined, { strategy: t(`connections.auth.${provider.auth_type}`) })}</dt>
                  <dd className="m-0 text-end">{t(`connections.cap.${provider.capabilities.connection}`)}</dd>
                  <dt className="text-muted-foreground">{t('connections.capability', undefined, { status: t(`connections.cap.${provider.capabilities.connection}`) })}</dt>
                  <dd className="m-0 text-end">{t(`connections.rollout.${provider.rollout_status}`)}</dd>
                  {account && <>
                    <dt>{t('connections.account')}</dt>
                    <dd className="m-0 break-all text-end"><bdi>{account.identity.id}</bdi></dd>
                    <dt>{t('connections.destination')}</dt>
                    <dd className="m-0 break-all text-end"><bdi>{account.destination.id}</bdi></dd>
                    <dt>{t('connections.localHealth')}</dt>
                    <dd className="m-0 text-end">{account.health.code || (isPersian ? 'جزئیات محلی' : 'Local details')}</dd>
                    <dt>{isPersian ? 'آخرین همگام‌سازی' : 'Last synchronization'}</dt>
                    <dd className="m-0 text-end">{account.sync.last_failure_at
                      ? t('connections.lastFailure', undefined, { date: formatDate(account.sync.last_failure_at) })
                      : account.sync.last_success_at
                        ? t('connections.lastSuccess', undefined, { date: formatDate(account.sync.last_success_at) })
                        : t('connections.expiryUnknown')}</dd>
                    <dt>{t('connections.expiryUnknown')}</dt>
                    <dd className="m-0 text-end">{account.expires_at
                      ? t('accounts.tokenExpires', undefined, { date: formatDate(account.expires_at) })
                      : t('connections.expiryUnknown')}</dd>
                    {account.sync.state !== 'not_available' && <dd className="col-span-2 m-0 text-muted-foreground">
                      {t('connections.stalePolicy', undefined, { hours: formatNumber(account.sync.stale_after_seconds / 3600) })}
                    </dd>}
                  </>}
                </dl>
              </details>
            </Card>;
          })}
        </div>
      </section>;
    })}
    {data.providers.some(p => p.key === 'instagram') && <details className="group rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-card shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Eye size={17} className="text-muted-foreground" aria-hidden />
          {t('watchlist.title')}
          <Badge variant="outline">{isPersian ? 'رصد عمومی' : 'Public monitoring'}</Badge>
        </span>
        <ChevronDown size={17} className="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-[var(--border-subtle)] p-3">
        <AccountWatchlist workspaceId={workspaceId}
          canAdd={Boolean(data.providers.find(p => p.key === 'instagram')?.permissions.connect)}
          canVerify={Boolean(data.providers.find(p => p.key === 'instagram')?.contract.auth.start_path)} />
      </div>
    </details>}
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
