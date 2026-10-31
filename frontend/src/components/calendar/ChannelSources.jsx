import PublicProfileSummary from '../PublicProfileSummary';
import { useCallback, useEffect, useRef, useState } from 'react';
import { calendarAPI } from '../../services/domains/publishing';
import { useLanguage } from '../../i18n';
import toast from '../ui/toast';

const controlStyle = {
  minHeight: 44, padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border-default)', background: 'var(--surface-card)',
  color: 'var(--text-primary)',
};

export default function ChannelSources({ clientId, onRefresh, selectedSource, onSelectSource }) {
  const { isPersian } = useLanguage();
  return <ScopedChannelSources key={`${clientId}:${isPersian}`} clientId={clientId}
    onRefresh={onRefresh} selectedSource={selectedSource} onSelectSource={onSelectSource} />;
}

function ScopedChannelSources({ clientId, onRefresh, selectedSource, onSelectSource }) {
  const { isPersian, formatDate } = useLanguage();
  const [sources, setSources] = useState([]);
  const [username, setUsername] = useState('');
  const [isCompetitor, setIsCompetitor] = useState(false);
  const [competitorName, setCompetitorName] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const [pending, setPending] = useState(false);
  const text = (fa, en) => isPersian ? fa : en;
  const load = useCallback(async () => {
    const token = generation.current;
    const response = await calendarAPI.getSources({ client_id: clientId });
    if (generation.current === token) setSources(response.data || []);
  }, [clientId]);

  useEffect(() => {
    generation.current += 1;
    const token = generation.current;
    if (clientId) load().catch(() => {
      if (generation.current === token) toast.error(isPersian ? 'کانال‌ها بارگذاری نشدند.' : 'Could not load channels.');
    });
    return () => { generation.current += 1; };
  }, [clientId, load, isPersian]);

  useEffect(() => {
    if (!pending) return undefined;
    let cancelled = false;
    const timer = setInterval(() => {
      load().then(() => { if (!cancelled) onRefresh(); }).catch(() => {});
    }, 10000);
    const stop = setTimeout(() => setPending(false), 1800000);
    return () => { cancelled = true; clearInterval(timer); clearTimeout(stop); };
  }, [pending, load, onRefresh]);

  async function act(action, successMessage = null, onSuccess = null) {
    const token = generation.current;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      if (generation.current === token) {
        const code = error.response?.data?.error;
        toast.error(code === 'cooldown'
          ? text('۱۵ دقیقه بعد دوباره تلاش کنید.', 'Try again in 15 minutes.')
          : text('عملیات انجام نشد.', 'Operation failed.'));
      }
      if (generation.current === token) setBusy(false);
      return;
    }
    if (generation.current !== token) return;
    onSuccess?.();
    if (successMessage) toast.success(successMessage);
    try {
      await load();
      if (generation.current === token) onRefresh();
    } catch {
      if (generation.current === token) {
        toast.error(text('عملیات انجام شد، اما فهرست به‌روز نشد.', 'Action completed, but the list could not refresh.'));
      }
    } finally {
      if (generation.current === token) setBusy(false);
    }
  }

  if (!clientId) return null;
  return (
    <details className="mb-4 min-w-0 rounded-xl border border-[var(--border-default)] p-3 sm:p-4">
      <summary className="min-h-8 cursor-pointer text-sm font-medium">{text('کانال‌های رصدشده', 'Tracked channels')}{sources.length > 0 ? ` (${sources.length})` : ''}</summary>
      <label htmlFor="calendar-channel-filter">{text('نمایش', 'Show')}</label>{' '}
      <select id="calendar-channel-filter" value={selectedSource} onChange={event => onSelectSource(event.target.value)} className="max-w-full min-w-0" style={controlStyle}>
        <option value="">{text('همه محتواها', 'All content')}</option>
        <option value="competitors">{text('فقط رقبا', 'Competitors only')}</option>
        <option value="owned">{text('فقط محتوای خودمان', 'Owned content only')}</option>
        {sources.map(source => <option key={source.id} value={String(source.id)}>{source.display_name ? `${source.display_name} · ` : ''}@{source.username}</option>)}
      </select>
      <form onSubmit={event => {
        event.preventDefault();
        act(async () => {
          await calendarAPI.addSource({ client: clientId, platform: 'instagram', username,
            ...(isCompetitor ? { competitor_name: competitorName.trim() } : {}),
          });
        }, text('کانال اضافه شد.', 'Channel added.'), () => {
          setUsername('');
          setCompetitorName('');
        });
      }} className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
        <label htmlFor="calendar-instagram-username" className="sr-only">{text('نام کاربری یا لینک پروفایل', 'Username or profile URL')}</label>
        <input id="calendar-instagram-username" value={username} onChange={event => setUsername(event.target.value)} required dir="ltr" placeholder={text('نام کاربری یا لینک اینستاگرام', 'Instagram username or URL')} className="min-w-0 basis-full grow sm:basis-48" style={controlStyle} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <input type="checkbox" checked={isCompetitor} onChange={event => setIsCompetitor(event.target.checked)} />
          {text('رقیب است', 'Competitor')}
        </label>
        {isCompetitor && <>
          <label htmlFor="calendar-competitor-name" className="sr-only">{text('نام رقیب', 'Competitor name')}</label>
          <input id="calendar-competitor-name" value={competitorName} maxLength={200} required placeholder={text('نام رقیب', 'Competitor name')}
            onChange={event => setCompetitorName(event.target.value)} className="min-w-0 basis-full grow sm:basis-36" style={controlStyle} />
        </>}
        <button type="submit" disabled={busy || !username.trim() || (isCompetitor && !competitorName.trim())} style={controlStyle}>{isCompetitor ? text('افزودن رقیب', 'Add competitor') : text('افزودن کانال', 'Add channel')}</button>
        <button type="button" disabled={busy} onClick={() => act(async () => {})} style={controlStyle}>{text('تازه‌سازی', 'Refresh')}</button>
      </form>
      <ul className="list-none space-y-2 p-0">
        {sources.map(source => (
          <li key={source.id} className="min-w-0 rounded-lg border border-[var(--border-default)] p-3">
            {source.is_competitor && <strong>{source.display_name} · {text('رقیب', 'Competitor')} · </strong>}
            <strong dir="ltr">@{source.username}</strong>{' · '}
            {source.last_synced_at ? formatDate(source.last_synced_at) : text('هنوز دریافت نشده', 'Not synced yet')}
            <PublicProfileSummary data={source.public_data} compact />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <button type="button" disabled={busy} style={controlStyle} onClick={() => act(async () => {
                await calendarAPI.syncSource(source.id);
              }, text('دریافت در صف قرار گرفت.', 'Sync queued.'), () => setPending(true))}>{text('دریافت پست‌ها', 'Sync posts')}</button>
              <button type="button" disabled={busy} style={controlStyle} onClick={() => act(async () => {
                await calendarAPI.removeSource(source.id);
              }, text('کانال حذف شد.', 'Channel removed.'), () => {
                if (String(source.id) === selectedSource) onSelectSource('');
              })}>{text('حذف از رصد', 'Stop tracking')}</button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
