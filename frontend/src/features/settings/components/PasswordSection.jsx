/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useRef, useState } from 'react';
import { useLanguage } from '@/i18n';
import { profileAPI } from '@/services/domains/identity';
import { parsePasswordProfile, parsePasswordChange } from '@/lib/keyPasswordRecovery';
import { AccountScope, useAccountRead, useCheckedAction, ReadState, WriteState } from './accountRecovery';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { MFAManager, ActiveSessionsList } from './SecuritySections';
export default function PasswordSection() {
  return <AccountScope>{(identity, enabled, key) => <Password key={`${key}:${enabled}`} identity={identity} enabled={enabled} />}</AccountScope>;
}
function Password({ identity, enabled }) {
  const { t } = useLanguage();
  const resource = useAccountRead('password-profile', identity, enabled, profileAPI.get, v => parsePasswordProfile(v, identity[0]));
  const action = useCheckedAction();
  const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [validation, setValidation] = useState(null);
  const heading = useRef(null);
  const submit = e => {
    e.preventDefault();
    if (action.locked || resource.denied || action.denied || !resource.data || resource.data.is_social) return;
    setValidation(null);
    if (!current || !password || !confirm) { setValidation('password.required'); return; }
    if (password !== confirm) { setValidation('password.mismatch'); return; }
    if (password.length < 8) { setValidation('password.short'); return; }
    action.run(async () => parsePasswordChange((await profileAPI.changePassword({ current_password: current, new_password: password, confirm_password: confirm })).data), () => {
      setCurrent(''); setPassword(''); setConfirm(''); heading.current?.focus();
    });
  };
  return <div className="space-y-6 p-6"><Card padding="md"><section aria-label={t('password.title')} className="space-y-4">
    <h3 ref={heading} tabIndex={-1}>{t('password.title')}</h3>
    <ReadState resource={resource} refresh={() => resource.query.refetch()} busy={action.busy} returnFocusRef={heading} />
    {resource.data && !action.denied && (resource.data.is_social ? <p>{t('password.social')}</p> : <>
      <p className="text-sm text-muted-foreground">{t('password.sessions')}</p>
      <form onSubmit={submit} className="space-y-3" aria-busy={action.busy}>
        <Input label={t('password.current')} type="password" autoComplete="current-password" value={current} disabled={action.busy} required onChange={e => setCurrent(e.target.value)} />
        <Input label={t('password.new')} type="password" autoComplete="new-password" value={password} disabled={action.busy} required onChange={e => setPassword(e.target.value)} />
        <Input label={t('password.confirm')} type="password" autoComplete="new-password" value={confirm} disabled={action.busy} required onChange={e => setConfirm(e.target.value)} />
        {validation && <p role="alert">{t(validation)}</p>}
        <Button type="submit" disabled={action.locked || resource.query.isFetching}>{t('password.submit')}</Button>
      </form>
    </>)}
    <WriteState action={action} uncertainKey="password.unknown" />
    {action.success && <p role="status">{t('password.saved')}</p>}
  </section></Card><MFAManager /><ActiveSessionsList /></div>;
}
