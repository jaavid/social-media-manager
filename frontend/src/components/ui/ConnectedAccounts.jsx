/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Lightbulb, RefreshCw, Settings2, Zap } from 'lucide-react';

import { oauthAPI } from '../../services/api';
import { botChannelsAPI } from '../../services/botChannels';
import { egressAPI } from '../../services/egress';
import {
  getOAuthUrl,
  platformHasCapability,
  usePlatformUiRegistry,
} from '../../services/platforms';
import { useLanguage } from '../../i18n';
import ApiConnectivityPanel from '../ApiConnectivityPanel';
import FacebookConnectModal from '../FacebookConnectModal';
import PlatformConnectModal from '../PlatformConnectModal';
import Badge from './Badge';
import Button from './Button';
import Card from './Card';
import SocialPlatformIcon from './SocialPlatformIcon';

const STATE_META = {
  setup_required: { variant: 'warning', icon: Settings2, label: 'Setup required' },
  ready: { variant: 'info', icon: CheckCircle2, label: 'Ready to connect' },
  connected: { variant: 'success', icon: CheckCircle2, label: 'Connected' },
  expired: { variant: 'warning', icon: AlertTriangle, label: 'Expired' },
  error: { variant: 'danger', icon: AlertTriangle, label: 'Error' },
  unavailable: { variant: 'default', icon: null, label: 'Unavailable' },
};

function readinessState(connectionState, readiness, canConnect, connectionCapability) {
  if (connectionState?.status === 'active') return 'connected';
  if (connectionState?.status === 'expired') return 'expired';
  if (connectionState?.status === 'error') return 'error';
  if (readiness && readiness.configured === false) return 'setup_required';
  if (canConnect && (!readiness || readiness.configured)) return 'ready';
  if (connectionCapability === 'planned') return 'unavailable';
  return 'unavailable';
}

