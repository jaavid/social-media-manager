/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useRef, useState } from 'react';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { profileAPI } from '@/services/domains/identity';
import { parseAgency, parseDisconnect } from '@/lib/settingsRecovery';
import { AccountScope, useAccountRead, useCheckedAction, ReadState, WriteState } from './accountRecovery';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
export default function AgencySection() {
  return <AccountScope>{(identity, enabled, key) => <Agency key={`${key}:${enabled}`} identity={identity} enabled={enabled} />}</AccountScope>;
}
function Agency({ identity, enabled }) {
  const { t } = useLanguage(), { refreshAuth } = useSession();
  const resource = useAccountRead('agency', identity, enabled, profileAPI.agencyInfo, parseAgency);
  const action = useCheckedAction();
  const [open, setOpen] = useState(false), [observed, setObserved] = useState(false), [acknowledged, setAcknowledged] = useState(false), [sessionError, setSessionError] = useState(false);
  const cancel = useRef(null), trigger = useRef(null), heading = useRef(null);
  const refreshSession = async () => { try { await refreshAuth(); if (action.alive.current) setSessionError(false); } catch { if (action.alive.current) setSessionError(true); } };
  const refresh = async () => {
    const result = await resource.query.refetch();
    if (action.alive.current && result.isSuccess && action.uncertain) {
      setObserved(!result.data.connected);
      action.verified(); setOpen(false);
      if (!result.data.connected) await refreshSession();
    }
    return result;
  };
  const disconnect = () => {
    if (resource.denied || action.denied || !resource.data?.connected) return;
    action.run(async () => parseDisconnect((await profileAPI.disconnectAgency()).data), async () => {
      setAcknowledged(true); setOpen(false); await resource.commit({ connected: false });
      if (action.alive.current) await refreshSession();
    });
  };
  return <Card padding="md"><section className="space-y-4" aria-label={t('agency.title')}>
    <h3 ref={heading} tabIndex={-1}>{t('agency.title')}</h3><ReadState resource={resource} refresh={refresh} busy={action.busy} returnFocusRef={heading} />
    {!resource.denied && !action.denied && resource.data && <>
      {resource.data.connected ? <><p>{resource.data.agency_name}</p><bdi dir="ltr">{resource.data.agency_email}</bdi>
        <Button ref={trigger} variant="danger" disabled={action.locked} onClick={() => setOpen(true)}>{t('agency.disconnect')}</Button></> : <p>{t('agency.none')}</p>}
      {observed && <p role="status">{t('agency.observed')}</p>}{acknowledged && <p role="status">{t('agency.saved')}</p>}
    </>}
    {(!open || resource.denied || action.denied) && <WriteState action={action} recover={refresh} uncertainKey="agency.unknown" />}
    {sessionError && <div role="alert"><p>{t('agency.sessionFailed')}</p><Button onClick={refreshSession}>{t('recovery.retry')}</Button></div>}
    <Modal open={open && !resource.denied && !action.denied} role="alertdialog" title={t('agency.disconnect')} description={t('agency.hint')} initialFocusRef={cancel} returnFocusRef={action.success ? heading : trigger}
      showClose={!action.busy} closeOnBackdrop={!action.busy} onClose={() => { if (!action.busy && !action.uncertain) setOpen(false); }}
      footer={<><Button ref={cancel} variant="ghost" disabled={action.busy || action.uncertain} onClick={() => setOpen(false)}>{t('recovery.cancel')}</Button><Button variant="danger" disabled={action.locked} onClick={disconnect}>{t('agency.disconnect')}</Button></>}>
      <WriteState action={action} recover={refresh} uncertainKey="agency.unknown" />
    </Modal>
  </section></Card>;
}
