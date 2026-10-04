/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * /for-agencies — landing page targeted at agencies (B2B).
 *
 * Counterpart to /for-businesses. Hammers ROI + the marketplace exposure
 * benefit (the marketplace is the new hook agencies didn't have before).
 */
import Link from '../components/marketing/MarketingLink';
import { MotionDiv, MotionH1, MotionP } from '../components/marketing/Motion';
import {
  ArrowRight, Sparkles, Building2, TrendingUp, Star, Inbox, Wand2,
  ShieldCheck, Check, Users2,
} from 'lucide-react';

import MarketingLayout from '../components/marketing/MarketingLayout';
import Button from '../components/marketing/MarketingButton';
import Badge from '../components/marketing/MarketingBadge';
import Meta from '../components/Meta';


export default function ForAgenciesPage() {
  return (
    <MarketingLayout>
      <Meta
        title={"راوینتا برای آژانس‌ها - بیش از 100 مشتری را از یک مکان مدیریت کنید"}
        description={"یک داشبورد برای تحلیل و آمار، محتوا، صندوق ورودی، تبلیغات و کمپین‌های واتس‌اپ در هر مشتری. فهرست بازار سرنخ های ورودی را به ارمغان می آورد. اعتماد + مجوزهای تعبیه شده در بنیاد."}
      />
      <Hero />
      <ROIBand />
      <MarketplaceExposure />
      <FeatureBlocks />
      <FinalCTA />
    </MarketingLayout>
  );
}


function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '128px 32px 72px' }}>
      <div aria-hidden style={meshBg} />
      <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
        <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge variant="brand" icon={Building2} size="md">برای آژانس‌ها · بازار گنجانده شده است گیره</Badge>
        </MotionDiv>
        <MotionH1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          style={{
            margin: '20px 0 16px',
            fontSize: 'clamp(36px, 5.2vw, 60px)',
            lineHeight: 1.06, letterSpacing: '-0.03em',
            fontWeight: 600, color: 'var(--text-primary)',
          }}
        >
          بیش از 100 مشتری را مدیریت کنید{' '}
          <span style={{ backgroundImage: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            یک مکان.
          </span>
        </MotionH1>
        <MotionP
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ margin: '0 auto', maxWidth: 640, fontSize: 18, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}
        >
          تحلیل و آمار، محتوا، صندوق ورودی، کمپین‌های واتس‌اپ، تبلیغات، هوش مصنوعی - هر مشتری در یک داشبورد زیبا. در بازار ما فهرست کنید و سرنخ های ورودی دریافت کنید. بر اساس اعتماد ساخته شده است: هر اقدام ثبت شده، هر مجوز قابل لغو.
        </MotionP>
        <MotionDiv
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Button as={Link} to="/signup" size="xl" iconRight={ArrowRight}>
            آزمایش رایگان را شروع کنید
          </Button>
          <Button as={Link} to="/agencies" size="xl" variant="secondary" icon={Building2}>
            به بازار مراجعه کنید
          </Button>
        </MotionDiv>
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-tertiary)' }}>
          آزمایش رایگان 14 روزه · بدون کارت اعتباری · 5 سیستم عامل متصل به ازای هر مشتری
        </p>
      </div>
    </section>
  );
}


