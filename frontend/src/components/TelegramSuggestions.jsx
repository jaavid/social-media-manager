import { useLanguage } from "../i18n";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { apiError } from '@/services/http/errors';
import { parseSuggestions, parseDecision } from '@/lib/telegramSuggestions';
import { api } from '@/services/http/client';
import Card from './ui/Card';
import Button from './ui/Button';
import DataState from './ui/DataState';

export default function TelegramSuggestions({ accountId, workspaceId }) {
  const { user, status } = useSession();
  const workspace = Number(workspaceId || user?.workspace_id || user?.client_id);
  if (status !== 'authenticated' || !Number.isSafeInteger(workspace) || workspace <= 0
      || !Number.isSafeInteger(Number(accountId)) || Number(accountId) <= 0) return null;
  return <SuggestionReader key={`${user.id}:${workspace}:${accountId}`} accountId={Number(accountId)} workspaceId={workspace} />;
}
function SuggestionReader({ accountId, workspaceId }) {
  const { tr, t } = useLanguage();
  const [rows, setRows] = useState(null);
  const [readError, setReadError] = useState(null);
  const [reading, setReading] = useState(false);
  const [writeState, setWriteState] = useState(null);
  const [busy, setBusy] = useState(null);
  const [sendDates, setSendDates] = useState({});
  const locked = useRef(new Set());
  const [lockedIds, setLockedIds] = useState(new Set());
  const acknowledgments = useRef(new Map());
  const alive = useRef(false), sequence = useRef(0), controller = useRef(null), writeLock = useRef(false);
  const online = useSyncExternalStore(fn => onlineManager.subscribe(fn), () => onlineManager.isOnline(), () => true);
  const load = useCallback(async () => {
    if (!onlineManager.isOnline() || !alive.current) return;
    const generation = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setReading(true); setReadError(null);
    try {
      const { data } = await api.get('/telegram-suggestions/', { params: { account: accountId }, signal: abort.signal });
      const parsed = parseSuggestions(data, workspaceId, accountId);
      if (!alive.current || generation !== sequence.current) return;
      // A late/stale list cannot erase an acknowledged decision in this scope.
      const nextRows = parsed.map(row => {
        const acknowledged = acknowledgments.current.get(row.id);
        if (acknowledged && Date.parse(row.updated_at) >= Date.parse(acknowledged.updated_at)
            && row.state === acknowledged.state) locked.current.delete(row.id);
        if (acknowledged && Date.parse(acknowledged.updated_at) >= Date.parse(row.updated_at)) return acknowledged;
        return row;
      });
      setRows(nextRows); setLockedIds(new Set(locked.current));
    } catch (error) {
      if (!alive.current || generation !== sequence.current || abort.signal.aborted) return;
      const failure = apiError(error);
      setReadError(failure);
      if ([401, 403, 404].includes(failure.status)) setRows(null);
    } finally { if (alive.current && generation === sequence.current) setReading(false); }
  }, [accountId, workspaceId]);
  useEffect(() => {
    alive.current = true;
    void load();
    const unsubscribe = onlineManager.subscribe(isOnline => { if (isOnline) void load(); });
    return () => { alive.current = false; controller.current?.abort(); unsubscribe(); };
  }, [load]);
  async function decide(row, decision) {
    if (!alive.current || writeLock.current || locked.current.has(row.id) || !onlineManager.isOnline()
        || [401, 403, 404].includes(readError?.status)) return;
    writeLock.current = true; setBusy(row.id); setWriteState(null);
    try {
      const body = { decision };
      if (decision === 'approve' && sendDates[row.id]) body.send_date = Math.floor(new Date(sendDates[row.id]).getTime() / 1000);
      const response = await api.post(`/telegram-suggestions/${row.id}/decide/`, body);
      if (!alive.current) return;
      const result = parseDecision(response.data, response.status, decision, workspaceId, accountId, row.id);
      locked.current.add(row.id); setLockedIds(new Set(locked.current));
      ++sequence.current; controller.current?.abort();
      if (!result.pending) {
        acknowledgments.current.set(row.id, result.row);
        setRows(current => current?.map(item => item.id === row.id ? result.row : item));
      }
      setWriteState(result.pending ? 'suggestions.pendingApproval' : 'suggestions.accepted');
      await load();
    } catch (error) {
      if (!alive.current) return;
      const failure = apiError(error);
      const ambiguous = !failure.status || failure.status >= 500 || ['timeout', 'network_error', 'invalid_response'].includes(failure.code);
      if (ambiguous) { locked.current.add(row.id); setLockedIds(new Set(locked.current)); }
      if ([401, 403, 404].includes(failure.status)) { setRows(null); setReadError(failure); }
      setWriteState(ambiguous ? 'suggestions.unknown' : 'connections.mutationFailed');
    } finally { writeLock.current = false; if (alive.current) setBusy(null); }
  }
  const denied = [401, 403, 404].includes(readError?.status);
  const readKey = !online ? 'recovery.offline' : readError
    ? denied ? readError.status === 404 ? 'recovery.notFound' : 'connections.forbidden'
      : rows === null ? 'connections.failed' : 'recovery.stale'
    : reading ? 'recovery.loading' : rows?.length === 0 ? 'suggestions.empty' : null;
  return <Card padding="md" className="mb-4"><Card.Header title={tr("Telegram Suggested Posts")} subtitle={tr("Review original proposals or copy them into an editable draft.")} />
    {readKey && <DataState compact state={!online ? 'offline' : readError ? denied ? 'forbidden' : rows === null ? 'error' : 'stale' : reading ? 'loading' : 'empty'}
      title={t(readKey)} action={<Button disabled={!online || reading} onClick={load}>{t('connections.retry')}</Button>} />}
    {writeState && <p role={writeState === 'suggestions.unknown' || writeState === 'connections.mutationFailed' ? 'alert' : 'status'}>{t(writeState)}</p>}
    {(rows || []).map(row => <article key={row.id} className="border-b border-border p-3">
      <p dir="auto">{row.content}</p><small>{tr("Account")} {row.account_name || row.account}{' · '}{row.sender_name}{' · '}{tr(row.state)}{' · '}{tr("Telegram:")} {tr(row.provider_state)}</small>
      {['photo', 'video', 'document'].filter(kind => row.media?.[kind]).map(kind => <SuggestionMedia key={kind} suggestionId={row.id} kind={kind} />)}
      {row.proposal?.price && <p role="note">{tr("Paid proposal:")} {row.proposal.price.amount} {row.proposal.price.currency}{'. '}{tr("Financial approval must be handled in Telegram.")}</p>}
      {['received', 'under_review'].includes(row.state) && row.provider_state === 'pending' && <fieldset disabled={busy !== null || lockedIds.has(row.id) || !online || denied} className="flex flex-wrap gap-2 border-0 p-0 mt-2">
        <Button size="sm" onClick={() => decide(row, 'under_review')}>{tr("Review")}</Button>
        <Button size="sm" onClick={() => decide(row, 'accept_as_draft')}>{tr("Copy to draft")}</Button>
        {!row.proposal?.price && <><input aria-label={tr("Suggested post send date")} type="datetime-local" value={sendDates[row.id] || ''} onChange={e => setSendDates(current => ({ ...current, [row.id]: e.target.value }))} />
          <Button size="sm" onClick={() => decide(row, 'approve')}>{tr("Approve on Telegram")}</Button></>}
        <Button size="sm" variant="ghost" onClick={() => decide(row, 'decline')}>{tr("Decline")}</Button>
      </fieldset>}
      {row.draft && <a href={`/admin/analytics/composer/${row.draft}`}>{tr("Open editable draft")}</a>}
    </article>)}
  </Card>;
}

function SuggestionMedia({ suggestionId, kind }) {
  const { tr } = useLanguage();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let blobUrl;
    api.get(`/telegram-suggestions/${suggestionId}/media/`, { params: { kind }, responseType: 'blob' }).then(({ data }) => {
      if (!active) return;
      blobUrl = URL.createObjectURL(data); setUrl(blobUrl);
    }).catch(() => { if (active) setError(tr('Media preview unavailable')); });
    return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [suggestionId, kind]);
  if (error) return <p>{error}</p>;
  if (!url) return <p>{tr('Loading media…')}</p>;
  if (kind === 'photo') return <img src={url} alt={tr('Suggested photo')} style={{ maxWidth: 320, maxHeight: 220 }} />;
  if (kind === 'video') return <video controls src={url} style={{ maxWidth: 320 }} />;
  return <a href={url} download="telegram-document">{tr('Download attachment')}</a>;
}
