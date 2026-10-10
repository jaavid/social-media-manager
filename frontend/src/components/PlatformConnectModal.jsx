/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { connectionsAPI } from '@/services/domains/connections';
import { apiError } from '@/services/http/errors';
import { useLanguage } from '@/i18n';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';

export default function PlatformConnectModal({ open, provider, account, workspaceId, onClose, onConnected }) {
  const { t, isPersian } = useLanguage();
  const [values, setValues] = useState({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const alive = useRef(true);
  const firstField = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  if (!provider) return null;
  const fields = provider.contract.auth.fields;
  const managed = provider.contract.auth.strategy === 'managed_bot';
  const bot = provider.managed_bot;
  const botMissing = managed && (!bot?.configured || !bot?.username || !bot?.verification_token);
  const submit = async event => {
    event.preventDefault();
    if (pending || botMissing) return;
    setPending(true);
    setError(null);
    try {
      const normalized = Object.fromEntries(fields.map(field => [field.key, field.normalization === 'trim' ? (values[field.key] || '').trim() : (values[field.key] || '')]));
      if (managed) normalized.verification_token = bot.verification_token;
      await connectionsAPI.connect(workspaceId, provider.key, normalized, account?.id);
      if (!alive.current) return;
      onConnected?.();
      onClose?.();
    } catch (failure) {
      if (alive.current) {
        const errors = {
          account_mismatch: 'connections.mismatch',
          ...(managed ? {
            permission_denied: 'botConnect.permissionDenied',
            invalid_destination: 'botConnect.channelRequired',
            missing_config: 'botConnect.notConfigured',
            channel_verification_required: 'botConnect.verificationRequired',
          } : {}),
        };
        setError(errors[apiError(failure).code] || 'connections.mutationFailed');
      }
    } finally {
      if (alive.current) setPending(false);
    }
  };
  return <Dialog initialFocusRef={firstField} open={open} title={t('botConnect.title', undefined, { platform: provider.titles[isPersian ? 'fa' : 'en'] })}
    description={t(managed ? 'botConnect.managedHelp' : 'connections.formHelp')} closeOnBackdrop={!pending} showClose={!pending} onClose={() => { if (!pending) onClose?.(); }}>
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      {managed && <div className="space-y-2 text-sm">
        {botMissing ? <DataState state="error" title={t('botConnect.notConfigured')} compact /> : <>
          <p>{t('botConnect.addAdmin')}</p>
          <code dir="ltr" className="block select-all">@{bot.username}</code>
          <p>{t('botConnect.permissionHelp')}</p>
          <p>{t('botConnect.ownershipHelp')}</p>
          <code dir="ltr" className="block select-all">{bot.verification_code}</code>
        </>}
      </div>}
      {fields.map((field, index) => <Input ref={index === 0 ? firstField : undefined} key={field.key} label={field[isPersian ? 'title_fa' : 'title_en']}
        type={field.secret ? 'password' : 'text'} autoComplete="off" showPasswordToggle={false} required={field.required}
        dir="ltr" data-ltr="true" maxLength={2048} disabled={pending} value={values[field.key] || ''}
        onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} />)}
      {error && <DataState state="error" title={t(error)} compact />}
      <Button type="submit" loading={pending} disabled={botMissing}>{t(managed ? 'botConnect.verifyChannel' : 'connections.submit')}</Button>
    </form>
  </Dialog>;
}
