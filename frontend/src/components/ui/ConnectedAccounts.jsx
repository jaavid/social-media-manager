/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { oauthAPI } from '../../services/api';
import { botChannelsAPI } from '../../services/botChannels';
import { PLATFORMS } from '../../services/platforms';
import { Lightbulb, Zap } from 'lucide-react';
import SocialPlatformIcon from './SocialPlatformIcon';
import FacebookConnectModal from '../FacebookConnectModal';
import BotChannelConnectModal from '../BotChannelConnectModal';
import ApiConnectivityPanel from '../ApiConnectivityPanel';

const BOT_PLATFORMS = new Set(['telegram', 'bale']);

export default function ConnectedAccounts({ clientId, status, onRefresh }) {
  const [loading, setLoading] = useState({});
  const [fbConsentOpen, setFbConsentOpen] = useState(false);
  const [botModal, setBotModal] = useState(null);
  const [botStatus, setBotStatus] = useState({});

  const refreshBotStatus = async () => {
    if (!clientId) return;
    try {
      const response = await botChannelsAPI.status(clientId);
      setBotStatus(response.data || {});
    } catch {
      setBotStatus({});
    }
  };

  useEffect(() => { refreshBotStatus(); }, [clientId]);

  const handleConnect = (platform) => {
    if (!clientId) {
      window.alert('Your client workspace is still being prepared. Please refresh the page and try again.');
      return;
    }
    if (BOT_PLATFORMS.has(platform)) {
      setBotModal(platform);
      return;
    }
    if (platform === 'facebook' || platform === 'instagram') {
      setFbConsentOpen(true);
      return;
    }
    const urlMap = {
      youtube: oauthAPI.googleUrl(clientId, 'youtube'),
      google_my_business: oauthAPI.googleUrl(clientId, 'google_my_business'),
      linkedin: oauthAPI.linkedinUrl(clientId),
    };
    window.location.href = urlMap[platform];
  };

  const handleFbConsentContinue = () => {
    window.location.href = oauthAPI.facebookUrl(clientId);
  };

  const handleDisconnect = async (platform) => {
    if (!window.confirm(`Disconnect ${PLATFORMS[platform]?.label}? Publishing/sync will stop.`)) return;
    setLoading(l => ({ ...l, [platform]: true }));
    try {
      if (BOT_PLATFORMS.has(platform)) {
        await botChannelsAPI.disconnect(clientId, platform);
        await refreshBotStatus();
      } else {
        await oauthAPI.disconnect(clientId, platform);
        onRefresh?.();
      }
    } finally {
      setLoading(l => ({ ...l, [platform]: false }));
    }
  };

  const platformOrder = ['facebook','instagram','youtube','google_my_business','linkedin','telegram','bale'];
  const combinedStatus = { ...(status || {}), ...botStatus };

  return (
    <div>
      <h2 style={styles.heading}>Connected Accounts</h2>
      <p style={styles.sub}>Connect social accounts and publishing destinations.</p>

      <div className="oauth-platform-grid" style={styles.grid}>
        {platformOrder.map(key => {
          const p = PLATFORMS[key];
          const s = combinedStatus[key] || {};
          const active = s.status === 'active';
          const expired = s.status === 'expired';
          const conn = active || expired;
          const fbConnected = (combinedStatus.facebook || {}).status === 'active';
          const groupNote = key === 'instagram' && fbConnected && conn
            ? <span style={styles.groupNoteInner}><Zap size={13} /> Connected via Facebook</span>
            : null;

          return (
            <div key={key} className="oauth-platform-card" style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.platformInfo}>
                  <span style={styles.platformIcon}><SocialPlatformIcon platform={key} size={28} /></span>
                  <div>
                    <div style={styles.platformName}>{p.label}</div>
                    {s.account_name && <div style={styles.accountName}>@{s.account_name}</div>}
                    {s.destination_id && <div style={styles.accountName}>→ {s.destination_id}</div>}
                  </div>
                </div>
                <div style={styles.statusBadge(active, expired)}>
                  {active ? '● Active' : expired ? '⚠ Expired' : '○ Not connected'}
                </div>
              </div>

              {s.expires_at && <div style={styles.expiry}>Token expires: {new Date(s.expires_at).toLocaleDateString()}</div>}
              {groupNote ? (
                <div style={styles.groupNote}>{groupNote}</div>
              ) : conn ? (
                <button className="oauth-btn-row" onClick={() => handleDisconnect(key)} disabled={loading[key]} style={styles.disconnectBtn}>
                  {loading[key] ? 'Disconnecting…' : 'Disconnect'}
                </button>
              ) : (
                <button className="oauth-btn-row" onClick={() => handleConnect(key)} style={{ ...styles.connectBtn, background: p.color }}>
                  Connect {p.label} →
                </button>
              )}
            </div>
          );
        })}
      </div>

      <FacebookConnectModal appName="Social Stats" open={fbConsentOpen} onClose={() => setFbConsentOpen(false)} onContinue={handleFbConsentContinue} />
      <BotChannelConnectModal
        open={Boolean(botModal)}
        platform={botModal}
        clientId={clientId}
        onClose={() => setBotModal(null)}
        onConnected={refreshBotStatus}
      />

      <div style={styles.helpBox}>
        <strong style={styles.helpTitle}><Lightbulb size={14} /> How it works:</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: 'var(--text-tertiary)' }}>
          <li>OAuth platforms redirect you to the provider for authorization.</li>
          <li>Telegram and Bale use a bot token plus a channel/chat ID and are verified before storage.</li>
          <li>Facebook & Instagram share one login. YouTube & Google My Business share one login.</li>
        </ul>
      </div>

      <ApiConnectivityPanel />
    </div>
  );
}

const styles = {
  heading: { margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' },
  sub: { margin: '0 0 24px', color: 'var(--text-tertiary)', fontSize: 14 },
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
