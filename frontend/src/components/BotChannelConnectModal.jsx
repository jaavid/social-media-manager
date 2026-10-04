/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { botChannelsAPI } from '../services/botChannels';

export default function BotChannelConnectModal({ open, platform, clientId, onClose, onConnected }) {
  const [token, setToken] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setToken('');
      setDestinationId('');
      setError('');
      setLoading(false);
    }
  }, [open, platform]);

  if (!open) return null;
  const label = platform === 'bale' ? 'Bale' : 'Telegram';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await botChannelsAPI.connect(clientId, platform, {
        token: token.trim(),
        destination_id: destinationId.trim(),
      });
      setToken('');
      setDestinationId('');
      await onConnected?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Connection failed. Check the bot token and destination.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label={`Connect ${label}`}>
        <button onClick={onClose} style={styles.close} aria-label="Close"><X size={18} /></button>
        <h2 style={styles.title}>Connect {label}</h2>
        <p style={styles.sub}>
          Add the bot token and the channel/chat destination. The server verifies both before saving the token encrypted.
        </p>
        <form onSubmit={submit}>
          <label style={styles.label}>Bot token</label>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456:ABC…"
            required
            style={styles.input}
          />
          <label style={styles.label}>Channel / chat ID</label>
          <input
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            placeholder="@channel or numeric chat_id"
            required
            style={styles.input}
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? 'Verifying…' : `Verify & connect ${label}`}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 16 },
  modal: { width: 'min(520px, 100%)', background: 'var(--surface-card, #fff)', color: 'var(--text-primary, #0f172a)', borderRadius: 18, padding: 24, position: 'relative', boxShadow: '0 24px 70px rgba(0,0,0,.2)' },
  close: { position: 'absolute', right: 14, top: 14, border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit' },
  title: { margin: '0 0 6px', fontSize: 22 },
  sub: { margin: '0 0 20px', color: 'var(--text-tertiary, #64748b)', fontSize: 13, lineHeight: 'var(--line-height-body)' },
  label: { display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: 10, marginBottom: 16, background: 'var(--surface-card, #fff)', color: 'inherit' },
  error: { color: '#b91c1c', background: '#fef2f2', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
  submit: { width: '100%', border: 0, borderRadius: 10, padding: 12, background: '#0f172a', color: '#fff', fontWeight: 800, cursor: 'pointer' },
};
