/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { BrandLogoHorizontal } from '../components/ui/BrandLogo';
import SocialPlatformIcon from '../components/ui/SocialPlatformIcon';

const PLATFORMS = [
  {
    key: 'facebook',
    label: "فیس‌بوک و اینستاگرام",
    badge: "متا",
    steps: [
      <>برو به خودت <strong>حساب فیس‌بوک</strong> و روی منوی بالا سمت راست کلیک کنید</>,
      <><strong>تنظیمات و حریم خصوصی</strong> → <strong>تنظیمات</strong></>,
      <>کلیک کنید <strong>برنامه ها و وب سایت ها</strong> در منوی سمت چپ</>,
      <>پیدا کنید <strong>راوینتا</strong> در لیست ← کلیک کنید <strong>مشاهده و ویرایش کنید</strong></>,
      <>به پایین بروید و کلیک کنید <strong>حذف</strong> → <strong>حذف</strong> برای تأیید</>,
      <>متا به طور خودکار سرورهای ما را از طریق پاسخ به تماس حذف داده‌های ثبت‌شده ما مطلع می‌کند - ما داده‌های شما را ظرف 30 روز حذف خواهیم کرد.</>,
    ],
    note: "حذف راوینتا همچنین دسترسی به هر حساب تجاری مرتبط اینستاگرام مرتبط با همان صفحه فیس‌بوک را لغو می‌کند.",
  },
  {
    key: 'google',
    label: "گوگل و یوتیوب",
    badge: "گوگل",
    steps: [
      <>برو به <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={{ color: '#007a9a' }}>myaccount.google.com/permissions</a></>,
      <>پیدا کنید <strong>راوینتا</strong> در لیست برنامه های شخص ثالث</>,
      <>کلیک کنید <strong>راوینتا</strong> ← کلیک کنید <strong>دسترسی را حذف کنید</strong></>,
      <>حذف را تأیید کنید - ما داده‌های تحلیل و آمار حافظه پنهان شما را ظرف 30 روز حذف خواهیم کرد</>,
    ],
    note: "این امکان دسترسی راوینتا به یوتیوب Data API، یوتیوب تحلیل و آمار API و داده‌های نمایه کسب‌وکار گوگل API را لغو می‌کند.",
  },
  {
    key: 'linkedin',
    label: "لینکدین",
    badge: "لینکدین",
    steps: [
      <>برو به خودت <strong>حساب لینکدین</strong> و کلیک کنید <strong>من</strong> در ناوبری بالا</>,
      <>کلیک کنید <strong>تنظیمات و حریم خصوصی</strong></>,
      <>کلیک کنید <strong>حریم خصوصی داده ها</strong> در منوی سمت چپ → <strong>برنامه های کاربردی دیگر</strong></>,
      <>پیدا کنید <strong>راوینتا</strong> در لیست ← کلیک کنید <strong>حذف</strong></>,
      <>حذف را تأیید کنید - ما داده‌های تحلیل و آمار صفحه ذخیره شده شما را ظرف 30 روز حذف خواهیم کرد</>,
    ],
    note: "این امکان دسترسی به تحلیل و آمار صفحه لینکدین، داده‌های عملکرد پست و آمار دنبال کنندگان را لغو می‌کند.",
  },
];

