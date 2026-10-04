/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * /for-businesses — landing page for end-users (B2C side of the marketplace).
 *
 * Counterpart to /for-agencies. Promotes self-serve signup and the "your
 * data stays yours" trust story. Reuses the existing MarketingLayout so
 * nav + footer match the rest of the marketing site.
 */
import Link from '../components/marketing/MarketingLink';
import { MotionDiv, MotionH1, MotionP } from '../components/marketing/Motion';
import {
  ArrowRight, Sparkles, ShieldCheck, Plug, BarChart3, Users2,
  Check, Building2, Search, Bot,
} from 'lucide-react';

import MarketingLayout from '../components/marketing/MarketingLayout';
import Button from '../components/marketing/MarketingButton';
import Badge from '../components/marketing/MarketingBadge';
import Meta from '../components/Meta';


export default function ForBusinessesPage() {
  return (
    <MarketingLayout>
      <Meta
        title={"راوینتا برای مشاغل - کنترل شبکه‌های اجتماعی خود را در دست بگیرید"}
        description={"رایگان برای همیشه برای افراد و مشاغل کوچک. اینستاگرام، فیسبوک، یوتیوب، لینکدین و گوگل برای کسب و کار من را در 5 دقیقه متصل کنید. یک آژانس را در هیئت مدیره بیاورید (یا نگیرید) - کنترل را در دست خواهید داشت."}
      />
      <Hero />
      <ValueProps />
      <AgencyOptional />
      <PrivacyTrust />
      <FinalCTA />
    </MarketingLayout>
  );
}


function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '128px 32px 72px' }}>
      <div aria-hidden style={meshBg} />
      <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
        <MotionDiv
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="brand" icon={Sparkles} size="md">برای صاحبان مشاغل · رایگان برای همیشه</Badge>
        </MotionDiv>
        <MotionH1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          style={{
            margin: '20px 0 16px',
            fontSize: 'clamp(36px, 5.2vw, 60px)',
            lineHeight: 1.06, letterSpacing: '-0.03em',
            fontWeight: 600, color: 'var(--text-primary)',
          }}
        >
          کنترل خود را در دست بگیرید{' '}
          <span style={{ backgroundImage: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            شبکه‌های اجتماعی.
          </span>
        </MotionH1>
        <MotionP
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ margin: '0 auto', maxWidth: 640, fontSize: 18, lineHeight: 1.6, color: 'var(--text-secondary)' }}
        >
          نمایندگان املاک، کلینیک‌ها، رستوران‌ها، سازندگان - حساب‌های خود را در 5 دقیقه به هم متصل کنید و شروع به پست کردن، پاسخ دادن و ردیابی آنچه در حال انجام است، کنید. رایگان برای همیشه برای افراد.
        </MotionP>
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Button as={Link} to="/auth/end-user/signup" size="xl" iconRight={ArrowRight}>
            شروع کنید — رایگان است
          </Button>
          <Button as={Link} to="/agencies" size="xl" variant="secondary" icon={Search}>
            آژانس‌ها را مرور کنید
          </Button>
        </MotionDiv>
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-tertiary)' }}>
          بدون کارت اعتباری · 5 سیستم عامل · ✨ از روز اول با کمک هوش مصنوعی
        </p>
      </div>
    </section>
  );
}