function ROIBand() {
  const items = [
    { stat: "15+ ساعت",      label: "ذخیره شده در هر هفته آژانس در مقابل شعبده بازی 5 سیستم عامل" },
    { stat: "40٪ سریعتر",   label: "زمان پاسخگویی صندوق ورودی با پیشنهادات هوش مصنوعی" },
    { stat: "3× مشتریان",   label: "قابل مدیریت در هر AM با گردش کار یکپارچه" },
    { stat: "0 ورود",     label: "به اشتراک گذاشته شده با مشتریان - آنها حساب های خود را حفظ می‌کنند" },
  ];
  return (
    <section style={{ padding: '40px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 'var(--container-2xl)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {items.map((it) => (
          <div key={it.label} style={{ textAlign: 'center', padding: '14px 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {it.stat}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}


function MarketplaceExposure() {
  return (
    <section style={{ padding: '72px 32px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="fa-grid">
        <div>
          <Badge variant="brand" icon={Star} size="md">جدید: بازار</Badge>
          <h2 style={{ margin: '14px 0 10px', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            سرنخ های ورودی، نه ارسال ایمیل سرد.
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
            آژانس خود را در بازار راوینتا فهرست کنید. کسب‌وکارهای تأیید شده براساس صنعت، مکان و رتبه‌بندی جستجو می‌کنند - سپس مستقیماً یک درخواست مدیریت برای شما ارسال می‌کنند. نظرات از مشتریانی با روابط واقعی و تأیید شده است.
          </p>
          <Button as={Link} to="/agencies" variant="secondary" size="md" icon={Building2}>
            به بازار مراجعه کنید
          </Button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            "پس از اینکه تیم ما ثبت نام شما را بررسی کرد، نشان تأیید شد",
            "قابل فیلتر بر اساس صنعت، خدمات، مکان، قیمت، رتبه بندی",
            "نظرات مشتریان واقعی و تأیید شده توسط رابطه (بدون بررسی جعلی)",
            "نمایه عمومی با خدمات، قیمت گذاری، نمونه کارها (ویرایشگر زنده)",
            "قرار دادن ویژه برای آژانس‌های تأیید شده با ستاره های بیش از 4.5",
          ].map((s) => (
            <li key={s} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
              <Check size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <style>{`@media (max-width: 880px) { .fa-grid { grid-template-columns: 1fr !important; gap: 28px !important; } }`}</style>
    </section>
  );
}


function FeatureBlocks() {
  const items = [
    { icon: TrendingUp,  title: "تحلیل و آمار یکپارچه",     body: "یک داشبورد در فیس‌بوک، اینستاگرام، یوتیوب، لینکدین، GMB. معیار بین مشتری صادرات با برند اختصاصی" },
    { icon: Inbox,       title: "صندوق ورودی یکپارچه",         body: "پیامک، نظرات، و نظرات در یک صفحه. پاسخ‌های پیشنهادی هوش مصنوعی با لحن برند هر مشتری تنظیم می‌شود. قوانین تایید در جایی که مشتری آنها را می خواهد." },
    { icon: Wand2,       title: "ویرایشگر محتوا + زمانبندی",  body: "یک بار پیش‌نویس کنید، همه جا پست کنید. نادیده گرفتن هر پلتفرم متن جایگزین تصویر هوش مصنوعی، تحقیق هشتگ، توصیه های زمان بهینه." },
    { icon: Users2,      title: "کمپین‌های واتس‌اپ",    body: "کمپین‌های مبتنی بر پین‌بات با مخاطبین، الگوها، زمان‌بندی، و تحلیل و آمار کامل تحویل." },
    { icon: ShieldCheck, title: "اعتماد از طریق طراحی",       body: "هر اقدام ثبت شده است. مجوزهایی که شما و مشتری هر دو می بینید. قطع ارتباط کاربر نهایی همیشه کار می‌کند - بدون داستان قفل." },
    { icon: Sparkles,    title: "AI Studio در سراسر هیئت مدیره", body: "آموزش لحن برند، نویسنده پست، تولید بینش، تشخیص ناهنجاری، روایت گزارش. کل پشته هوش مصنوعی که ما ارسال می کنیم داخل داشبورد شما قرار دارد." },
  ];
  return (
    <section style={{ padding: '64px 32px', background: 'var(--surface-card)' }}>
      <div style={{ maxWidth: 'var(--container-2xl)', margin: '0 auto' }}>
        <h2 style={sectionH}>هر چیزی که یک آژانس نیاز دارد، در یک مکان</h2>
        <p style={sectionSub}>دیگر نیازی به تعویض 5 تب، صادرات صفحه گسترده، ورود به سیستم مشترک مشتری نیست.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 32 }}>
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
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>{it.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}


function FinalCTA() {
  return (
    <section style={{ padding: '72px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          ببینید چقدر زمان خواهید داشت.
        </h2>
        <p style={{ margin: '8px 0 22px', fontSize: 15, color: 'var(--text-secondary)' }}>
          رایگان و منبع باز. مشتریان واقعی خود را بیاورید - میزبان خود بدون هزینه برای هر صندلی.
        </p>
        <Button as={Link} to="/signup" size="xl" iconRight={ArrowRight}>
          شروع رایگان
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
  textAlign: 'center', lineHeight: 'var(--line-height-body)',
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
