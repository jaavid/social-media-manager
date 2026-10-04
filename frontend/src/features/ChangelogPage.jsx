/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Link from '../components/marketing/MarketingLink';
import { Sparkles, Wrench, Bug, ArrowRight } from 'lucide-react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import Button from '../components/marketing/MarketingButton';
import Badge from '../components/ui/Badge';
import Meta from '../components/Meta';

const RELEASES = [
  {
    version: 'v3.2.0',
    date: '2026-04-30',
    title: "به‌روزرسانی بصری سیستم عامل بازاریابی",
    entries: [
      { tag: 'new', text: "سیستم طراحی کاملاً جدید: نشانه‌ها، حالت تاریک، کتابخانه کامل اجزا." },
      { tag: 'new', text: "طراحی مجدد سایت عمومی - صفحه فرود، ویژگی ها، قیمت گذاری، مشتریان، درباره، تماس." },
      { tag: 'improved', text: "صفحات Auth یک طرح بندی یکپارچه صفحه نمایش را با توصیفات چرخشی به اشتراک می گذارند." },
      { tag: 'improved', text: "صفحات مرکز راهنمایی، وضعیت و امنیت محتوای کامل و تصاویر بهبود یافته را دریافت می‌کنند." },
    ],
  },
  {
    version: 'v3.1.4',
    date: '2026-04-12',
    title: "پایداری واتس‌اپ پین‌بات + بهبود هوش مصنوعی",
    entries: [
      { tag: 'new', text: "آموزش لحن برند هوش مصنوعی اکنون حداکثر 20 پست نمونه را پشتیبانی می‌کند (10 مورد)." },
      { tag: 'improved', text: "انعطاف‌پذیری وب هوک ورودی واتس‌اپ: سعی مجدد خودکار روی خطاهای گذرا پین‌بات." },
      { tag: 'fixed', text: "فیلتر صندوق ورودی \"تخصیص نشده\" دیگر در بین مشتریان نشت نمی‌کند." },
    ],
  },
  {
    version: 'v3.1.0',
    date: '2026-03-21',
    title: "بازنگری مجوزها + گزارش حسابرسی",
    entries: [
      { tag: 'new', text: "کدهای مجوز ریز در هر صفحه و اقدام (ویرایشگر محتوا، صندوق ورودی، ویدئو، اتوماسیون، مخاطب، رقبا، ممیزی)." },
      { tag: 'new', text: "گزارش حسابرسی قابل جستجو در همه اقدامات حساب برای 1 سال در رشد، سفارشی در سازمانی." },
      { tag: 'improved', text: "گردش کار تأیید اکنون اعلان‌های درون برنامه‌ای + ایمیل را به تأییدکنندگان تعیین‌شده ارسال می‌کند." },
    ],
  },
  {
    version: 'v3.0.0',
    date: '2026-02-14',
    title: "راه اندازی سیستم عامل بازاریابی یکپارچه",
    entries: [
      { tag: 'new', text: "ویرایشگر محتوا: انتشار بین پلتفرمی با نادیده گرفتن هر پلتفرم." },
      { tag: 'new', text: "صندوق ورودی یکپارچه با احساسات + پیشنهادات پاسخ هوش مصنوعی." },
      { tag: 'new', text: "موتور اتوماسیون - سازنده قوانین بصری برای کلیدواژه، برنامه زمان‌بندی و محرک های احساسات." },
      { tag: 'new', text: "استودیوی ویدیویی: برش، تغییر اندازه، واترمارک، و انتشار." },
    ],
  },
  {
    version: 'v2.8.2',
    date: '2026-01-18',
    title: "پرداخت گزارش + ادغام",
    entries: [
      { tag: 'new', text: "تحویل گزارش برنامه‌ریزی شده (هفتگی + ماهانه) از طریق ایمیل." },
      { tag: 'improved', text: "ادغام GMB معیارهای مبتنی بر مکان را با APIهای جدید مدیریت می‌کند." },
      { tag: 'fixed', text: "زمان تماشای یوتیوب به درستی در احراز هویت مجدد انجام شد." },
    ],
  },
];

const TAGS = {
  new:      { label: "جدید",      bg: 'var(--brand-primary-soft)', color: 'var(--brand-primary-hover)', icon: Sparkles },
  improved: { label: "بهبودیافته", bg: 'var(--info-bg)',            color: 'var(--info)',                 icon: Wrench },
  fixed:    { label: "اصلاح‌شده",    bg: 'var(--success-bg)',         color: 'var(--success)',              icon: Bug },
};

export default function ChangelogPage() {
  return (
    <MarketingLayout>
      <Meta
        title={"تاریخچه تغییرات"}
        description={"هر انتشار، هر اصلاح. آخرین ویژگی‌ها، بهبودها و رفع اشکال‌ها به راوینتا ارسال شده است."}
      />
      {/* Hero */}
      <section style={{ padding: '128px 32px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--brand-mesh)',
            opacity: 0.25, filter: 'blur(80px) saturate(140%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <Badge variant="brand" size="md">تاریخچه تغییرات</Badge>
          <h1 style={{
            margin: '20px 0 16px',
            fontSize: 'clamp(36px, 4.4vw, 48px)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            آنچه در راوینتا جدید است.
          </h1>
          <p style={{ margin: '0 auto', maxWidth: 560, fontSize: 16, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
            هر انتشار، هر اصلاح. تماشا کنید <a href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/releases" target="_blank" rel="noreferrer" style={{ color: 'var(--text-link)', fontWeight: 500 }}>در گیت‌هاب منتشر می‌شود</a> برای دریافت خبر.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding: '32px 32px 96px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 12, bottom: 12, left: 19,
              width: 2,
              background: 'linear-gradient(180deg, var(--brand-primary), transparent)',
              opacity: 0.4,
            }}
          />
          {RELEASES.map((r) => (
            <article
              key={r.version}
              style={{
                position: 'relative',
                paddingLeft: 56,
                marginBottom: 40,
              }}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 4, top: 6,
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: 'var(--surface-card)',
                  border: '2px solid var(--brand-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 6px var(--brand-primary-glow)',
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--brand-primary-hover)' }} strokeWidth={2.4} />
              </span>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: 'var(--brand-primary-hover)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {r.version}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {new Date(r.date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>

              <h2 style={{
                margin: 0,
                fontSize: 'clamp(20px, 2.4vw, 26px)',
                fontWeight: 600,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)',
              }}>
                {r.title}
              </h2>

              <ul style={{
                margin: '14px 0 0',
                padding: 0,
                listStyle: 'none',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {r.entries.map((entry, i) => {
                  const t = TAGS[entry.tag] || TAGS.improved;
                  const Icon = t.icon;
                  return (
                    <li
                      key={i}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-primary)' }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                          padding: '2px 8px',
                          background: t.bg,
                          color: t.color,
                          borderRadius: 'var(--radius-pill)',
                          fontSize: 10, fontWeight: 600,
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          marginTop: 2,
                        }}
                      >
                        <Icon size={10} strokeWidth={2.4} />
                        {t.label}
                      </span>
                      <span style={{ lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
                        {entry.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}

          {/* Older releases CTA */}
          <div style={{ paddingLeft: 56, marginTop: 32 }}>
            <Button as={Link} to="/contact" variant="secondary" size="md" iconRight={ArrowRight}>
              به دنبال نسخه های قدیمی تر هستید؟
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