export default function DataDeletionPage() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <a href="/" style={styles.logoLink}>
            <div style={styles.logoPlate}>
              <BrandLogoHorizontal height={32} />
            </div>
          </a>
        </div>

        <div style={styles.card}>
          <div style={styles.badge}>دستورالعمل حذف داده ها</div>
          <h2 style={styles.title}>حذف داده‌های کاربر</h2>
          <p style={styles.meta}>آخرین به‌روزرسانی: 3 آوریل 2026</p>

          <p style={styles.intro}>
            راوینتا به فیس‌بوک، اینستاگرام، گوگل، یوتیوب و لینکدین متصل می‌شود تا تحلیل و آمار شبکه‌های اجتماعی شما را نمایش دهد. شما می‌توانید به سه روش دسترسی را لغو و داده‌های خود را حذف کنید:{' '}
            <strong>(1)</strong> مستقیماً از تنظیمات هر پلتفرم زیر،{' '}
            <strong>(2)</strong> از تنظیمات حساب راوینتا شما (تنظیمات → حذف حساب)، یا{' '}
            <strong>(3)</strong> با ارسال ایمیل به ما در{' '}
            مدیر این نمونه راوینتا. تمام داده ها به طور دائم در داخل حذف می‌شوند <strong>30 روز</strong> یک درخواست معتبر.
          </p>

          {/* Per-platform sections */}
          <h3 style={styles.sectionGroupTitle}>حذف دسترسی توسط پلتفرم</h3>

          {PLATFORMS.map((platform) => (
            <div key={platform.key} style={styles.platformBlock}>
              <div style={styles.platformHeader}>
                <span style={styles.platformIcon}>
                  <SocialPlatformIcon platform={platform.key} size={28} />
                </span>
                <div>
                  <div style={styles.platformLabel}>{platform.label}</div>
                  <div style={styles.platformBadge}>{platform.badge}</div>
                </div>
              </div>
              <ol style={styles.ol}>
                {platform.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <div style={styles.noteBox}>
                <span style={styles.noteIcon}>ℹ</span>
                <span style={styles.noteText}>{platform.note}</span>
              </div>
            </div>
          ))}

          {/* Email request */}
          <div style={styles.divider} />

          <h3 style={styles.sectionGroupTitle}>یا - مستقیماً به ما ایمیل بزنید</h3>
          <p style={styles.p}>
            اگر ترجیح می‌دهید، یک درخواست حذف را به تیم حریم خصوصی ما ارسال کنید و ما همه داده‌ها را در همه سیستم عامل‌های متصل حذف خواهیم کرد:
          </p>
          <div style={styles.emailBox}>
            <span style={styles.emailIcon}>✉</span>
            <a href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/issues" target="_blank" rel="noreferrer" style={styles.emailLink}>
              مشکلات گیت‌هاب
            </a>
          </div>
          <p style={styles.p}>لطفاً در ایمیل خود بنویسید:</p>
          <ul style={styles.ul}>
            <li>نام کامل شما</li>
            <li>آدرس ایمیل مرتبط با حساب راوینتا شما</li>
            <li>پلتفرم(هایی) که می خواهید داده ها از آنها حذف شود (فیس‌بوک، گوگل، لینکدین، یا همه)</li>
            <li>خط موضوع: <strong>"درخواست حذف داده ها"</strong></li>
          </ul>

          <div style={styles.divider} />

          {/* What we delete */}
          <h3 style={styles.sectionGroupTitle}>آنچه را حذف می کنیم</h3>
          <p style={styles.p}>در صورت درخواست معتبر، ما برای همیشه حذف می کنیم:</p>
          <ul style={styles.ul}>
            <li>حساب راوینتا و اعتبارنامه ورود شما</li>
            <li>همه نشانه‌های دسترسی OAuth برای هر پلتفرم متصل</li>
            <li>همه داده‌های تحلیلی: برداشت‌ها، دسترسی، لایک‌ها، تعداد دنبال‌کنندگان، معیارهای پست</li>
            <li>هرگونه گزارش یا صادراتی که از داده‌های شما ایجاد می‌شود</li>
            <li>کارهای همگام سازی برنامه‌ریزی شده مرتبط با حساب های شما</li>
          </ul>

          <div style={styles.divider} />

          {/* Timeline */}
          <h3 style={styles.sectionGroupTitle}>تأیید و جدول زمانی</h3>
          <ul style={styles.ul}>
            <li>ایمیل تایید در داخل ارسال شد <strong>72 ساعت</strong></li>
            <li>همه داده ها به طور دائم در داخل حذف شدند <strong>30 روز</strong></li>
            <li>ایمیل تایید نهایی پس از اتمام حذف</li>
            <li>داده‌های انبوه ناشناس ممکن است برای انطباق قانونی نگهداری شوند - هرگز به هویت شما مرتبط نشده است</li>
          </ul>

          <div style={styles.contactBox}>
            <p style={styles.contactTitle}>سوال؟</p>
            <p style={styles.contactText}>
              با تیم حریم خصوصی ما تماس بگیرید{' '}
              <a href="https://github.com/cbsshekhawat18-lab/social-stats-social-media-manager/issues" target="_blank" rel="noreferrer" style={styles.inlineLink}>مشکلات گیت‌هاب پروژه</a>
              {' '}یا به ما مراجعه کنید{' '}
              <a href="/privacy" style={styles.inlineLink}>سیاست حریم خصوصی</a>.
            </p>
          </div>
        </div>

        <p style={styles.footer}>
          © 2026 راوینتا ·{' '}
          <a href="/privacy" style={styles.footerLink}>سیاست حریم خصوصی</a>{' '}·{' '}
          <a href="/terms" style={styles.footerLink}>شرایط استفاده از خدمات</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--surface-page)', padding: '40px 16px' },
  container: { maxWidth: 760, margin: '0 auto' },
  header: { textAlign: 'center', marginBottom: 32 },
  logoPlate: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 20px', borderRadius: 18, background: 'var(--surface-card)',
    border: '1px solid var(--border-default)', boxShadow: '0 4px 16px rgba(0,215,255,0.08)',
  },
  card: {
    background: 'var(--surface-card)', borderRadius: 20, padding: '48px 48px',
    boxShadow: '0 8px 32px rgba(15,23,42,.07)', border: '1px solid var(--border-default)',
  },
  badge: {
    display: 'inline-block', padding: '4px 12px', borderRadius: 999,
    background: '#e6fbff', color: '#007a9a', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14,
    border: '1px solid #99eeff',
  },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginTop: 0, marginBottom: 6 },
  meta: { fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 24, marginTop: 0 },
  intro: {
    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8,
    background: 'var(--surface-page)', borderRadius: 12, padding: '16px 18px',
    marginBottom: 32, border: '1px solid var(--border-default)',
  },
  sectionGroupTitle: {
    fontSize: 17, fontWeight: 800, color: 'var(--text-primary)',
    margin: '0 0 20px', paddingBottom: 10,
    borderBottom: '2px solid #e6fbff',
  },
  platformBlock: {
    marginBottom: 28, padding: '20px 22px', borderRadius: 14,
    border: '1px solid var(--border-default)', background: '#fafcff',
  },
  platformHeader: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
  },
  platformIcon: { fontSize: 28, lineHeight: 1 },
  platformLabel: { fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 },
  platformBadge: {
    display: 'inline-block', fontSize: 11, fontWeight: 700,
    color: '#007a9a', background: '#e6fbff', border: '1px solid #99eeff',
    borderRadius: 999, padding: '1px 8px', letterSpacing: '0.06em',
  },
  noteBox: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    marginTop: 12, background: 'var(--surface-page)', borderRadius: 8,
    padding: '10px 14px', border: '1px solid var(--border-default)',
  },
  noteIcon: { fontSize: 14, color: '#007a9a', flexShrink: 0, marginTop: 1 },
  noteText: { fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 },
  divider: { height: 1, background: 'var(--border-default)', margin: '32px 0' },
  p: { margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 },
  ol: { margin: '0 0 10px', paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 2.1 },
  ul: { margin: '0 0 10px', paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 2.1 },
  emailBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#e6fbff', border: '1px solid #99eeff',
    borderRadius: 10, padding: '12px 16px', marginBottom: 16,
  },
  emailIcon: { fontSize: 18, color: '#007a9a' },
  emailLink: { color: '#007a9a', fontWeight: 700, fontSize: 15, textDecoration: 'none' },
  contactBox: {
    marginTop: 8, background: 'var(--surface-page)', borderRadius: 12,
    padding: '20px 22px', border: '1px solid var(--border-default)',
  },
  contactTitle: { margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' },
  contactText: { margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 },
  inlineLink: { color: '#007a9a', fontWeight: 600, textDecoration: 'none' },
  footer: { textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, marginTop: 24 },
  footerLink: { color: '#007a9a', textDecoration: 'none' },
  logoLink: { display: 'inline-flex', textDecoration: 'none' },
};
