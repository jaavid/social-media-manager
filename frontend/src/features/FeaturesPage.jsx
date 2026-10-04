/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import FeaturesNav from '../components/marketing/FeaturesNav';
import Link from '../components/marketing/MarketingLink';
import { MotionSection } from '../components/marketing/Motion';
import {
  BarChart3, PenSquare, Inbox, Sparkles, Zap, FileText, Users, ShieldCheck,
  ArrowRight, Check,
} from 'lucide-react';

import Button from '../components/marketing/MarketingButton';
import Badge from '../components/ui/Badge';
import Meta from '../components/Meta';

const FEATURES = [
  {
    id: 'analytics',
    icon: BarChart3,
    color: 'var(--module-analytics)',
    eyebrow: "تحلیل و آمار",
    title: "معیارهای بین پلتفرمی، یکپارچه.",
    body:
      "فیس‌بوک، اینستاگرام، یوتیوب، لینکدین، جی ام بی، ایکس و موارد دیگر را به یک داشبورد زنده بکشید. در هر پست، هر پلتفرم، هر پنجره - بدون صفحات گسترده، سوراخ کنید.",
    bullets: [
      "معیارهای فالوور، تعامل و رسیدن به زمان واقعی",
      "محدوده تاریخ سفارشی با مقایسه در لحظه",
      "تفکیک هر پلتفرم و نماهای کل",
      "صادرات PDF با برند اختصاصی برای مشتریان",
    ],
  },
  {
    id: 'composer',
    icon: PenSquare,
    color: '#8b5cf6',
    eyebrow: "ویرایشگر محتوا",
    title: "یک بار بنویس. همه جا منتشر کنید.",
    body:
      "یک پست واحد بنویسید و آن را در هر پلتفرم به صورت خطی تنظیم کنید. دارایی ها را از کتابخانه رسانه ضمیمه کنید، در صف ها برنامه‌ریزی کنید یا فورا منتشر کنید.",
    bullets: [
      "هر پلتفرم بدون بازنویسی لغو می‌شود",
      "برنامه‌ریزی هوشمند با صف های آگاه از منطقه زمانی",
      "دروازه های تایید قبل از انتشار",
      "کتابخانه رسانه داخلی + تحولات دارایی",
    ],
  },
  {
    id: 'inbox',
    icon: Inbox,
    color: 'var(--module-messaging)',
    eyebrow: "صندوق پیام‌ها",
    title: "هر پاسخ در یک جدول زمانی.",
    body:
      "نظرات، پیامک‌ها، اشاره‌ها، بررسی‌ها و پیام‌های واتس‌اپ - همه در یک صندوق ورودی یکپارچه با برچسب‌گذاری احساسات و پاسخ‌های پیشنهادی هوش مصنوعی ادغام شدند.",
    bullets: [
      "موضوعات مکالمه بین پلتفرمی",
      "عواطف + نشانه گذاری هدف از جعبه",
      "پیشنهادات پاسخ هوش مصنوعی در لحن برند شما",
      "تخصیص، به تعویق انداختن، و حل و فصل گردش کار",
    ],
  },
  {
    id: 'ai',
    icon: Sparkles,
    color: 'var(--module-ai)',
    eyebrow: "هوش مصنوعی",
    title: "هوش مصنوعی که لحن برند شما را می شناسد.",
    body:
      "برای آموزش نمایه لحن برند خصوصی، پست‌های نمونه را آپلود کنید. زیرنویس‌ها، هشتگ‌ها، پاسخ‌ها و پیش‌بینی‌ها را ایجاد کنید - هر خروجی صدای شما را دارد.",
    bullets: [
      "تولید شرح با لحن شما",
      "تحقیق هشتگ با امتیازدهی تعامل",
      "پیش‌بینی‌های بهترین زمان برای ارسال",
      "خلاصه خودکار عملکرد هفتگی",
    ],
  },
  {
    id: 'automations',
    icon: Zap,
    color: '#f59e0b',
    eyebrow: "خودکارسازی",
    title: "اتوماسیون هوشمند، بدون کد.",
    body:
      "اقدامات بر اساس برنامه، احساسات، یا کلمات کلیدی را آغاز کنید. پاسخ خودکار به پرسش‌های متداول، تشدید بررسی‌های منفی، و اطلاع دادن به انسان مناسب در لحظه مناسب.",
    bullets: [
      "سازنده قوانین بصری - بدون کد",
      "در برنامه، کلمه کلیدی، یا احساسات ماشه",
      "رابط های داخلی به اسلک، ایمیل، واتس‌اپ",
      "اجرای تاریخچه با دنباله حسابرسی کامل",
    ],
  },
  {
    id: 'reports',
    icon: FileText,
    color: '#3b82f6',
    eyebrow: "گزارش‌ها",
    title: "گزارش‌های صیقلی که مشتریان دوست دارند.",
    body:
      "در چند دقیقه گزارش عملکرد با برند خود بسازید. تحویل هفتگی یا ماهانه را زمان‌بندی کنید، با پیوند امن به اشتراک بگذارید یا خروجی PDF بگیرید.",
    bullets: [
      "پی دی اف مارک دار و پیوندهای وب قابل اشتراک گذاری",
      "آهنگ تحویل برنامه‌ریزی شده خودکار",
      "سفارش بخش کشیدن و رها کردن",
      "خلاصه اجرایی ایجاد شده توسط هوش مصنوعی",
    ],
  },
  {
    id: 'team',
    icon: Users,
    color: '#10b981',
    eyebrow: "تیم",
    title: "کنترل های همکاری دانه ای.",
    body:
      "از هم تیمی ها دعوت کنید، مشتریان را اختصاص دهید، مجوزهای دامنه را در هر صفحه یا عمل انجام دهید. گردش کار تایید یکپارچگی نام تجاری را بدون کاهش سرعت شما حفظ می‌کند.",
    bullets: [
      "مجوز بر اساس نقش + هر کاربر لغو می‌شود",
      "تکالیف فضای کاری چند مشتری",
      "زنجیره های تایید با موضوعات نظر",
      "SAML SSO در سازمانی",
    ],
  },
  {
    id: 'security',
    icon: ShieldCheck,
    color: '#ef4444',
    eyebrow: "امنیت",
    title: "به طور پیش فرض درجه سازمانی.",
    body:
      "رمزگذاری شده در حالت استراحت با Fernet. تأیید اعتبار JWT با به‌روزرسانی چرخشی. گزارش حسابرسی کامل از هر اقدام. SOC 2 در حال انجام است. GDPR + DPDP-ready.",
    bullets: [
      "رمزگذاری در حالت استراحت (Fernet) + در حال انتقال (TLS 1.3)",
      "گزارش حسابرسی قابل جستجو در هر اقدام",
      "مطابق با GDPR + هند DPDP",
      "برنامه پاداش اشکال + پاسخ حادثه 24/7",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Meta
        title={"امکانات"}
        description={"تحلیل و آمار بین پلتفرمی، ویرایشگر محتوا مبتنی بر هوش مصنوعی، صندوق ورودی یکپارچه، اتوماسیون، گزارش‌های برند اختصاصی، مجوزهای گروهی - هر گردش کاری که آژانس شما در یک پلتفرم نیاز دارد."}
      />
      {/* ── Hero ─────────────────────────────────────── */}
      <section style={{ padding: '128px 32px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--brand-mesh)',
            opacity: 0.35, filter: 'blur(80px) saturate(140%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <Badge variant="brand" size="md">امکانات</Badge>
          <h1 style={{
            margin: '20px 0 18px',
            fontSize: 'clamp(40px, 5vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            یک سکو. هر گردش کار
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
            همه آنچه برای اداره یک آژانس مدرن نیاز دارید. از اولین اتصال OAuth به گزارش مشتری صیقلی - راوینتا کل حلقه رشد را کنترل می‌کند.
          </p>
        </div>
      </section>

      {/* ── Body: TOC + alternating feature blocks ─────────── */}
      <section style={{ padding: '32px 32px 96px' }}>
        <div
          style={{
            maxWidth: 'var(--container-2xl)',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 220px',
            gap: 64,
          }}
          className="features-grid"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 96 }}>
            {FEATURES.map((f, i) => (
              <FeatureBlock key={f.id} feature={f} flip={i % 2 === 1} />
            ))}
          </div>

          {/* Sticky TOC */}
          <aside
            style={{
              position: 'sticky',
              top: 96,
              alignSelf: 'flex-start',
              padding: 16,
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xs)',
            }}
            className="features-toc"
          >
            <div style={{
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              padding: '4px 8px 10px',
            }}>
              در این صفحه
            </div>
            <FeaturesNav features={FEATURES.map(f => ({ id: f.id, eyebrow: f.eyebrow, icon: <f.icon size={13} strokeWidth={2.2} style={{ color: f.color, flexShrink: 0 }} /> }))} />
          </aside>
        </div>

        <style>{`
          @media (max-width: 980px) {
            .features-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
            .features-toc { display: none !important; }
          }
        `}</style>
      </section>

      {/* ── Final CTA ────────────────────────────────── */}
      <section style={{ padding: '64px 32px 120px', textAlign: 'center', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.4vw, 40px)', fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
          آن را در گردش کار خود ببینید.
        </h2>
        <p style={{ margin: '12px auto 28px', maxWidth: 480, fontSize: 16, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
          رایگان و منبع باز. خود میزبانی کنید یا آن را به صورت محلی اجرا کنید - بدون کارت اعتباری.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button as={Link} to="/signup" size="lg" iconRight={ArrowRight}>شروع رایگان</Button>
        </div>
      </section>
    </>
  );
}

function FeatureBlock({ feature, flip }) {
  return (
    <MotionSection
      id={feature.id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        scrollMarginTop: 96,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 48,
        alignItems: 'center',
        flexDirection: flip ? 'row-reverse' : 'row',
      }}
      className="feature-block"
    >
      {/* Visual */}
      <div style={{ order: flip ? 2 : 1 }}>
        <FeatureVisual feature={feature} />
      </div>

      {/* Copy */}
      <div style={{ order: flip ? 1 : 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px',
          fontSize: 11, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#fff',
          background: feature.color,
          borderRadius: 'var(--radius-pill)',
          marginBottom: 14,
        }}>
          <feature.icon size={11} strokeWidth={2.6} />
          {feature.eyebrow}
        </div>
        <h2 style={{
          margin: 0,
          fontSize: 'clamp(28px, 3.4vw, 36px)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
          lineHeight: 1.15,
        }}>
          {feature.title}
        </h2>
        <p style={{ margin: '14px 0 20px', fontSize: 15, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
          {feature.body}
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feature.bullets.map((b) => (
            <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text-primary)' }}>
              <span style={{
                display: 'inline-flex',
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--success-bg)', color: 'var(--success)',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Check size={11} strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @media (max-width: 880px) {
          .feature-block { grid-template-columns: 1fr !important; gap: 24px !important; }
          .feature-block > div:first-child { order: 1 !important; }
          .feature-block > div:last-child  { order: 2 !important; }
        }
      `}</style>
    </MotionSection>
  );
}

// Stylised per-feature visual — small composition, no real screenshots needed
function FeatureVisual({ feature }) {
  const Icon = feature.icon;
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '4 / 3',
        borderRadius: 'var(--radius-xl)',
        background: `linear-gradient(135deg, ${feature.color}22, transparent 80%), var(--surface-card)`,
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Window chrome */}
      <div style={{ display: 'flex', gap: 6 }}>
        {['#ef4444', '#f59e0b', '#10b981'].map((c) => (
          <span key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
        ))}
      </div>

      {/* Header pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        alignSelf: 'flex-start',
      }}>
        <span style={{
          width: 22, height: 22,
          background: feature.color, color: '#fff',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={12} strokeWidth={2.4} />
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {feature.eyebrow}
        </span>
      </div>

      {/* Skeleton-y "data" rows */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
        {[0.85, 0.6, 0.7, 0.5].map((w, i) => (
          <div
            key={i}
            style={{
              height: 10,
              width: `${w * 100}%`,
              borderRadius: 999,
              background: i === 0
                ? `linear-gradient(90deg, ${feature.color}, ${feature.color}66)`
                : 'var(--surface-sunken)',
              opacity: i === 0 ? 0.95 : 0.85,
            }}
          />
        ))}
      </div>

      {/* Footer chip */}
      <div
        style={{
          alignSelf: 'flex-end',
          padding: '4px 10px',
          fontSize: 10, fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: feature.color,
          background: `${feature.color}1A`,
          borderRadius: 'var(--radius-pill)',
        }}
      >
        زنده
      </div>
    </div>
  );
}
