import { useLanguage } from "../i18n";
import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from './ui/Card';
import Button from './ui/Button';
export default function TelegramSuggestions({ accountId }) {
  const {
    tr
  } = useLanguage();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [sendDates, setSendDates] = useState({});
  const load = () => api.get('/telegram-suggestions/', { params: accountId ? { account: accountId } : {} }).then(({
    data
  }) => setRows(data.results || data));
  useEffect(() => {
    let active = true;
    api.get('/telegram-suggestions/', { params: accountId ? { account: accountId } : {} }).then(({ data }) => { if (active) setRows(data.results || data); }).catch(() => {});
    return () => { active = false; };
  }, [accountId]);
  async function decide(row, decision) {
    setBusy(row.id);
    setError('');
    try {
      const body = {
        decision
      };
      if (decision === 'approve' && sendDates[row.id]) body.send_date = Math.floor(new Date(sendDates[row.id]).getTime() / 1000);
      await api.post(`/telegram-suggestions/${row.id}/decide/`, body);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Suggestion decision failed');
    } finally {
      setBusy(null);
    }
  }
  if (!rows.length) return null;
  return <Card padding="md" style={{
    marginBottom: 16
  }}><Card.Header title={tr("Telegram Suggested Posts")} subtitle={tr("Review original proposals or copy them into an editable draft.")} />
    {error && <p role="alert">{error}</p>}
    {rows.map(row => <article key={row.id} style={{
      padding: 12,
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <p dir="auto">{row.content}</p><small>{tr("Account")}{row.account_name || row.account}{' · '}{row.sender_name}{' · '}{row.state}{tr("· Telegram:")}{row.provider_state}</small>
      {['photo', 'video', 'document'].filter(kind => row.media?.[kind]).map(kind => <SuggestionMedia key={kind} suggestionId={row.id} kind={kind} />)}
      {row.proposal?.price && <p role="note">{tr("Paid proposal:")}{row.proposal.price.amount} {row.proposal.price.currency}{tr(". Financial approval must be handled in Telegram.")}</p>}
      {['received', 'under_review'].includes(row.state) && row.provider_state === 'pending' && <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8
      }}>
        <Button size="sm" disabled={busy === row.id} onClick={() => decide(row, 'under_review')}>{tr("Review")}</Button>
        <Button size="sm" disabled={busy === row.id} onClick={() => decide(row, 'accept_as_draft')}>{tr("Copy to draft")}</Button>
        {!row.proposal?.price && <><input aria-label={tr("Suggested post send date")} type="datetime-local" value={sendDates[row.id] || ''} onChange={e => setSendDates({
            ...sendDates,
            [row.id]: e.target.value
          })} />
          <Button size="sm" disabled={busy === row.id} onClick={() => decide(row, 'approve')}>{tr("Approve on Telegram")}</Button></>}
        <Button size="sm" variant="ghost" disabled={busy === row.id} onClick={() => decide(row, 'decline')}>{tr("Decline")}</Button>
      </div>}
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
