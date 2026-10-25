import { useCallback, useEffect, useRef, useState } from 'react';
import { calendarAPI } from '../../services/domains/publishing';
import { useLanguage } from '../../i18n';

const controlStyle = {
  minHeight: 44, padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border-default)', background: 'var(--surface-card)',
  color: 'var(--text-primary)',
};

export default function ChannelSources({ clientId, onRefresh, selectedSource, onSelectSource }) {
  const { isPersian, formatDate, t } = useLanguage();
  const [sources, setSources] = useState([]);
  const [username, setUsername] = useState('');
  const [isCompetitor, setIsCompetitor] = useState(false);
  const [competitorName, setCompetitorName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
    setSources([]);
    setPending(false);
    setBusy(false);
    setMessage('');
    if (clientId) load().catch(() => setMessage(isPersian ? 'دریافت کانال‌ها ناموفق بود.' : 'Could not load channels.'));
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

  async function act(action) {
    const token = generation.current;
    setBusy(true);
    setMessage('');
    try {
      await action();
      if (generation.current !== token) return;
      await load();
      onRefresh();
    } catch (error) {
      if (generation.current !== token) return;
      const code = error.response?.data?.error;
      setMessage(code === 'session_required'
        ? text('اینستاگرام دریافت عمومی را محدود کرده؛ نشست خواننده باید توسط مدیر سرور تنظیم شود.', 'Instagram restricted anonymous access. Ask the administrator to configure a reader session.')
        : code === 'cooldown'
          ? text('بین دریافت‌ها حداقل ۱۵ دقیقه فاصله لازم است.', 'Allow at least 15 minutes between syncs.')
          : text('عملیات انجام نشد؛ نام کاربری و دسترسی فضای کاری را بررسی کنید.', 'Operation failed. Check the username and workspace permissions.'));
    } finally {
      if (generation.current === token) setBusy(false);
    }
  }

  const errors = {
    session_required: text('نشست خواندن تنظیم نشده است', 'Reader session is missing'),
    session_invalid: text('نشست خواندن معتبر نیست', 'Reader session is invalid'),
    session_expired: text('نشست منقضی شده؛ ورود مجدد لازم است', 'Session expired; sign in again'),
    challenge_required: text('تأیید ورود در اینستاگرام لازم است', 'Instagram verification is required'),
    rate_limited: text('محدودیت دریافت؛ بعداً تلاش کنید', 'Rate limited; try later'),
    private_profile: text('این پروفایل خصوصی است', 'This profile is private'),
    profile_not_found: text('پروفایل پیدا نشد', 'Profile not found'),
    reader_busy: text('نشست در حال دریافت کانال دیگری است', 'Reader is syncing another channel'),
    gateway_required: text('درگاه کلودفلر روی سرور تنظیم نشده است', 'Cloudflare gateway is not configured'),
    gateway_unavailable: text('درگاه کلودفلر یا مسیر اینستاگرام در دسترس نیست', 'Cloudflare gateway or Instagram route is unavailable'),
    anonymous_unavailable: text('دریافت عمومی در دسترس نیست؛ نشست خواننده لازم است', 'Anonymous access unavailable; a reader session is needed'),
    dependency_missing: text('سرویس خواندن روی سرور نصب نشده است', 'Reader dependency is not installed'),
    fetch_failed: text('دریافت ناموفق بود؛ داده قبلی حفظ شده است', 'Sync failed; previous content was retained'),
    provider_invalid: text('سرویس دریافت روی سرور درست تنظیم نشده است', 'The collection provider is misconfigured'),
    brightdata_not_configured: text('تنظیمات Bright Data روی سرور کامل نیست', 'Bright Data configuration is incomplete'),
    brightdata_access_denied: text('دسترسی Bright Data رد شد؛ کلید سرویس یا درگاه را بررسی کنید', 'Bright Data access denied; check the service and gateway keys'),
    brightdata_quota: text('اعتبار Bright Data کافی نیست', 'Bright Data credit is insufficient'),
    brightdata_unavailable: text('سرویس Bright Data یا درگاه در دسترس نیست', 'Bright Data or the gateway is unavailable'),
    brightdata_invalid_response: text('پاسخ Bright Data برای تقویم معتبر نیست', 'Bright Data returned invalid calendar data'),
    brightdata_collection_failed: text('Bright Data نتوانست محتوای این کانال را دریافت کند', 'Bright Data could not collect this channel'),
    brightdata_timeout: text('دریافت Bright Data در زمان تعیین‌شده تمام نشد', 'Bright Data collection timed out'),
  };
  if (!clientId) return null;
  return (
    <details style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border-default)', borderRadius: 10 }}>
      <summary style={{ cursor: 'pointer', minHeight: 32 }}>{text('رقبا و کانال‌های تحت رصد · اینستاگرام', 'Competitors and tracked channels · Instagram')}</summary>
      <p>{text('دریافت محتوای عمومی از طریق سرویس تنظیم‌شده روی سرور انجام می‌شود. برای Bright Data به ورود اینستاگرام نیازی نیست.', 'Public content is collected using the server-configured provider. Bright Data does not require an Instagram login.')}</p>
      <label htmlFor="calendar-channel-filter">{text('نمایش کانال', 'Channel filter')}</label>{' '}
      <select id="calendar-channel-filter" value={selectedSource} onChange={event => onSelectSource(event.target.value)} style={controlStyle}>
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
          setUsername('');
          setCompetitorName('');
        });
      }} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label htmlFor="calendar-instagram-username">{text('نام کاربری یا لینک پروفایل', 'Username or profile URL')}</label>
        <input id="calendar-instagram-username" value={username} onChange={event => setUsername(event.target.value)} required dir="ltr" style={controlStyle} />
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <input type="checkbox" checked={isCompetitor} onChange={event => setIsCompetitor(event.target.checked)} />
          {text('افزودن به‌عنوان رقیب', 'Track as competitor')}
        </label>
        {isCompetitor && <>
          <label htmlFor="calendar-competitor-name">{text('نام رقیب', 'Competitor name')}</label>
          <input id="calendar-competitor-name" value={competitorName} maxLength={200} required
            onChange={event => setCompetitorName(event.target.value)} style={controlStyle} />
        </>}
        <button type="submit" disabled={busy || !username.trim() || (isCompetitor && !competitorName.trim())} style={controlStyle}>{isCompetitor ? text('افزودن رقیب', 'Add competitor') : text('افزودن کانال', 'Add channel')}</button>
        <button type="button" disabled={busy} onClick={() => act(load)} style={controlStyle}>{text('تازه‌سازی وضعیت', 'Refresh status')}</button>
      </form>
      {message && <p role="alert">{message}</p>}
      <ul style={{ paddingInlineStart: 20 }}>
        {sources.map(source => (
          <li key={source.id} style={{ marginBlock: 12 }}>
            {source.is_competitor && <strong>{source.display_name} · {text('رقیب', 'Competitor')} · </strong>}
            <strong dir="ltr">@{source.username}</strong>{' · '}
            {source.last_synced_at ? formatDate(source.last_synced_at) : text('هنوز دریافت نشده', 'Not synced yet')}
            {source.provider === 'brightdata' && <span> · {t('watchlist.brightdata')}</span>}
            {source.sync_status === 'syncing' && <span> · {text('در حال دریافت؛ نتیجه خودکار به‌روزرسانی می‌شود', 'Collecting; results refresh automatically')}</span>}
            {source.error_code && <span> · {text('دریافت متوقف شد', 'Sync stopped')}: {errors[source.error_code] || errors.fetch_failed}</span>}
            {!source.reader_ready && <span> · {text('دریافت عمومی بدون ورود', 'Anonymous public access')}</span>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <button type="button" disabled={busy} style={controlStyle} onClick={() => act(async () => {
                await calendarAPI.syncSource(source.id);
                setPending(true);
                setMessage(text('درخواست دریافت ثبت شد؛ نتیجه به‌روزرسانی می‌شود.', 'Sync queued. Results will refresh automatically.'));
              })}>{text('دریافت پست‌ها', 'Sync posts')}</button>
              <button type="button" disabled={busy} style={controlStyle} onClick={() => act(async () => {
                await calendarAPI.removeSource(source.id);
                if (String(source.id) === selectedSource) onSelectSource('');
              })}>{text('حذف از رصد', 'Stop tracking')}</button>
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
