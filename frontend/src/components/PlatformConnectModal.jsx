/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { botChannelsAPI } from '../services/botChannels';

const submitters = {
  bot_token: (clientId, platform, values) => botChannelsAPI.connect(clientId, platform.key, values),
  api_credentials: (clientId, platform, values) => botChannelsAPI.connect(clientId, platform.key, values),
};

export default function PlatformConnectModal({ open, platform, clientId, onClose, onConnected }) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setValues({});
    setError('');
    setLoading(false);
  }, [open, platform?.key]);

  if (!open || !platform) return null;
  const schema = platform.connection || { fields: [] };
  const label = platform.labels.default;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const handler = submitters[platform.authType];
      if (!handler) throw new Error(`Unsupported authentication type: ${platform.authType}`);
      const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      await handler(clientId, platform, payload);
      await onConnected?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Connection failed. Check the credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label={`Connect ${label}`}>
        <button onClick={onClose} style={styles.close} aria-label="Close"><X size={18} /></button>
        <h2 style={styles.title}>Connect {label}</h2>
        <p style={styles.sub}>{schema.help}</p>
        <form onSubmit={submit}>
          {schema.fields.map(input => (
            <label key={input.key} style={styles.field}>
              <span style={styles.label}>{input.label}</span>
              <input
                type={input.type || 'text'}
                autoComplete={input.autoComplete}
                value={values[input.key] || ''}
                onChange={(event) => setValues(current => ({ ...current, [input.key]: event.target.value }))}
                placeholder={input.placeholder}
                required={input.required !== false}
                style={styles.input}
              />
              {input.help && <span style={styles.fieldHelp}>{input.help}</span>}
            </label>
          ))}
          {error && <div role="alert" style={styles.error}>{error}</div>}
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
  sub: { margin: '0 0 20px', color: 'var(--text-tertiary, #64748b)', fontSize: 13, lineHeight: 1.55 },
  field: { display: 'block', marginBottom: 16 },
  label: { display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: 10, background: 'var(--surface-card, #fff)', color: 'inherit' },
  fieldHelp: { display: 'block', marginTop: 4, color: 'var(--text-tertiary, #64748b)', fontSize: 11 },
  error: { color: '#b91c1c', background: '#fef2f2', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
  submit: { width: '100%', border: 0, borderRadius: 10, padding: 12, background: '#0f172a', color: '#fff', fontWeight: 800, cursor: 'pointer' },
};
