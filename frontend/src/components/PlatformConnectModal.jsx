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
  const submit = async event => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const normalized = Object.fromEntries(fields.map(field => [field.key, field.normalization === 'trim' ? (values[field.key] || '').trim() : (values[field.key] || '')]));
      await connectionsAPI.connect(workspaceId, provider.key, normalized, account?.id);
      if (!alive.current) return;
      onConnected?.();
      onClose?.();
    } catch (failure) {
      if (alive.current) setError(apiError(failure).code === 'account_mismatch' ? 'connections.mismatch' : 'connections.mutationFailed');
    } finally {
      if (alive.current) setPending(false);
    }
  };
  return <Dialog initialFocusRef={firstField} open={open} title={t('botConnect.title', undefined, { platform: provider.titles[isPersian ? 'fa' : 'en'] })}
    description={t('connections.formHelp')} closeOnBackdrop={!pending} showClose={!pending} onClose={() => { if (!pending) onClose?.(); }}>
    <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
      {fields.map((field, index) => <Input ref={index === 0 ? firstField : undefined} key={field.key} label={field[isPersian ? 'title_fa' : 'title_en']}
        type={field.secret ? 'password' : 'text'} autoComplete="off" showPasswordToggle={false} required={field.required}
        dir="ltr" maxLength={2048} disabled={pending} value={values[field.key] || ''}
        onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} />)}
      {error && <DataState state="error" title={t(error)} compact />}
      <Button type="submit" loading={pending}>{t('connections.submit')}</Button>
    </form>
  </Dialog>;
}
