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
import { privacyAPI } from '@/services/domains/identity';
import {
  parseExport,
  parseExports,
  parseConsents,
  parseConsentWrite,
  parseProcessing,
  parseProcessingWrite,
  parseDeletion,
  parseDeletionStatus,
} from '@/lib/accountRecovery';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';
import {
  AccountScope,
  useAccountRead,
  useCheckedAction,
  ReadState,
  WriteState,
} from './accountRecovery';

export default function DataPrivacySection() {
  return (
    <AccountScope>
      {(identity, enabled, key) => <Privacy key={key} identity={identity} enabled={enabled} />}
    </AccountScope>
  );
}
function Privacy(props) {
  const { t } = useLanguage();
  return (
    <section aria-label={t('privacy.title')} className="min-w-0 space-y-4 p-4 sm:p-8">
      <h2 className="text-lg font-semibold">{t('privacy.title')}</h2>
      <Exports {...props} />
      <Consents {...props} />
      <Processing {...props} />
      <Deletion {...props} />
    </section>
  );
}
/** Each reader/action owns its failures; no aggregate default/fallback state. */
function PrivacyCard({ titleKey, resource, action, refresh, children }) {
  const { t } = useLanguage();
  const heading = useRef(null);
  return (
    <Card padding="md">
      <section aria-label={t(titleKey)} className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 ref={heading} tabIndex={-1} className="font-semibold">
            {t(titleKey)}
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
        {children}
      </section>
    </Card>
  );
}
function usePrivacyResource(name, identity, enabled, read, parse) {
  const resource = useAccountRead(name, identity, enabled, read, parse),
    action = useCheckedAction();
  const refresh = async () => {
    if (action.busy) return;
    const result = await resource.query.refetch();
    if (action.alive.current && result.isSuccess) action.verified();
    return result;
  };
  const data = resource.denied || action.denied ? undefined : resource.data;
  const blocked = action.locked || data === undefined || resource.query.isFetching;
  return { resource, action, refresh, data, blocked };
}
function Exports({ identity, enabled }) {
  const { t, formatDate } = useLanguage();
  const [now] = useState(() => Date.now());
  const { resource, action, refresh, data, blocked } = usePrivacyResource(
    'exports',
    identity,
    enabled,
    privacyAPI.exportList,
    parseExports,
  );
  const request = () => {
    if (blocked || data.some((r) => ['queued', 'processing'].includes(r.status))) return;
    action.run(
      async () => {
        const row = parseExport((await privacyAPI.exportRequest()).data);
        if (['failed', 'expired'].includes(row.status)) throw new Error('Export was not accepted');
        return row;
      },
      async (row) => {
        await resource.commit((old) => [row, ...old.filter((r) => r.id !== row.id)]);
        if (action.alive.current) await resource.query.refetch();
      },
    );
  };
  return (
    <PrivacyCard titleKey="privacy.exports" {...{ resource, action, refresh }}>
      <WriteState action={action} recover={refresh} />
      {action.success && <p role="status">{t('privacy.exportAccepted')}</p>}
      {data !== undefined && (
        <>
          <Button
            disabled={blocked || data.some((r) => ['queued', 'processing'].includes(r.status))}
            onClick={request}
          >
            {t('privacy.requestExport')}
          </Button>
          {data.length ? (
            <ul className="space-y-2">
              {data.map((r) => (
                <li key={r.id}>
                  <bdi>#{r.id}</bdi> · {t(`privacy.export.${r.status}`)} ·{' '}
                  {formatDate(r.requested_at, { dateStyle: 'medium' })}
                  {r.status === 'completed' && Date.parse(r.expires_at) > now && (
                    <a
                      className="ms-3 underline"
                      href={r.download_url}
                      referrerPolicy="no-referrer"
                    >
                      {t('privacy.download')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !resource.query.isError &&
            !resource.query.isPaused && (
              <DataState compact state="empty" title={t('privacy.noExports')} />
            )
          )}
        </>
      )}
    </PrivacyCard>
  );
}
function Consents({ identity, enabled }) {
  const { t } = useLanguage();
  const { resource, action, refresh, data, blocked } = usePrivacyResource(
    'consents',
    identity,
    enabled,
    privacyAPI.consents,
    parseConsents,
  );
  const change = (type, given) => {
    if (blocked) return;
    action.run(
      async () => {
        parseConsentWrite((await privacyAPI.setConsent(type, given)).data, type, given);
      },
      async () => {
        await resource.commit((old) => ({ ...old, consents: { ...old.consents, [type]: given } }));
        if (action.alive.current) await resource.query.refetch();
      },
    );
  };
  return (
    <PrivacyCard titleKey="privacy.consents" {...{ resource, action, refresh }}>
      <WriteState action={action} recover={refresh} />
      {action.success && <p role="status">{t('account.saved')}</p>}
      {data &&
        (data.available.length ? (
          <div className="space-y-3">
            {data.available.map((r) => (
              <div key={r.type}>
                <Switch
                  className="rounded-lg p-2 focus-within:ring-2 focus-within:ring-ring [&>span>input]:z-10"
                  label={t(`privacy.consent.${r.type}`, r.label)}
                  checked={data.consents[r.type] === true}
                  disabled={blocked}
                  onChange={(e) => change(r.type, e.target.checked)}
                />
                {!Object.hasOwn(data.consents, r.type) && (
                  <p className="text-sm text-muted-foreground">{t('privacy.notRecorded')}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !resource.query.isError &&
          !resource.query.isPaused && (
            <DataState compact state="empty" title={t('privacy.noConsents')} />
          )
        ))}
    </PrivacyCard>
  );
}
function Processing({ identity, enabled }) {
  const { t } = useLanguage();
  const { resource, action, refresh, data, blocked } = usePrivacyResource(
    'processing',
    identity,
    enabled,
    privacyAPI.processingStatus,
    parseProcessing,
  );
  const change = (id, paused) => {
    if (blocked) return;
    action.run(
      async () => {
        parseProcessingWrite((await privacyAPI.setProcessingPaused(paused, id)).data, paused);
      },
      async () => {
        await resource.commit((old) =>
          old.map((r) => (r.id === id ? { ...r, is_processing_paused: paused } : r)),
        );
        if (action.alive.current) await resource.query.refetch();
      },
    );
  };
  return (
    <PrivacyCard titleKey="privacy.processing" {...{ resource, action, refresh }}>
      <p className="text-sm">{t('privacy.processingHint')}</p>
      <WriteState action={action} recover={refresh} />
      {action.success && <p role="status">{t('account.saved')}</p>}
      {data !== undefined &&
        (data.length ? (
          <ul className="space-y-3">
            {data.map((r) => (
              <li key={r.id}>
                <Switch
                  className="rounded-lg p-2 focus-within:ring-2 focus-within:ring-ring [&>span>input]:z-10"
                  label={r.name}
                  checked={r.is_processing_paused}
                  disabled={blocked}
                  onChange={(e) => change(r.id, e.target.checked)}
                />
                <p>{t(r.is_processing_paused ? 'privacy.paused' : 'privacy.running')}</p>
              </li>
            ))}
          </ul>
        ) : (
          !resource.query.isError &&
          !resource.query.isPaused && (
            <DataState compact state="empty" title={t('privacy.noWorkspaces')} />
          )
        ))}
    </PrivacyCard>
  );
}
function Deletion({ identity, enabled }) {
  const { t, formatDate } = useLanguage();
  const {
    resource,
    action,
    refresh: read,
    data,
    blocked,
  } = usePrivacyResource(
    'deletion',
    identity,
    enabled,
    privacyAPI.deletionStatus,
    parseDeletionStatus,
  );
  const [dialog, setDialog] = useState(null),
    [reason, setReason] = useState(''),
    [typed, setTyped] = useState('');
  const cancel = useRef(null),
    trigger = useRef(null),
    heading = useRef(null);
  const pending = data?.status === 'queued';
  const refresh = async () => {
    const result = await read();
    if (action.alive.current && result?.isSuccess) setDialog(null);
  };
  const submit = () => {
    if (blocked || !dialog || (dialog === 'request' && typed !== 'DELETE')) return;
    const captured = dialog;
    action.run(
      async () => {
        const row = parseDeletion(
          (
            await (captured === 'request'
              ? privacyAPI.deleteAccount(reason)
              : privacyAPI.cancelDeleteAccount())
          ).data,
        );
        if (
          row.status !== (captured === 'request' ? 'queued' : 'cancelled') ||
          (captured === 'cancel' && row.id !== data.id)
        )
          throw new Error('Invalid deletion outcome');
        return row;
      },
      async (row) => {
        await resource.commit(row);
        if (!action.alive.current) return;
        setDialog(null);
        setTyped('');
        setReason('');
        await resource.query.refetch();
        if (action.alive.current) heading.current?.focus();
      },
    );
  };
  return (
    <PrivacyCard titleKey="privacy.deletionTitle" {...{ resource, action, refresh }}>
      <h4 ref={heading} tabIndex={-1}>
        {t('privacy.graceHint')}
      </h4>
      {(!dialog || resource.denied || action.denied) && (
        <WriteState action={action} recover={refresh} />
      )}
      {action.success && <p role="status">{t('privacy.deletionAccepted')}</p>}
      {data !== undefined && (
        <>
          {data && (
            <p role="status">
              {t(`privacy.deletion.${data.status}`)} ·{' '}
              {formatDate(data.grace_until, { dateStyle: 'medium' })}
            </p>
          )}
          {data === null && !resource.query.isError && !resource.query.isPaused && (
            <DataState compact state="empty" title={t('privacy.noDeletion')} />
          )}
          <Button
            variant={pending ? 'secondary' : 'danger'}
            disabled={blocked || (data && !['queued', 'cancelled'].includes(data.status))}
            onClick={(e) => {
              trigger.current = e.currentTarget;
              setDialog(pending ? 'cancel' : 'request');
            }}
          >
            {t(pending ? 'privacy.cancelDeletion' : 'privacy.requestDeletion')}
          </Button>
        </>
      )}
      <Modal
        open={!!dialog && !resource.denied && !action.denied}
        role="alertdialog"
        initialFocusRef={cancel}
        returnFocusRef={action.busy || resource.denied || action.denied ? heading : trigger}
        title={t(dialog === 'cancel' ? 'privacy.cancelDeletion' : 'privacy.requestDeletion')}
        description={t('privacy.graceHint')}
        showClose={!action.busy}
        closeOnBackdrop={!action.busy}
        onClose={() => {
          if (!action.busy) setDialog(null);
        }}
        footer={
          <>
            <Button
              ref={cancel}
              variant="ghost"
              disabled={action.busy}
              onClick={() => setDialog(null)}
            >
              {t('recovery.cancel')}
            </Button>
            <Button
              aria-label={t('account.confirm')}
              variant="danger"
              loading={action.busy}
              disabled={blocked || (dialog === 'request' && typed !== 'DELETE')}
              onClick={submit}
            >
              {t('account.confirm')}
            </Button>
          </>
        }
      >
        {dialog === 'request' && (
          <div className="space-y-3">
            <Input
              label={t('privacy.reason')}
              value={reason}
              maxLength={1000}
              disabled={action.busy}
              onChange={(e) => setReason(e.target.value)}
            />
            <Input
              label={t('privacy.typeDelete')}
              value={typed}
              dir="ltr"
              autoComplete="off"
              disabled={action.busy}
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}
        <WriteState action={action} recover={refresh} />
      </Modal>
    </PrivacyCard>
  );
}
