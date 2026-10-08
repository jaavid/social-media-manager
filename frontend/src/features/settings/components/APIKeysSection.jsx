/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/i18n';
import { apiKeysAPI } from '@/services/domains/identity';
import { parseOk } from '@/lib/accountRecovery';
import { parseKeys, parseIssuedKey } from '@/lib/keyPasswordRecovery';
import { AccountScope, useAccountRead, useCheckedAction, ReadState, WriteState } from './accountRecovery';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';

export default function APIKeysSection() {
  return <AccountScope>{(identity, enabled, key) => <Keys key={`${key}:${enabled}`} identity={identity} enabled={enabled} />}</AccountScope>;
}
function Keys({ identity, enabled }) {
  const { t } = useLanguage();
  const workspace = identity[3] ?? identity[4];
  const [inactive, setInactive] = useState(false);
  // Always reconcile against the complete metadata collection, including revoked rows.
  const resource = useAccountRead('api-keys', identity, enabled,
    signal => apiKeysAPI.list(true, signal, workspace), parseKeys);
  const action = useCheckedAction();
  const [name, setName] = useState(''), [scopes, setScopes] = useState(''), [ips, setIps] = useState('');
  const [adjusted, setAdjusted] = useState(false);
  const [issued, setIssued] = useState(null), [target, setTarget] = useState(null);
  const [copied, setCopied] = useState(false), [copyFailed, setCopyFailed] = useState(false);
  const [checked, setChecked] = useState(false), [observed, setObserved] = useState(false);
  const copyGeneration = useRef(0);
  const heading = useRef(null), trigger = useRef(null), cancel = useRef(null);
  const denied = resource.denied || action.denied;
  useEffect(() => { if (denied) queueMicrotask(() => { if (action.alive.current) setIssued(null); }); }, [denied, action.alive]);
  const refresh = async () => {
    const result = await resource.query.refetch();
    if (!action.alive.current || !result.isSuccess) return result;
    if (action.uncertain) {
      setChecked(true);
      // Inactivity is observable. This is not proof of which request revoked it.
      if (target !== 'create') setObserved(result.data.some(k => k.id === target && !k.is_active));
    }
    return result;
  };
  const split = value => value.split(',').map(s => s.trim()).filter(Boolean);
  const generate = () => {
    if (denied || !resource.data || !name.trim() || issued) return;
    const payload = { name: name.trim(), scopes: split(scopes), ip_allowlist: split(ips) };
    setTarget('create'); setChecked(false); setObserved(false);
    action.run(async () => parseIssuedKey((await apiKeysAPI.create(payload, workspace)).data, payload), async result => {
      copyGeneration.current += 1;
      setIssued(result.secret); setAdjusted(result.adjusted); setCopied(false); setCopyFailed(false);
      await resource.commit(old => [result.metadata, ...(old || []).filter(k => k.id !== result.metadata.id)]);
      if (!action.alive.current) return;
      setName(''); setScopes(''); setIps(''); setTarget(null);
      void resource.query.refetch();
    });
  };
  const revoke = () => {
    if (denied || target === null || target === 'create' || !resource.data) return;
    const id = target;
    setChecked(false); setObserved(false);
    action.run(async () => parseOk((await apiKeysAPI.revoke(id, undefined, workspace)).data), async () => {
      if (resource.data.some(k => k.id === id && k.key_prefix === issued?.slice(0, 12))) setIssued(null);
      setTarget(null);
      await resource.commit(old => old.map(k => k.id === id ? { ...k, is_active: false } : k));
      if (action.alive.current) void resource.query.refetch();
    });
  };
  const copy = async () => {
    const generation = copyGeneration.current;
    setCopied(false); setCopyFailed(false);
    try { await navigator.clipboard.writeText(issued); if (action.alive.current && generation === copyGeneration.current) setCopied(true); }
    catch { if (action.alive.current && generation === copyGeneration.current) setCopyFailed(true); }
  };
  const rows = resource.data?.filter(k => inactive || k.is_active);
  const write = <WriteState action={action} recover={refresh} uncertainKey={target === 'create' ? 'keys.unknownCreate' : 'keys.unknownRevoke'} />;
  return <Card padding="md"><section aria-label={t('keys.title')} className="space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><h3 ref={heading} tabIndex={-1}>{t('keys.title')}</h3>
      <Button onClick={refresh} disabled={resource.query.isFetching || action.busy}>{t('recovery.refresh')}</Button></div>
    <ReadState resource={resource} refresh={refresh} busy={action.busy} returnFocusRef={heading} />
    {(!target || target === 'create' || denied) && write}
    {!denied && <>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); generate(); }} aria-busy={action.busy}>
        <Input label={t('keys.name')} value={name} maxLength={200} required disabled={action.busy} onChange={e => setName(e.target.value)} />
        <Input label={t('keys.scopes')} value={scopes} dir="ltr" disabled={action.busy} onChange={e => setScopes(e.target.value)} />
        <Input label={t('keys.ips')} value={ips} dir="ltr" disabled={action.busy} onChange={e => setIps(e.target.value)} />
        <p className="text-sm text-muted-foreground">{t('keys.policy')}</p>
        <Button type="submit" disabled={action.locked || !resource.data || !!issued || resource.query.isFetching}>{t('keys.generate')}</Button>
      </form>
      {action.success && <p role="status">{t('account.saved')}</p>}
      {issued && <div className="space-y-3 rounded border p-3">
        <p>{t('keys.once')}</p>{adjusted && <p role="alert">{t('keys.adjusted')}</p>}<div dir="ltr" className="break-all select-all">{issued}</div>
        <Button onClick={copy}>{t('keys.copy')}</Button> <Button variant="ghost" onClick={() => { copyGeneration.current += 1; setIssued(null); }}>{t('keys.dismiss')}</Button>
        {copied && <p role="status">{t('keys.copied')}</p>}{copyFailed && <p role="alert">{t('keys.copyFailed')}</p>}
      </div>}
      <label className="flex gap-2"><input type="checkbox" checked={inactive} onChange={e => setInactive(e.target.checked)} />{t('keys.inactive')}</label>
      {rows && <ul aria-busy={resource.query.isFetching} className="divide-y divide-border">{rows.map(k => <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0"><p className="break-words">{k.name}</p><p className="text-sm"><bdi dir="ltr">{k.key_prefix}… · {k.scopes.join(', ') || '—'} · {k.ip_allowlist.join(', ') || '—'}</bdi></p>
          <p>{t(k.is_active ? 'keys.active' : 'keys.inactiveState')}</p></div>
        {k.is_active && <Button variant="danger" disabled={action.locked || resource.query.isFetching} onClick={e => { trigger.current = e.currentTarget; setTarget(k.id); }}>{t('keys.revoke')}</Button>}
      </li>)}</ul>}
      {rows?.length === 0 && !resource.query.isError && !resource.query.isPaused && <DataState compact state={resource.data.length ? 'no-results' : 'empty'} title={t(resource.data.length ? 'keys.noResults' : 'keys.empty')} />}
      {action.uncertain && checked && target === 'create' && <div className="space-y-3"><p role="status">{t(observed ? 'keys.observedInactive' : 'keys.checked')}</p>
        <Button onClick={() => { action.verified(); setTarget(null); setChecked(false); }} >{t('keys.acknowledge')}</Button></div>}
    </>}
    <Modal open={target !== null && target !== 'create' && !denied} role="alertdialog" title={t('keys.revoke')} description={t('keys.revokeHint')}
      initialFocusRef={cancel} returnFocusRef={action.busy || action.success ? heading : trigger} showClose={!action.busy} closeOnBackdrop={!action.busy}
      onClose={() => { if (!action.busy && !action.uncertain) setTarget(null); }}
      footer={<><Button ref={cancel} disabled={action.busy || action.uncertain} variant="ghost" onClick={() => setTarget(null)}>{t('recovery.cancel')}</Button><Button variant="danger" onClick={revoke} disabled={action.locked || resource.query.isFetching}>{t('keys.revoke')}</Button></>}>
      {write}
      {action.uncertain && checked && <><p>{t(observed ? 'keys.observedInactive' : 'keys.checked')}</p><Button onClick={() => { action.verified(); setTarget(null); setChecked(false); }}>{t('keys.acknowledge')}</Button></>}
    </Modal>
  </section></Card>;
}
