import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { calendarAPI } from '../../services/domains/publishing';
import { useLanguage } from '../../i18n';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import PublicProfileSummary from '../PublicProfileSummary';
import toast from '../ui/toast';

export default function ChannelSources({ clientId, onRefresh, selectedSource, onSelectSource }) {
  const { isPersian } = useLanguage();
  return <ScopedChannelSources key={`${clientId}:${isPersian}`} clientId={clientId}
    onRefresh={onRefresh} selectedSource={selectedSource} onSelectSource={onSelectSource} />;
}

function ScopedChannelSources({ clientId, onRefresh, selectedSource, onSelectSource }) {
  const { isPersian, formatDate } = useLanguage();
  const [expanded, setExpanded] = useState(false);
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
        setBusy(false);
      }
      return;
    }
    if (generation.current !== token) return;
    onSuccess?.();
    if (successMessage) toast.success(successMessage);
    try {
      await load();
      if (generation.current === token) onRefresh();
    } catch {
      if (generation.current === token) toast.error(text('عملیات انجام شد، اما فهرست به‌روز نشد.', 'Action completed, but the list could not refresh.'));
    } finally {
      if (generation.current === token) setBusy(false);
    }
  }

  if (!clientId) return null;
  return (
    <section className="mb-5 min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-card shadow-sm" aria-label={text('کانال‌های رصدشده', 'Tracked channels')}>
      <button type="button" aria-expanded={expanded} aria-controls="calendar-tracked-content"
        onClick={() => setExpanded(value => !value)}
        className="flex min-h-14 w-full min-w-0 items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
            <Eye size={18} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {text('کانال‌های رصدشده', 'Tracked channels')}
              <Badge variant="brand">{sources.length}</Badge>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {sources.length
                ? sources.slice(0, 2).map(source => `@${source.username}`).join(' · ')
                : text('هنوز کانالی اضافه نشده است', 'No channels added yet')}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <SocialPlatformIcon platform="instagram" size={17} />
          <ChevronDown size={17} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {expanded && <div id="calendar-tracked-content" className="space-y-4 border-t border-[var(--border-subtle)] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="calendar-channel-filter" className="text-xs font-medium text-muted-foreground">
            {text('نمایش محتوای', 'Show content from')}
          </label>
          <select id="calendar-channel-filter" value={selectedSource}
            onChange={event => onSelectSource(event.target.value)}
            className="ds-native-select w-full max-w-full sm:max-w-64">
            <option value="">{text('همه محتواها', 'All content')}</option>
            <option value="competitors">{text('فقط رقبا', 'Competitors only')}</option>
            <option value="owned">{text('فقط محتوای خودمان', 'Owned content only')}</option>
            {sources.map(source => <option key={source.id} value={String(source.id)}>
              {source.display_name ? `${source.display_name} · ` : ''}@{source.username}
            </option>)}
          </select>
        </div>
        <form onSubmit={event => {
          event.preventDefault();
          void act(() => calendarAPI.addSource({
            client: clientId, platform: 'instagram', username,
            ...(isCompetitor ? { competitor_name: competitorName.trim() } : {}),
          }), text('کانال اضافه شد.', 'Channel added.'), () => {
            setUsername('');
            setCompetitorName('');
          });
        }} className="flex min-w-0 flex-col gap-2 rounded-xl bg-[var(--surface-sunken)] p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SocialPlatformIcon platform="instagram" size={20} />
          <label htmlFor="calendar-instagram-username" className="sr-only">{text('نام کاربری یا لینک پروفایل', 'Username or profile URL')}</label>
          <input id="calendar-instagram-username" value={username}
            onChange={event => setUsername(event.target.value)} required dir="ltr"
            placeholder={text('نام کاربری یا لینک اینستاگرام', 'Instagram username or URL')}
            className="ds-input min-w-0 flex-1 sm:basis-36" />
          <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-2 text-xs text-foreground">
            <input type="checkbox" checked={isCompetitor} onChange={event => setIsCompetitor(event.target.checked)} />
            {text('رقیب است', 'Competitor')}
          </label>
          {isCompetitor && <>
            <label htmlFor="calendar-competitor-name" className="sr-only">{text('نام رقیب', 'Competitor name')}</label>
            <input id="calendar-competitor-name" value={competitorName} maxLength={200} required
              placeholder={text('نام رقیب', 'Competitor name')}
              onChange={event => setCompetitorName(event.target.value)}
              className="ds-input min-w-0 flex-1 sm:basis-32" />
          </>}
          <Button size="sm" type="submit" icon={Plus} loading={busy}
            disabled={!username.trim() || (isCompetitor && !competitorName.trim())}>
            {isCompetitor ? text('افزودن رقیب', 'Add competitor') : text('افزودن کانال', 'Add channel')}
          </Button>
        </form>
        {sources.length === 0 && <p className="m-0 text-center text-xs text-muted-foreground">
          {text('برای رصد محتوای عمومی، یک نام کاربری اینستاگرام وارد کنید.', 'Enter an Instagram username to track public content.')}
        </p>}
        {sources.length > 0 && <ul className="m-0 divide-y divide-[var(--border-subtle)] p-0">
          {sources.map(source => <li key={source.id} className="flex min-w-0 flex-col gap-3 py-3 first:pt-0 sm:flex-row sm:items-center">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
              <SocialPlatformIcon platform="instagram" size={19} />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <strong dir="ltr" className="max-w-full truncate text-sm">@{source.username}</strong>
                {source.is_competitor && <Badge variant="warning">{source.display_name || text('رقیب', 'Competitor')}</Badge>}
              </div>
              <p className="m-0 text-xs text-muted-foreground">
                {source.last_synced_at
                  ? text('آخرین دریافت: ', 'Last sync: ') + formatDate(source.last_synced_at)
                  : text('هنوز دریافت نشده', 'Not synced yet')}
              </p>
              <PublicProfileSummary data={source.public_data} compact />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button variant="secondary" size="sm" icon={RefreshCw} disabled={busy}
                onClick={() => void act(() => calendarAPI.syncSource(source.id),
                  text('دریافت در صف قرار گرفت.', 'Sync queued.'), () => setPending(true))}>
                {text('دریافت پست‌ها', 'Sync posts')}
              </Button>
              <Button variant="ghost" size="sm" icon={Trash2} disabled={busy}
                onClick={() => void act(() => calendarAPI.removeSource(source.id),
                  text('کانال حذف شد.', 'Channel removed.'), () => {
                    if (String(source.id) === selectedSource) onSelectSource('');
                  })}>
                {text('حذف از رصد', 'Stop tracking')}
              </Button>
            </div>
          </li>)}
        </ul>}
        <Button variant="ghost" size="sm" icon={RefreshCw} disabled={busy}
          onClick={() => void act(async () => {})}>{text('تازه‌سازی', 'Refresh')}</Button>
      </div>}
    </section>
  );
}
