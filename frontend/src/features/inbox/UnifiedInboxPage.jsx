/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useWorkspaceScope, { workspaceEventMatches } from '@/hooks/useWorkspaceScope';
import { useAppStore } from '@/stores/appStore';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { connectionsAPI } from '@/services/domains/connections';
import { workspacesAPI } from '@/services/domains/accounts';
import { inboxAPI } from '@/services/domains/messaging';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import { useConversations, useConversation, useReviews } from '@/hooks/useInbox';
import Page from '@/components/ui/Page';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import NativeSelect from '@/components/ui/NativeSelect';
import Card from '@/components/ui/Card';
import DataState from '@/components/ui/DataState';
import EngagementExtensions from '@/components/connections/engagementExtensions';
import AIReplySuggestions from '@/components/ai/AIReplySuggestions';
import { useRealtime } from '@/hooks/useRealtime';

const capability = { dm: 'inbox', comment: 'comments', review: 'reviews' };
const permission = { dm: 'reply_messages', comment: 'reply_comments', review: 'reply_reviews' };
const enabled = value => ['supported', 'beta'].includes(value);

export default function UnifiedInboxPage({ reviewsOnly = false }) {
  const { user } = useSession();
  const { t } = useLanguage();
  const scope = useWorkspaceScope();
  const chosenWorkspace = scope.workspaceId ?? '';
  const chooseWorkspace = id => useAppStore.getState().selectWorkspace(id, user.id, scope.pathname);
  const workspaceId = scope.workspaceId;
  const workspaces = useQuery({ queryKey: ['engagement.workspaces', user?.id], enabled: !user?.workspace_id && !user?.client_id,
    queryFn: async () => { const r = await workspacesAPI.list(); const rows = r.data?.results || r.data;
      if (!Array.isArray(rows)) throw new Error('Invalid workspace list'); return rows; }, retry: false });
  return <Page>
    <PageHeader title={t('engagement.title')} subtitle={t('engagement.description')} sticky={false} />
    {!user?.workspace_id && !user?.client_id && <label className="my-4 block">{t('engagement.workspace')}
      <NativeSelect value={chosenWorkspace} onChange={e => chooseWorkspace(e.target.value)}>
        <option value="">{t('engagement.workspace')}</option>
        {(workspaces.data || []).map(w => <option key={w.id} value={w.id}>{w.company || w.name}</option>)}
      </NativeSelect>
    </label>}
    {workspaces.error && <DataState state="error" title={t('engagement.error')} action={<Button onClick={() => workspaces.refetch()}>{t('engagement.retry')}</Button>} />}
    {workspaceId && <InboxWorkspace key={`${user?.id}:${workspaceId}`} workspaceId={workspaceId} reviewsOnly={reviewsOnly} />}
  </Page>;
}
function InboxWorkspace({ workspaceId, reviewsOnly }) {
  const { t, language } = useLanguage();
  const { user } = useSession();
  const metadata = useQuery({ queryKey: QK.connections(workspaceId), queryFn: ({ signal }) => connectionsAPI.get(workspaceId, signal), retry: false });
  const [accountId, setAccount] = useState('');
  const [requestedType, setType] = useState(reviewsOnly ? 'review' : 'dm');
  const types = Object.keys(capability).filter(kind => metadata.data?.providers.some(p => enabled(p.capabilities[capability[kind]])));
  const type = reviewsOnly || types.includes(requestedType) ? requestedType : types[0] || requestedType;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const scope = `${user?.id}:${workspaceId}:${accountId}:${type}:${search}:${page}`;
  const accounts = useMemo(() => (metadata.data?.providers || []).flatMap(provider =>
    provider.accounts.filter(account => account.permissions.view_inbox === true && enabled(provider.capabilities[capability[type]]))
      .map(account => ({ provider, account }))), [metadata.data, type]);
  const selected = accounts.find(a => String(a.account.id) === accountId);
  const params = useMemo(() => ({ workspace_id: workspaceId, ...(accountId ? { social_account: accountId } : {}), type, search, page }), [workspaceId, accountId, type, search, page]);
  const metadataDenied = metadata.error && ['authentication', 'permission'].includes(apiError(metadata.error).kind);
  const allowed = !!selected && !metadataDenied;
  const list = useConversations(params, scope, allowed && type !== 'review');
  const reviews = useReviews(params, scope, allowed && type === 'review');
  useRealtime(event => {
    if (!workspaceEventMatches(event, workspaceId)) return;
    if (event.type?.startsWith('inbox.')) { list.refetch(); reviews.refetch(); }
    if (event.type === 'credential.token_expired') metadata.refetch();
  });
  const resource = type === 'review' ? reviews : list;
  if (metadata.isPending) return <DataState state="loading" title={t('engagement.loading')} />;
  if (metadata.error && (!metadata.data || metadataDenied)) return <Failure error={metadata.error} retry={() => metadata.refetch()} />;
  return <>
    {metadata.error && <Failure error={metadata.error} retry={() => metadata.refetch()} preserved />}
    <div className="my-4 flex flex-wrap gap-3">
      {!reviewsOnly && <NativeSelect className="w-full sm:w-56" aria-label={t('engagement.title')} value={type} onChange={e => { setType(e.target.value); setAccount(''); setPage(1); }}>
        {Object.keys(capability).filter(kind => metadata.data.providers.some(p => enabled(p.capabilities[capability[kind]]))).map(kind => <option key={kind} value={kind}>{t(`engagement.${kind}`)}</option>)}
      </NativeSelect>}
      <NativeSelect className="w-full sm:w-56" aria-label={t('engagement.account')} value={selected ? accountId : ''} onChange={e => { setAccount(e.target.value); setPage(1); }}>
        <option value="">{t('engagement.account')}</option>
        {accounts.map(({ provider, account }) => <option key={account.id} value={account.id}>{provider.titles[language]} · {account.name || account.identity.name} · {account.destination.id}</option>)}
      </NativeSelect>
      <Input aria-label={t('engagement.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      <Button disabled={!allowed || resource.loading} onClick={resource.refetch}>{t('engagement.refresh')}</Button>
    </div>
    {selected && <EngagementExtensions names={selected.provider.contract.ui_extensions} accountId={selected.account.id} workspaceId={workspaceId} />}
    {accounts.length === 0 ? <DataState state="empty" title={t('engagement.unavailable')} /> : !selected ? <DataState state="empty" title={t('engagement.account')} /> :
      <InboxContent key={scope} resource={resource} scope={scope} params={params} selected={selected} type={type} metadataCurrent={!metadata.error} />}
    {allowed && resource.pagination && <div className="mt-4 flex gap-3">
      <Button disabled={!resource.pagination.previous || resource.loading} onClick={() => setPage(n => n - 1)}>{t('engagement.previous')}</Button>
      <Button disabled={!resource.pagination.next || resource.loading} onClick={() => setPage(n => n + 1)}>{t('engagement.next')}</Button>
    </div>}
  </>;
}
function Failure({ error, retry, preserved = false }) {
  const { t } = useLanguage(); const normalized = apiError(error);
  const forbidden = ['permission', 'authentication'].includes(normalized.kind);
  const offline = normalized.kind === 'unavailable' && typeof navigator !== 'undefined' && !navigator.onLine;
  return <DataState state={offline ? 'offline' : preserved && !forbidden ? 'partial' : forbidden ? 'forbidden' : 'error'}
    title={t(offline ? 'catalog.state.offline.title' : normalized.status === 404 ? 'engagement.notFound' : forbidden ? 'engagement.forbidden' : 'engagement.error')}
    description={preserved ? t('engagement.preserved') : undefined}
    action={<Button onClick={retry}>{t('engagement.retry')}</Button>} />;
}
function InboxContent({ resource, scope, params, selected, type, metadataCurrent }) {
  const { t } = useLanguage();
  const [activeId, setActive] = useState(null);
  const active = resource.data.find(row => row.id === activeId);
  const thread = useConversation(type === 'review' ? null : active?.id, scope, params);
  const data = type === 'review' ? active : thread.data;
  useRealtime(event => { if (workspaceEventMatches(event, params.workspace_id) && event.type?.startsWith('inbox.')) thread.refetch(); });
  const canReply = metadataCurrent && selected.account.health.ready && selected.account.engagement_readiness?.[capability[type]] === true && selected.account.permissions[permission[type]] === true;
  return <>
    {resource.error && <Failure error={resource.error} retry={resource.refetch} preserved={resource.data.length > 0} />}
    {resource.loading && <DataState state={resource.data.length ? 'refreshing' : 'loading'} title={t(resource.data.length ? 'engagement.refreshing' : 'engagement.loading')} compact />}
    {!resource.loading && !resource.error && resource.data.length === 0 && <DataState state={params.search ? 'no-results' : 'empty'} title={t(params.search ? 'engagement.noResults' : 'engagement.empty')} />}
    <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Card className={activeId ? 'hidden md:block' : ''}>
        {resource.data.map(row => <button key={row.id} type="button" aria-pressed={activeId === row.id} className="block w-full border-b border-border p-3 text-start focus-visible:outline focus-visible:outline-2" onClick={() => setActive(row.id)}>
          <span className="block font-semibold">{row.contact_name || row.contact_handle || row.reviewer_name}</span>
          <span className="block break-words text-sm text-muted-foreground">{row.last_message_preview || row.comment}</span>
        </button>)}
      </Card>
      <Card className={!activeId ? 'hidden md:block' : ''}>
        {activeId && <Button className="mb-3 md:hidden" onClick={() => setActive(null)}>{t('engagement.back')}</Button>}
        {thread.error && <Failure error={thread.error} retry={thread.refetch} preserved={!!thread.data} />}
        {thread.loading && <DataState state={thread.data ? 'refreshing' : 'loading'} title={t('engagement.loading')} compact />}
        {!activeId && <DataState state="empty" title={t('engagement.select')} />}
        {data && <ReplyThread key={data.id} thread={data} type={type} canReply={canReply && !thread.error} refresh={() => { resource.refetch(); thread.refetch(); }} />}
      </Card>
    </div>
  </>;
}
function ReplyThread({ thread, type, canReply, refresh }) {
  const { t } = useLanguage();
  const [text, setText] = useState(''); const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState(null); const [ambiguous, setAmbiguous] = useState(false);
  const busy = useRef(false); const mounted = useRef(true); const feedback = useRef(null);
  const readSent = useRef(false);
  useEffect(() => {
    if (type !== 'review' && thread.unread_count > 0 && !readSent.current) {
      readSent.current = true;
      inboxAPI.conversations.markRead(thread.id).then(() => { if (mounted.current) refresh(); }).catch(() => { readSent.current = false; });
    }
  }, [type, thread.id, thread.unread_count, refresh]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (outcome === 'failed' || outcome === 'ambiguous') feedback.current?.focus(); }, [outcome]);
  async function send(event) {
    event.preventDefault(); if (busy.current || !canReply || ambiguous || !text.trim() || thread.is_resolved) return;
    busy.current = true; setPending(true); setOutcome(null);
    try {
      const response = await (type === 'review' ? inboxAPI.reviews : inboxAPI.conversations).reply(thread.id, text.trim());
      if (!mounted.current) return;
      if (response.status === 202) { setOutcome('approval'); return; }
      if (![200, 201].includes(response.status) || !response.data || !Number.isSafeInteger(response.data.id)) throw new Error('Invalid reply result');
      setText(''); setOutcome('sent'); refresh();
    } catch (error) {
      if (!mounted.current) return;
      const failure = apiError(error); const unknown = !failure.status || failure.status >= 500;
      setAmbiguous(unknown); setOutcome(unknown ? 'ambiguous' : 'failed');
    } finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  async function update(operation) {
    if (busy.current) return; busy.current = true; setPending(true);
    try { await inboxAPI.conversations[operation](thread.id); if (mounted.current) { refresh(); setOutcome('updated'); } }
    catch { if (mounted.current) setOutcome('failed'); }
    finally { busy.current = false; if (mounted.current) setPending(false); }
  }
  return <>
    {type !== 'review' && <div className="mb-3 flex flex-wrap gap-2">
      <Button disabled={pending} onClick={() => update(thread.is_starred ? 'unstar' : 'star')}>{t('engagement.star')}</Button>
      <Button disabled={pending} onClick={() => update(thread.is_archived ? 'unarchive' : 'archive')}>{t('engagement.archive')}</Button>
      <Button disabled={pending} onClick={() => update(thread.is_resolved ? 'reopen' : 'resolve')}>{t('engagement.resolve')}</Button>
    </div>}
    <h2 className="break-words font-semibold">{thread.contact_name || thread.reviewer_name}</h2>
    <div className="my-4 max-h-96 space-y-3 overflow-auto" aria-busy={pending}>
      {(thread.messages || []).map(message => <p key={message.id} className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3">{message.content}</p>)}
      {type === 'review' && <p className="whitespace-pre-wrap break-words">{thread.comment}</p>}
    </div>
    {outcome && <div ref={feedback} tabIndex={-1} role={['failed', 'ambiguous'].includes(outcome) ? 'alert' : 'status'} className="my-3 rounded-lg border border-border p-3">{t(`engagement.${outcome}`)}</div>}
    {!canReply && <DataState state="forbidden" title={t('engagement.notReady')} compact />}
    {canReply && thread.messages?.some(m => m.direction === 'inbound') && <AIReplySuggestions
      clientId={thread.client} messageId={thread.messages.filter(m => m.direction === 'inbound').slice(-1)[0].id}
      platform={thread.platform} senderName={thread.contact_name || ''} onPick={value => { if (!pending) setText(value); }} autoLoad={false} />}
    {canReply && <form onSubmit={send}>
      <Textarea label={t('engagement.reply')} value={text} onChange={e => setText(e.target.value)} disabled={pending} />
      <Button type="submit" disabled={pending || ambiguous || outcome === 'approval' || !text.trim() || thread.is_resolved}>{t(pending ? 'engagement.loading' : 'engagement.send')}</Button>
    </form>}
  </>;
}
