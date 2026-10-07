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
import { parseImmediateDeletion } from '@/lib/accountRecovery';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';
import { AccountScope, useCheckedAction, WriteState } from './accountRecovery';

/** Legacy client-only immediate DELETE is deliberately separate from 30-day privacy requests. */
export default function DeleteAccountSection(props) {
  return (
    <AccountScope>
      {(_identity, enabled, key) => <ImmediateDelete key={key} {...props} enabled={enabled} />}
    </AccountScope>
  );
}
function ImmediateDelete({ enabled, logout, navigate }) {
  const { t } = useLanguage();
  const action = useCheckedAction();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(''),
    [typed, setTyped] = useState(''),
    [confirmed, setConfirmed] = useState(false),
    [exitBusy, setExitBusy] = useState(false),
    [exitFailed, setExitFailed] = useState(false);
  const trigger = useRef(null),
    cancel = useRef(null),
    heading = useRef(null),
    exitLock = useRef(false);
  const finish = async () => {
    if (exitLock.current) return;
    exitLock.current = true;
    setExitBusy(true);
    setExitFailed(false);
    try {
      await logout();
      if (action.alive.current) navigate('/', { replace: true });
    } catch {
      if (action.alive.current) setExitFailed(true);
    } finally {
      exitLock.current = false;
      if (action.alive.current) setExitBusy(false);
    }
  };
  const exitState = confirmed && (
    <div className="space-y-3">
      <p role="status">{t('privacy.immediateConfirmed')}</p>
      {exitFailed && (
        <DataState
          compact
          state="error"
          title={t('privacy.logoutFailed')}
          action={
            <Button disabled={exitBusy} onClick={finish}>
              {t('privacy.signOut')}
            </Button>
          }
        />
      )}
    </div>
  );
  const submit = () => {
    if (!enabled || confirmed || action.locked || action.denied || typed !== 'DELETE') return;
    action.run(
      async () => parseImmediateDeletion((await profileAPI.deleteAccount({ reason })).data),
      async () => {
        // Logout/navigation only follow the distinct verified immediate-deletion DTO.
        setConfirmed(true);
        await finish();
      },
    );
  };
  return (
    <section
      aria-label={t('privacy.immediateTitle')}
      className="mt-8 space-y-3 border-t border-border pt-6"
    >
      <h3 ref={heading} tabIndex={-1} className="font-semibold text-destructive">
        {t('privacy.immediateTitle')}
      </h3>
      <p>{t('privacy.immediateHint')}</p>
      <Button
        ref={trigger}
        variant="danger"
        disabled={!enabled || confirmed || action.locked || action.denied}
        onClick={() => setOpen(true)}
      >
        {t('privacy.immediateTitle')}
      </Button>
      {!open && exitState}
      {!open && <WriteState action={action} uncertainKey="privacy.immediateUnknown" />}
      <Modal
        open={open}
        role="alertdialog"
        title={t('privacy.immediateTitle')}
        description={t('privacy.immediateHint')}
        initialFocusRef={cancel}
        returnFocusRef={confirmed || action.locked || action.denied ? heading : trigger}
        showClose={!action.busy && !exitBusy}
        closeOnBackdrop={!action.busy && !exitBusy}
        onClose={() => {
          if (!action.busy && !exitBusy) setOpen(false);
        }}
        footer={
          <>
            <Button
              ref={cancel}
              disabled={action.busy || exitBusy}
              variant="ghost"
              onClick={() => {
                if (!action.busy && !exitBusy) setOpen(false);
              }}
            >
              {t('recovery.cancel')}
            </Button>
            <Button
              aria-label={t('account.confirm')}
              variant="danger"
              loading={action.busy}
              disabled={
                !enabled || confirmed || action.locked || action.denied || typed !== 'DELETE'
              }
              onClick={submit}
            >
              {t('account.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('privacy.reason')}
            maxLength={1000}
            value={reason}
            disabled={action.busy || exitBusy}
            onChange={(e) => setReason(e.target.value)}
          />
          <Input
            label={t('privacy.typeDelete')}
            dir="ltr"
            autoComplete="off"
            value={typed}
            disabled={action.busy || exitBusy}
            onChange={(e) => setTyped(e.target.value)}
          />
          {exitState}
          <WriteState action={action} uncertainKey="privacy.immediateUnknown" />
        </div>
      </Modal>
    </section>
  );
}
