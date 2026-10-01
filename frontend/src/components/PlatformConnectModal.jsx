/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { botChannelsAPI } from '../services/botChannels';
import { getApiErrorCode } from '../services/apiErrors';
import { useLanguage } from '../i18n';

const submitters = {
  bot_token: (clientId, platform, values) => botChannelsAPI.connect(clientId, platform.key, values),
  api_credentials: (clientId, platform, values) => botChannelsAPI.connect(clientId, platform.key, values),
};

export default function PlatformConnectModal({ open, platform, clientId, onClose, onConnected }) {
  const { t, isPersian } = useLanguage();
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
  const label = isPersian
    ? (platform.labels?.fa || platform.labels?.default || platform.key)
    : (platform.labels?.en || platform.labels?.default || platform.key);
  const isBot = platform.authType === 'bot_token';
  const description = isBot
    ? t('botConnect.description')
    : (isPersian
      ? 'اطلاعات دسترسی API را وارد کنید. سرور اعتبار آن را پیش از ذخیره‌سازی بررسی می‌کند.'
      : 'Enter the API credentials. The server verifies them before storing the credential.');

  const fieldLabel = (input) => {
    if (input.key === 'token') return t('botConnect.token');
    if (input.key === 'destination_id') return t('botConnect.destination');
    if (input.key === 'api_key') return isPersian ? 'کلید API' : 'API key';
    return input.label;
  };

  const fieldPlaceholder = (input) => {
    if (input.key === 'destination_id') return t('botConnect.destinationPlaceholder');
    return input.placeholder;
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const handler = submitters[platform.authType];
      if (!handler) {
        setError(t('errors.connectionFailed'));
        return;
      }
      const payload = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, String(value || '').trim()])
      );
      await handler(clientId, platform, payload);
      await onConnected?.();
      onClose?.();
    } catch (err) {
      const code = getApiErrorCode(err, 'connectionFailed');
      setError(t(`errors.${code}`, t('errors.connectionFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label={t('botConnect.title', undefined, { platform: label })}>
        <button onClick={onClose} style={styles.close} aria-label={t('common.close')}><X size={18} /></button>
        <h2 style={styles.title}>{t('botConnect.title', undefined, { platform: label })}</h2>
        <p style={styles.sub}>{description}</p>
        <form onSubmit={submit}>
          {schema.fields.map(input => (
            <label key={input.key} style={styles.field}>
              <span style={styles.label}>{fieldLabel(input)}</span>
              <input
                type={input.type || 'text'}
                autoComplete={input.autoComplete}
                value={values[input.key] || ''}
                onChange={(event) => setValues(current => ({ ...current, [input.key]: event.target.value }))}
                placeholder={fieldPlaceholder(input)}
                required={input.required !== false}
                dir="ltr"
                style={styles.input}
              />
              {input.help && <span style={styles.fieldHelp}>{input.help}</span>}
            </label>
          ))}
          {error && <div role="alert" style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.submit}>
            {loading
              ? t('botConnect.verifying')
              : t('botConnect.submit', undefined, { platform: label })}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 16 },
  modal: { width: 'min(520px, 100%)', background: 'var(--surface-card, #fff)', color: 'var(--text-primary, #0f172a)', borderRadius: 18, padding: 24, position: 'relative', boxShadow: '0 24px 70px rgba(0,0,0,.2)' },
  close: { position: 'absolute', insetInlineEnd: 14, top: 14, border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit' },
  title: { margin: '0 0 6px', fontSize: 22 },
  sub: { margin: '0 0 20px', color: 'var(--text-tertiary, #64748b)', fontSize: 13, lineHeight: 1.55 },
  field: { display: 'block', marginBottom: 16 },
  label: { display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6 },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: 10, background: 'var(--surface-card, #fff)', color: 'inherit' },
  fieldHelp: { display: 'block', marginTop: 4, color: 'var(--text-tertiary, #64748b)', fontSize: 11 },
  error: { color: '#b91c1c', background: '#fef2f2', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 },
  submit: { width: '100%', border: 0, borderRadius: 10, padding: 12, background: '#0f172a', color: '#fff', fontWeight: 800, cursor: 'pointer' },
};
