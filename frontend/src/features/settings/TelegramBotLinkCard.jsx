'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/http/client';

/** Account-level device link; no workspace credential or bot token in the browser. */
export default function TelegramBotLinkCard() {
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState('');
  const [expires, setExpires] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    const res = await api.get('/tgcloud/link-code/');
    setStatus(res.data);
  }

  useEffect(() => {
    let alive = true;
    api.get('/tgcloud/link-code/')
      .then((res) => { if (alive) setStatus(res.data); })
      .catch(() => { if (alive) setError('دریافت وضعیت اتصال ممکن نشد.'); });
    return () => { alive = false; };
  }, []);

  async function generate() {
    setBusy(true); setError(''); setCode('');
    try {
      const result = await api.post('/tgcloud/link-code/', {});
      setCode(result.data.code);
      setExpires(result.data.expires_at);
    } catch {
      setError('ساخت کد اتصال ممکن نشد.');
    } finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true); setError('');
    try {
      await api.delete('/tgcloud/link-code/');
      setCode('');
      setStatus({ linked: false });
    } catch {
      setError('لغو اتصال انجام نشد.');
    } finally { setBusy(false); }
  }

  async function check() {
    setBusy(true); setError('');
    try {
      await refresh();
      setCode('');
    } catch {
      setError('دریافت وضعیت اتصال ممکن نشد.');
    } finally { setBusy(false); }
  }

  const command = code ? `/connect ${code}` : '';

  return (
    <section className="mb-6 rounded-xl border p-5" aria-label="اتصال بات تلگرام راوینتا" dir="rtl">
      <h2 className="text-lg font-semibold">اتصال بات تلگرام راوینتا</h2>
      <p className="mt-2 text-sm">
        این اتصال فقط برای مشاهده پست‌های منتظر تأیید است؛ امکان انتشار یا تأیید در بات هنوز فعال نیست.
      </p>
      <p className="my-3 text-sm">
        وضعیت: {status?.linked ? `متصل به Telegram ID ${status.telegram_user_id}` : 'متصل نیست'}
      </p>
      {code && (
        <div className="rounded-lg border p-3">
          <p className="text-sm">دستور زیر را فقط در گفت‌وگوی خصوصی بات راوینتا ارسال کنید:</p>
          <code dir="ltr" className="my-2 block break-all select-all">{command}</code>
          <p className="text-xs">این کد فقط یک‌بار و تا {new Date(expires).toLocaleTimeString('fa-IR')} معتبر است. آن را برای کسی ارسال نکنید.</p>
          <button type="button" className="mt-2 rounded border px-3 py-2 text-sm" onClick={() => navigator.clipboard?.writeText(command)}>
            کپی دستور
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={generate}>
          ساخت کد یک‌بارمصرف
        </button>
        <button type="button" disabled={busy} className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={check}>
          بررسی وضعیت
        </button>
        {status?.linked && <button type="button" disabled={busy} className="rounded border px-3 py-2 text-sm disabled:opacity-50" onClick={disconnect}>
          قطع دسترسی بات
        </button>}
      </div>
    </section>
  );
}