function DetailList({ readiness }) {
  if (!readiness) return null;
  const details = [
    readiness.redirect_uri && ['Callback URI', readiness.redirect_uri],
    readiness.required_apis?.length && ['Required APIs', readiness.required_apis.join(' · ')],
    readiness.scopes?.length && ['Scopes', readiness.scopes.join(' · ')],
    readiness.missing?.length && ['Missing settings', readiness.missing.join(' · ')],
  ].filter(Boolean);

  if (!details.length) return null;
  return (
    <dl className="mt-4 grid gap-2 border-t border-[var(--border-subtle)] pt-4 text-xs">
      {details.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-3">
          <dt className="font-medium text-[var(--text-tertiary)]">{label}</dt>
          <dd dir="ltr" className="m-0 break-all text-start text-[var(--text-secondary)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ConnectedAccounts({ clientId, status, onRefresh }) {
  const { t, formatDate, isPersian } = useLanguage();
  const [loading, setLoading] = useState({});
  const [fbConsentOpen, setFbConsentOpen] = useState(false);
  const [connectionModal, setConnectionModal] = useState(null);
  const [credentialStatus, setCredentialStatus] = useState({});
  const [oauthReadiness, setOauthReadiness] = useState({});
  const [showTechnical, setShowTechnical] = useState({});
  const { categories, platforms } = usePlatformUiRegistry();

  const refreshCredentialStatus = async () => {
    if (!clientId) {
      setCredentialStatus({});
      return;
    }
    try {
      const response = await botChannelsAPI.status(clientId);
      setCredentialStatus(response.data || {});
    } catch {
      setCredentialStatus({});
    }
  };

  const refreshOauthReadiness = async () => {
    try {
      const response = await egressAPI.oauthReadiness();
      setOauthReadiness(response.data?.oauth || {});
    } catch (error) {
      // Normal client/end-user roles intentionally receive 403 here. Readiness
      // is operational metadata; connection controls must still work for them.
      if (error?.response?.status !== 403) setOauthReadiness({});
    }
  };

  useEffect(() => { refreshCredentialStatus(); }, [clientId]);
  useEffect(() => { refreshOauthReadiness(); }, []);

  const combinedStatus = useMemo(
    () => ({ ...(status || {}), ...credentialStatus }),
    [status, credentialStatus]
  );

  const grouped = useMemo(() => categories.map(category => ({
    category,
    platforms: platforms.filter(platform => platform.category === category.key),
  })).filter(group => group.platforms.length > 0), [categories, platforms]);

  const localizedPlatformLabel = (platform) => (
    isPersian
      ? (platform.labels?.fa || platform.labels?.default || platform.key)
      : (platform.labels?.en || platform.labels?.default || platform.key)
  );

  const localizedCategoryLabel = (category) => (
    isPersian ? (category.title_fa || category.title_en || category.key) : (category.title_en || category.key)
  );

  const handleConnect = (platform) => {
    if (!clientId) {
      window.alert(t('accounts.workspacePreparing'));
      return;
    }
    if (!platformHasCapability(platform, 'connect')) return;

    if (platform.authType === 'bot_token' || platform.authType === 'api_credentials') {
      setConnectionModal(platform);
      return;
    }

    if (platform.authType === 'oauth') {
      if (platform.connection.oauthProvider === 'facebook') {
        setFbConsentOpen(true);
        return;
      }
      const url = getOAuthUrl(platform, clientId);
      if (url) window.location.href = url;
    }
  };

  const handleFbConsentContinue = () => {
    window.location.href = oauthAPI.facebookUrl(clientId);
  };

  const handleDisconnect = async (platform) => {
    const platformLabel = localizedPlatformLabel(platform);
    if (!window.confirm(t('accounts.disconnectConfirm', undefined, { platform: platformLabel }))) return;
    setLoading(current => ({ ...current, [platform.key]: true }));
    try {
      if (platform.authType === 'bot_token' || platform.authType === 'api_credentials') {
        await botChannelsAPI.disconnect(clientId, platform.key);
        await refreshCredentialStatus();
      } else if (platform.authType === 'oauth') {
        await oauthAPI.disconnect(clientId, platform.key);
        onRefresh?.();
      }
    } finally {
      setLoading(current => ({ ...current, [platform.key]: false }));
    }
  };

  const copyCallback = async (value) => {
    if (!value || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em] text-foreground">{t('accounts.title')}</h2>
          <p className="mb-0 mt-1 text-sm text-[var(--text-tertiary)]">{t('accounts.subtitle')}</p>
        </div>
        {Object.keys(oauthReadiness).length > 0 && (
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={refreshOauthReadiness}>
            Refresh readiness
          </Button>
        )}
      </div>

      <div className="space-y-7">
        {grouped.map(({ category, platforms: groupPlatforms }) => {
          const categoryLabel = localizedCategoryLabel(category);
          return (
            <section key={category.key} aria-label={categoryLabel}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {categoryLabel}
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
                {groupPlatforms.map(platform => {
                  const key = platform.key;
                  const platformLabel = localizedPlatformLabel(platform);
                  const connectionState = combinedStatus[key] || {};
                  const readiness = oauthReadiness[key];
                  const canConnect = platformHasCapability(platform, 'connect');
                  const connectionCapability = platform.capabilityStatuses?.connection || 'not_available';
                  const state = readinessState(connectionState, readiness, canConnect, connectionCapability);
                  const stateMeta = STATE_META[state];
                  const connected = state === 'connected' || state === 'expired';
                  const fbConnected = (combinedStatus.facebook || {}).status === 'active';
                  const viaFacebook = key === 'instagram' && fbConnected && connected;
                  const lastSync = connectionState.last_successful_sync || connectionState.last_sync_at;

                  return (
                    <Card key={key} padding="md" className="min-w-0 overflow-hidden">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
                            <SocialPlatformIcon
                              platform={key}
                              size={25}
                              label={platformLabel}
                              color={platform.color}
                            />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[15px] font-bold text-foreground">{platformLabel}</div>
                            {connectionState.account_name && (
                              <div dir="ltr" className="mt-0.5 truncate text-start text-xs text-[var(--text-tertiary)]">
                                @{connectionState.account_name}
                              </div>
                            )}
                            {connectionState.destination_id && (
                              <div dir="ltr" className="mt-0.5 truncate text-start text-xs text-[var(--text-tertiary)]">
                                {connectionState.destination_id}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={stateMeta.variant} icon={stateMeta.icon}>{stateMeta.label}</Badge>
                      </div>

                      <div className="mt-4 space-y-1 text-xs text-[var(--text-tertiary)]">
                        {connectionState.connected_at && (
                          <div>{t('accounts.connectedAt', 'Connected')} · {formatDate(connectionState.connected_at)}</div>
                        )}
                        {lastSync && <div>Last successful sync · {formatDate(lastSync)}</div>}
                        {connectionState.expires_at && (
                          <div>{t('accounts.tokenExpires', undefined, { date: formatDate(connectionState.expires_at) })}</div>
                        )}
                        {viaFacebook && (
                          <div className="flex items-center gap-1 text-[var(--info)]">
                            <Zap size={13} /> {t('accounts.connectedViaFacebook')}
                          </div>
                        )}
                        {state === 'setup_required' && readiness?.missing?.length > 0 && (
                          <div className="text-[var(--warning)]">Missing: {readiness.missing.join(', ')}</div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {connected && !viaFacebook ? (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={Boolean(loading[key])}
                            onClick={() => handleDisconnect(platform)}
                          >
                            {t('accounts.disconnect')}
                          </Button>
                        ) : state === 'ready' ? (
                          <Button
                            size="sm"
                            onClick={() => handleConnect(platform)}
                            style={{ background: platform.color }}
                          >
                            {t('accounts.connect', undefined, { platform: platformLabel })}
                          </Button>
                        ) : state === 'expired' ? (
                          <Button size="sm" icon={RefreshCw} onClick={() => handleConnect(platform)}>
                            Reconnect
                          </Button>
                        ) : null}

                        {readiness && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTechnical(current => ({ ...current, [key]: !current[key] }))}
                          >
                            {showTechnical[key] ? 'Hide setup details' : 'Setup details'}
                          </Button>
                        )}
                        {readiness?.redirect_uri && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Copy}
                            onClick={() => copyCallback(readiness.redirect_uri)}
                          >
                            Copy callback
                          </Button>
                        )}
                      </div>

                      {showTechnical[key] && <DetailList readiness={readiness} />}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <FacebookConnectModal
        appName="Social Stats"
        open={fbConsentOpen}
        onClose={() => setFbConsentOpen(false)}
        onContinue={handleFbConsentContinue}
      />
      <PlatformConnectModal
        open={Boolean(connectionModal)}
        platform={connectionModal}
        clientId={clientId}
        onClose={() => setConnectionModal(null)}
        onConnected={refreshCredentialStatus}
      />

      <Card padding="md" className="mt-7 border-[var(--info-border)] bg-[var(--info-bg)] shadow-none">
        <strong className="flex items-center gap-1.5 text-sm text-[var(--info)]">
          <Lightbulb size={15} /> {t('accounts.help.title')}
        </strong>
        <ul className="mb-0 mt-2 space-y-1 ps-5 text-xs leading-5 text-[var(--text-secondary)]">
          <li>{t('accounts.help.oauth')}</li>
          <li>{t('accounts.help.bot')}</li>
          <li>{t('accounts.help.shared')}</li>
        </ul>
      </Card>

      <div className="mt-5">
        <ApiConnectivityPanel />
      </div>
    </div>
  );
}
