/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
'use client';
import { persistentStorage } from '../lib/runtime/storage';

import { useState } from 'react';
import Switch from '../components/ui/Switch';
import Button from '../components/ui/Button';
import toast from '../components/ui/toast';

const CATEGORIES = [
  {
    id: 'essential',
    name: "ضروری",
    required: true,
    description:
      'برای عملکرد سایت، احراز هویت، حفظ نشست و محافظت در برابر جعل درخواست لازم است و نمی‌توان آن را غیرفعال کرد.',
  },
  {
    id: 'functional',
    name: "کارکردی",
    required: false,
    description:
      "تنظیمات برگزیده مانند طرح زمینه، زبان و مشتریانی که اخیراً مشاهده شده اند را به خاطر بسپارید. تجربه خود را بهبود بخشید.",
  },
  {
    id: 'analytics',
    name: "تحلیل و آمار",
    required: false,
    description:
      "معیارهای مصرف انبوهی که به ما کمک می‌کنند بفهمیم کدام ویژگی‌ها مفید هستند (قابل قبول، بدون ردیاب شخص ثالث).",
  },
  {
    id: 'marketing',
    name: "بازاریابی",
    required: false,
    description:
      "انتساب تبدیل از تبلیغات + پیکسل‌های هدف‌گیری مجدد. ما داده‌های شما را نمی فروشیم.",
  },
];
export default function CookiePreferences() {
  const [prefs, setPrefs] = useState({
    essential: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  function toggle(id) {
    if (CATEGORIES.find((c) => c.id === id)?.required) return;
    setPrefs((p) => ({ ...p, [id]: !p[id] }));
  }

  function savePrefs() {
    try {
      persistentStorage.setItem('socialstats_cookie_prefs', JSON.stringify(prefs));
      toast.success("تنظیمات برگزیده کوکی ذخیره شد");
    } catch {
      toast.error("تنظیمات برگزیده ذخیره نشد. دوباره امتحان کنید.");
    }
  }

  return <><CategoryTable categories={CATEGORIES} prefs={prefs} onToggle={toggle} />
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button onClick={savePrefs} size="md">ذخیره انتخاب‌ها</Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setPrefs({ essential: true, functional: true, analytics: true, marketing: true })}
                >
                  پذیرش همه
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setPrefs({ essential: true, functional: false, analytics: false, marketing: false })}
                >
                  رد اختیاری
                </Button>
              </div></>;
}
function CategoryTable({ categories, prefs, onToggle }) {
  return (
    <div
      style={{
        marginTop: 12,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {categories.map((c, i) => (
        <div
          key={c.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '16px 18px',
            borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
              {c.required && (
                <span
                  style={{
                    fontSize: 10, fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    padding: '2px 6px',
                    background: 'var(--surface-sunken)',
                    borderRadius: 'var(--radius-pill)',
                  }}
                >
                  همیشه روشن است
                </span>
              )}
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {c.description}
            </div>
          </div>
          <Switch
            checked={!!prefs[c.id]}
            disabled={c.required}
            onChange={() => onToggle(c.id)}
            aria-label={`تغییر وضعیت ${c.name} کوکی‌ها`}
          />
        </div>
      ))}
    </div>
  );
}