function ValueProps() {
  const items = [
    { icon: Plug,       title: "در 5 دقیقه وصل شوید",  body: "OAuth به اینستاگرام، فیس‌بوک، یوتیوب، لینکدین و Google My Business. ما به نوسازی رمز و خصلت های پلتفرم رسیدگی می کنیم." },
    { icon: BarChart3,  title: "ببینید چه چیزی کار می‌کند",   body: "تحلیل و آمار یکپارچه در همه پلتفرم‌ها - به این ترتیب از تب پرش خودداری می‌کنید و شروع به تصمیم‌گیری می‌کنید." },
    { icon: Bot,        title: "هوش مصنوعی داخلی",           body: "پست‌ها را پیش‌نویس کنید، پاسخ‌ها را پیشنهاد دهید و بهترین زمان برای پست کردن را نشان دهید - بدون کپی کردن چیزی در ابزار جداگانه." },
    { icon: ShieldCheck,title: "داده‌های شما، قوانین شما", body: "هرزمان خواستید اتصال را قطع کنید. صادرات در هر زمان. گزارش حسابرسی هر اقدام - توسط شما، توسط هوش مصنوعی، توسط آژانس در صورت انجام." },
  ];
  return (
    <section style={{ padding: '64px 32px', background: 'var(--surface-card)' }}>
      <div style={{ maxWidth: 'var(--container-2xl)', margin: '0 auto' }}>
        <h2 style={sectionH}>برای روشی که واقعاً کار می‌کنید ساخته شده است</h2>
        <p style={sectionSub}>پنج سکوی متصل. یک داشبورد صفحات گسترده صفر</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 32 }}>
          {items.map((it) => (
            <article key={it.title} style={featureCard}>
              <span style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: 'var(--brand-primary-glow)', color: 'var(--brand-primary-hover)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>
                <it.icon size={18} strokeWidth={2.2} />
              </span>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{it.title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


function AgencyOptional() {
  return (
    <section style={{ padding: '72px 32px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="fb-grid">
        <div>
          <Badge variant="brand" icon={Users2} size="md">مناسب آژانس‌ها</Badge>
          <h2 style={{ margin: '14px 0 10px', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            قبلاً با آژانس کار می‌کنید؟ آنها می‌توانند به صورت رایگان به شما بپیوندند.
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            آنها را از طریق ایمیل دعوت کنید - آنها بدون هیچ هزینه ای یک حساب کاربری در راوینتا دریافت می‌کنند. شما مجوزها را تنظیم می‌کنید، اقدامات حساس را علامت گذاری می‌کنید "اول از من بپرس" و دسترسی را با یک کلیک لغو می‌کنید. دیگر هیچ ورود مشترکی وجود ندارد.
          </p>
          <Button as={Link} to="/agencies" variant="secondary" size="md" icon={Search}>
            بازار آژانس را مرور کنید
          </Button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            "ماتریس مجوزها - کارهایی که می‌توانند انجام دهند و نمی‌توانند انجام دهند را تغییر دهند",
            "تأییدیه‌های «اول از من بپرس» برای اقدامات مخاطره‌آمیز (انتشار، هزینه تبلیغات، حذف)",
            "گزارش فعالیت - هر اقدام آژانس برای ممیزی ثبت می‌شود",
            "توقف دسترسی برای تعطیلات. زمانی که راه خود را از هم جدا کردید به طور کامل لغو کنید",
          ].map((s) => (
            <li key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
              <Check size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <style>{`@media (max-width: 880px) { .fb-grid { grid-template-columns: 1fr !important; gap: 28px !important; } }`}</style>
    </section>
  );
}


function PrivacyTrust() {
  return (
    <section style={{ padding: '64px 32px', background: 'var(--surface-sunken)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <span style={{
          width: 48, height: 48, margin: '0 auto 16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--brand-primary-glow)', color: 'var(--brand-primary-hover)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={22} strokeWidth={2.2} />
        </span>
        <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          داده‌های شما از آن شما می ماند.
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          ما هرگز داده‌های شما را نمی فروشیم. ما هرگز در پست‌های خصوصی شما آموزش نمی‌دهیم. قطع ارتباط یک پلتفرم یک کلیک طول می کشد - حتی اگر آژانسی حساب شما را مدیریت کند. صادرات در هر زمان. در هر زمان حذف کنید.
        </p>
      </div>
    </section>
  );
}


function FinalCTA() {
  return (
    <section style={{ padding: '72px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          در 5 دقیقه آماده است.
        </h2>
        <p style={{ margin: '8px 0 22px', fontSize: 15, color: 'var(--text-secondary)' }}>
          بدون کارت اعتباری. بدون نیاز به نمایندگی هر وقت خواستی یکی بیار
        </p>
        <Button as={Link} to="/auth/end-user/signup" size="xl" iconRight={ArrowRight}>
          حساب کاربری من را ایجاد کنید
        </Button>
      </div>
    </section>
  );
}


const sectionH = {
  margin: 0,
  fontSize: 32, fontWeight: 700,
  color: 'var(--text-primary)', letterSpacing: '-0.025em',
  textAlign: 'center',
};
const sectionSub = {
  margin: '8px auto 0', maxWidth: 580,
  fontSize: 15, color: 'var(--text-secondary)',
  textAlign: 'center', lineHeight: 1.6,
};
const featureCard = {
  padding: 20,
  background: 'var(--surface-page)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
};
const meshBg = {
  position: 'absolute', inset: 0,
  background: 'var(--brand-mesh)',
  opacity: 0.45, filter: 'blur(80px) saturate(140%)', zIndex: 0,
};
