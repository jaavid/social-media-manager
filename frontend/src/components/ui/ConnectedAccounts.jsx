/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { oauthAPI } from '../../services/api';
import { botChannelsAPI } from '../../services/botChannels';
import {
  getOAuthUrl,
  platformHasCapability,
  usePlatformUiRegistry,
} from '../../services/platforms';
import { useLanguage } from '../../i18n';
import { Lightbulb, Zap } from 'lucide-react';
import SocialPlatformIcon from './SocialPlatformIcon';
import FacebookConnectModal from '../FacebookConnectModal';
import PlatformConnectModal from '../PlatformConnectModal';
import ApiConnectivityPanel from '../ApiConnectivityPanel';

export default function ConnectedAccounts({ clientId, status, onRefresh }) {
  const { t, formatDate, isPersian } = useLanguage();
  const [loading, setLoading] = useState({});
  const [fbConsentOpen, setFbConsentOpen] = useState(false);
  const [connectionModal, setConnectionModal] = useState(null);
  const [credentialStatus, setCredentialStatus] = useState({});
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

  useEffect(() => { refreshCredentialStatus(); }, [clientId]);

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

  return (
    <div>
      <h2 style={styles.heading}>{t('accounts.title')}</h2>
      <p style={styles.sub}>{t('accounts.subtitle')}</p>

      {grouped.map(({ category, platforms: groupPlatforms }) => {
        const categoryLabel = localizedCategoryLabel(category);
        return (
          <section key={category.key} aria-label={categoryLabel} style={styles.category}>
            <h3 style={styles.categoryTitle}>{categoryLabel}</h3>
            <div className="oauth-platform-grid" style={styles.grid}>
              {groupPlatforms.map(platform => {
                const key = platform.key;
                const platformLabel = localizedPlatformLabel(platform);
                const connectionState = combinedStatus[key] || {};
                const active = connectionState.status === 'active';
                const expired = connectionState.status === 'expired';
                const connected = active || expired;
                const canConnect = platformHasCapability(platform, 'connect');
                const connectionCapability = platform.capabilityStatuses?.connection || 'not_available';
                const fbConnected = (combinedStatus.facebook || {}).status === 'active';
                const groupNote = key === 'instagram' && fbConnected && connected
                  ? <span style={styles.groupNoteInner}><Zap size={13} /> {t('accounts.connectedViaFacebook')}</span>
                  : null;

                return (
                  <div key={key} className="oauth-platform-card" style={styles.card}>
                    <div style={styles.cardTop}>
                      <div style={styles.platformInfo}>
                        <span style={styles.platformIcon}>
                          <SocialPlatformIcon
                            platform={key}
                            size={28}
                            label={platformLabel}
                            color={platform.color}
                          />
                        </span>
                        <div>
                          <div style={styles.platformName}>{platformLabel}</div>
                          {connectionState.account_name && <div dir="ltr" style={styles.accountName}>@{connectionState.account_name}</div>}
                          {connectionState.destination_id && <div dir="ltr" style={styles.accountName}>→ {connectionState.destination_id}</div>}
                        </div>
                      </div>
                      <div style={styles.statusBadge(active, expired)}>
                        {active
                          ? `● ${t('accounts.status.active')}`
                          : expired
                            ? `⚠ ${t('accounts.status.expired')}`
                            : `○ ${t('accounts.status.disconnected')}`}
                      </div>
                    </div>

                    {connectionState.expires_at && (
                      <div style={styles.expiry}>
                        {t('accounts.tokenExpires', undefined, { date: formatDate(connectionState.expires_at) })}
                      </div>
                    )}

                    {groupNote ? (
                      <div style={styles.groupNote}>{groupNote}</div>
                    ) : connected ? (
                      <button
                        className="oauth-btn-row"
                        onClick={() => handleDisconnect(platform)}
                        disabled={loading[key]}
                        style={styles.disconnectBtn}
                      >
                        {loading[key] ? t('accounts.disconnecting') : t('accounts.disconnect')}
                      </button>
                    ) : canConnect ? (
                      <button
                        className="oauth-btn-row"
                        onClick={() => handleConnect(platform)}
                        style={{ ...styles.connectBtn, background: platform.color }}
                      >
                        {t('accounts.connect', undefined, { platform: platformLabel })} →
                      </button>
                    ) : connectionCapability === 'planned' ? (
                      <button
                        className="oauth-btn-row"
                        disabled
                        style={{ ...styles.connectBtn, opacity: 0.55, cursor: 'not-allowed', background: platform.color }}
                      >
                        {t('common.soon', 'Coming soon')}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

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

      <div style={styles.helpBox}>
        <strong style={styles.helpTitle}><Lightbulb size={14} /> {t('accounts.help.title')}</strong>
        <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, fontSize: 13, color: 'var(--text-tertiary)' }}>
          <li>{t('accounts.help.oauth')}</li>
          <li>{t('accounts.help.bot')}</li>
          <li>{t('accounts.help.shared')}</li>
        </ul>
      </div>

      <ApiConnectivityPanel />
    </div>
  );
}

const styles = {
  heading: { margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' },
  sub: { margin: '0 0 24px', color: 'var(--text-tertiary)', fontSize: 14 },
  category: { marginBottom: 20 },
  categoryTitle: { margin: '0 0 8px', fontSize: 12, textTransform: 'capitalize', color: 'var(--text-tertiary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 24 },
  card: { background: 'var(--surface-card)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: '1px solid var(--border-subtle)', overflow: 'hidden', position: 'relative' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  platformInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  platformIcon: { fontSize: 28 },
  platformName: { fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' },
  accountName: { fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 },
  statusBadge: (active, expired) => ({ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: active ? '#dcfce7' : expired ? '#fef3c7' : '#f1f5f9', color: active ? '#16a34a' : expired ? '#d97706' : '#64748b' }),
  expiry: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 },
  groupNote: { fontSize: 12, color: '#2563eb', fontStyle: 'italic', marginTop: 4 },
  groupNoteInner: { display: 'flex', alignItems: 'center', gap: 4 },
  connectBtn: { width: '100%', padding: '12px', borderRadius: 12, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  disconnectBtn: { width: '100%', padding: '11px', borderRadius: 12, border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  helpBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '16px 18px', fontSize: 13, color: '#1e40af' },
  helpTitle: { display: 'flex', alignItems: 'center', gap: 4 },
};
