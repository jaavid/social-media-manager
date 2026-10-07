/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Image from 'next/image';
import { useRef, useState } from 'react';
import { useLanguage } from '@/i18n';
import { mfaAPI } from '@/services/domains/identity';
import { parseMfaStatus, parseMfaSetup, parseBackupCodes, parseOk } from '@/lib/accountRecovery';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';
import {
  AccountScope,
  useAccountRead,
  useCheckedAction,
  ReadState,
  WriteState,
} from './accountRecovery';

export default function MFAManager() {
  return (
    <AccountScope>
      {(identity, enabled, key) => <Mfa key={key} identity={identity} enabled={enabled} />}
    </AccountScope>
  );
}
function Mfa({ identity, enabled }) {
  const { t, formatNumber } = useLanguage();
  const resource = useAccountRead('mfa', identity, enabled, mfaAPI.status, parseMfaStatus);
  const action = useCheckedAction();
  const [setup, setSetup] = useState(null),
    [code, setCode] = useState(''),
    [password, setPassword] = useState(''),
    [codes, setCodes] = useState(null),
    [dialog, setDialog] = useState(null),
    [lost, setLost] = useState(null),
    [copyState, setCopyState] = useState(null),
    [copyBusy, setCopyBusy] = useState(false);
  const heading = useRef(null),
    trigger = useRef(null),
    cancel = useRef(null),
    otp = useRef(null),
    copyLock = useRef(false),
    intent = useRef(null);
  const denied = resource.denied || action.denied;
  const status = denied ? undefined : resource.data;
  const blocked = action.locked || denied || !status || resource.query.isFetching;
  const refresh = async () => {
    if (action.busy) return;
    const result = await resource.query.refetch();
    if (!action.alive.current || !result.isSuccess) return;
    const wasUncertain = action.uncertain;
    action.verified();
    if (wasUncertain) {
      setDialog(null);
      if (intent.current === 'verify' && result.data.enabled) {
        setSetup(null);
        setLost('mfa.lostCodes');
      } else if (intent.current === 'regenerate') setLost('mfa.lostCodes');
      else if (intent.current === 'setup' && result.data.pending) setLost('mfa.lostSetup');
    }
    // A verified changed state invalidates an obsolete seed; failures never clear it.
    if (result.data.enabled) setSetup(null);
    heading.current?.focus();
    return result;
  };
  const open = (type, event) => {
    trigger.current = event.currentTarget;
    setDialog(type);
    setPassword('');
    setCode('');
  };
  const mutate = (type) => {
    if (
      blocked ||
      (['verify', 'regenerate', 'disable'].includes(type) && !/^\d{6}$/.test(code)) ||
      (type === 'disable' && !password)
    )
      return;
    intent.current = type;
    action.run(
      async () => {
        if (type === 'setup') return parseMfaSetup((await mfaAPI.setup()).data);
        if (type === 'verify') return parseBackupCodes((await mfaAPI.verifySetup(code)).data);
        if (type === 'regenerate')
          return parseBackupCodes((await mfaAPI.regenerateBackupCodes(code)).data, true);
        parseOk((await mfaAPI.disable({ password, code })).data);
        return null;
      },
      async (result) => {
        if (type === 'setup') {
          setSetup(result);
          setDialog(null);
          setLost(null);
          setCode('');
        } else if (type === 'verify' || type === 'regenerate') {
          setCodes(result);
          setSetup(null);
          setDialog(null);
          setCode('');
          setCopyState(null);
          setLost(null);
        } else {
          setSetup(null);
          setCodes(null);
          setDialog(null);
          setCode('');
          setPassword('');
        }
        await resource.commit((old) => ({
          ...old,
          enabled: type === 'verify' || type === 'regenerate',
          pending: type === 'setup',
          backup_codes_remaining: type === 'verify' || type === 'regenerate' ? result.length : 0,
        }));
        if (!action.alive.current) return;
        // Background GET never owns enrollment/just-issued codes.
        await resource.query.refetch();
        if (action.alive.current) (type === 'setup' ? otp : heading).current?.focus();
      },
    );
  };
  const copy = async () => {
    if (copyLock.current || !codes) return;
    copyLock.current = true;
    setCopyBusy(true);
    setCopyState(null);
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      if (action.alive.current) setCopyState('mfa.copied');
    } catch {
      if (action.alive.current) setCopyState('mfa.copyFailed');
    } finally {
      copyLock.current = false;
      if (action.alive.current) setCopyBusy(false);
    }
  };
  return (
    <Card padding="md">
      <section aria-label={t('mfa.title')} className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 ref={heading} tabIndex={-1} className="font-semibold">
            {t('mfa.title')}
          </h3>
          <Button disabled={resource.query.isFetching || action.busy} onClick={refresh}>
            {t('recovery.refresh')}
          </Button>
        </div>
        <ReadState
          resource={resource}
          refresh={refresh}
          busy={action.busy}
          returnFocusRef={heading}
        />
        {(!dialog || resource.denied || action.denied) && (
          <WriteState action={action} recover={refresh} uncertainKey="mfa.uncertain" />
        )}
        {lost && !denied && <DataState compact state="partial" title={t(lost)} />}
        {!denied && status && (
          <>
            <p role="status">
              {t(
                status.enabled
                  ? 'mfa.enabled'
                  : status.pending
                    ? 'mfa.pendingSetup'
                    : 'mfa.disabled',
              )}
            </p>
            {status.enabled && (
              <p>
                {t('mfa.remaining', undefined, {
                  count: formatNumber(status.backup_codes_remaining),
                })}
              </p>
            )}
            {setup && (
              <div className="space-y-3" data-mfa-sensitive="true">
                <p>{t('mfa.scan')}</p>
                <Image
                  unoptimized
                  width={180}
                  height={180}
                  src={setup.qr_data_uri}
                  alt={t('mfa.qr')}
                />
                <p>
                  {t('mfa.secret')}{' '}
                  <code dir="ltr" className="break-all select-all">
                    {setup.secret}
                  </code>
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    mutate('verify');
                  }}
                  className="space-y-3"
                >
                  <Input
                    ref={otp}
                    label={t('mfa.code')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    maxLength={6}
                    disabled={action.busy}
                  />
                  <Button
                    type="submit"
                    aria-label={t('mfa.verify')}
                    loading={action.busy}
                    disabled={blocked || !/^\d{6}$/.test(code)}
                  >
                    {t('mfa.verify')}
                  </Button>
                  <Button
                    disabled={action.busy || action.uncertain}
                    variant="ghost"
                    onClick={() => {
                      setSetup(null);
                      setCode('');
                      heading.current?.focus();
                    }}
                  >
                    {t('recovery.cancel')}
                  </Button>
                </form>
              </div>
            )}
            {codes && (
              <div className="space-y-3" data-mfa-sensitive="true">
                <p role="status">{t('mfa.saveCodes')}</p>
                <div dir="ltr" className="grid grid-cols-2 gap-2 font-mono">
                  {codes.map((c) => (
                    <code key={c}>{c}</code>
                  ))}
                </div>
                <Button onClick={copy} disabled={copyBusy}>
                  {t('mfa.copy')}
                </Button>
                <Button
                  onClick={() => {
                    setCodes(null);
                    setCopyState(null);
                    heading.current?.focus();
                  }}
                >
                  {t('mfa.saved')}
                </Button>
                {copyState && (
                  <p role={copyState === 'mfa.copyFailed' ? 'alert' : 'status'}>{t(copyState)}</p>
                )}
              </div>
            )}
            {!setup && !codes && (
              <div className="flex flex-wrap gap-3">
                {!status.enabled ? (
                  <Button disabled={blocked} onClick={(e) => open('setup', e)}>
                    {t(status.pending ? 'mfa.restart' : 'mfa.setup')}
                  </Button>
                ) : (
                  <>
                    <Button disabled={blocked} onClick={(e) => open('regenerate', e)}>
                      {t('mfa.regenerate')}
                    </Button>
                    <Button variant="danger" disabled={blocked} onClick={(e) => open('disable', e)}>
                      {t('mfa.disable')}
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
        <Modal
          open={!!dialog && !denied}
          role="alertdialog"
          title={t(`mfa.${dialog || 'setup'}`)}
          description={t(
            dialog === 'disable'
              ? 'mfa.disableHint'
              : dialog === 'regenerate'
                ? 'mfa.rotateHint'
                : 'mfa.setupHint',
          )}
          initialFocusRef={cancel}
          returnFocusRef={action.busy || resource.denied || action.denied ? heading : trigger}
          showClose={!action.busy}
          closeOnBackdrop={!action.busy}
          onClose={() => {
            if (!action.busy) setDialog(null);
          }}
          footer={
            <>
              <Button
                ref={cancel}
                disabled={action.busy}
                variant="ghost"
                onClick={() => setDialog(null)}
              >
                {t('recovery.cancel')}
              </Button>
              <Button
                aria-label={t('account.confirm')}
                variant={dialog === 'disable' ? 'danger' : 'primary'}
                loading={action.busy}
                disabled={
                  blocked ||
                  (dialog !== 'setup' && !/^\d{6}$/.test(code)) ||
                  (dialog === 'disable' && !password)
                }
                onClick={() => mutate(dialog)}
              >
                {t('account.confirm')}
              </Button>
            </>
          }
        >
          {dialog === 'disable' && (
            <Input
              label={t('mfa.password')}
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={action.busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {dialog !== 'setup' && (
            <Input
              label={t('mfa.code')}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              value={code}
              disabled={action.busy}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          <WriteState action={action} recover={refresh} uncertainKey="mfa.uncertain" />
        </Modal>
      </section>
    </Card>
  );
}
