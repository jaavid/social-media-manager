/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * HomePage — Social Stats marketing site front door.
 *
 * 15-section long-scroll structure (from the marketing-website spec):
 *   1.  Hero (above fold)
 *   2.  Platform strip (channels we cover)
 *   3.  3 pillars — Analyze · Engage · Convert
 *   4.  Bento grid (8 features)
 *   5.  Use-case tabs (Agencies · Real Estate · Clinics · Restaurants · Creators)
 *   6.  How it works (4-step)
 *   7.  AI everywhere (animated chat demo)
 *   8.  Comparison table vs Hootsuite / Sprout / Buffer (feature parity only)
 *   9.  Agency marketplace teaser
 *   10. Capability stats band
 *   11. Final CTA (email capture)
 *   12. Footer (provided by MarketingLayout)
 *
 * Customer testimonials, fabricated case studies, and customer-count claims
 * are intentionally absent until we have real customers to feature.
 */

import { requestLanguage } from '../i18n/server';
import { message } from '../i18n/translate';
import Link from '../components/marketing/MarketingLink';
import { MotionDiv, MotionH1, MotionP } from '../components/marketing/Motion';
import UseCaseTabs from '../components/marketing/HomeUseCaseTabs';
import TrackedButton from '../components/marketing/TrackedButton';
import {
  ArrowRight, PlayCircle, Sparkles, Check,
  BarChart3, MessageCircle, Zap, Bot, Inbox, PenSquare,
  Briefcase, Building2, Stethoscope, UtensilsCrossed, Palette,
  TrendingUp,
} from 'lucide-react';

import MarketingLayout      from '../components/marketing/MarketingLayout';
import MeshGradient         from '../components/marketing/MeshGradient';
import AnimatedDashboardMockup from '../components/marketing/AnimatedDashboardMockup';
import FloatingUICard       from '../components/marketing/FloatingUICard';
import ParallaxTilt         from '../components/marketing/ParallaxTilt';
import ScrollReveal         from '../components/marketing/ScrollReveal';
import FeatureBento         from '../components/marketing/FeatureBento';
import AnimatedChat         from '../components/marketing/AnimatedChat';
import ComparisonTable      from '../components/marketing/ComparisonTable';
import MetricCounter        from '../components/marketing/MetricCounter';
import CTASection           from '../components/marketing/CTASection';
import {
  AIAssistantPreview, ComposerPreview, InboxPreview, BotBuilderPreview,
  AIInsightPreview, AutomationsPreview, AnalyticsPreview, ReportsPreview,
} from '../components/marketing/BentoPreviews';

import Button from '../components/marketing/MarketingButton';
import Meta   from '../components/Meta';
import JsonLd, { buildOrganization, buildWebSite } from '../components/JsonLd';

// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <MarketingLayout>
      <Meta
        noSuffix
        title={"راوینتا - سیستم عامل بازاریابی هوش مصنوعی برای آژانس‌های مدرن"}
        description={"تحلیل و آمار، محتوا، مکالمات و تبلیغات را برای هر مشتری - در 5 پلتفرم - در یک مکان مدیریت کنید. مجهز به هوش مصنوعی، ساخته شده برای تیم‌های مدرن."}
      />
      <JsonLd id="organization" data={buildOrganization()} />
      <JsonLd id="website"      data={buildWebSite()} />
      <Hero />
      <TrustStrip />
      <ThreePillars />
      <BentoSection />
      <UseCaseTabs />
      <HowItWorks />
      <AIEverywhere />
      <ComparisonSection />
      <MarketplaceTeaser />
      <StatsBand />
      <FinalCTA />
    </MarketingLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — HERO
// ─────────────────────────────────────────────────────────────────────────────
async function Hero() {
  const language = await requestLanguage();
  const t = key => message(key, language);
  return (
    <section style={{
      position: 'relative',
      paddingTop: 'clamp(120px, 18vh, 180px)',
      paddingBottom: 'clamp(80px, 12vh, 120px)',
      overflow: 'hidden',
      isolation: 'isolate',
    }}>
      <MeshGradient variant="hero" />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1180, margin: '0 auto',
        padding: '0 24px',
        textAlign: 'center',
        color: '#fff',
      }}>
        {/* Eyebrow */}
        <MotionDiv initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link to="/changelog" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px',
            fontSize: 12, fontWeight: 600,
            color: '#fff',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 'var(--radius-pill)',
            textDecoration: 'none',
            backdropFilter: 'blur(10px)',
          }}>
            <Sparkles size={12} style={{ color: '#00CCF5' }} />
            <span style={{ color: 'rgba(255,255,255,0.65)' }}>{t('home.new')}</span>
            {t('home.announcement')}
            <ArrowRight size={11} style={{ opacity: 0.6 }} />
          </Link>
        </MotionDiv>

        {/* Headline */}
        <MotionH1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            margin: '24px 0 0',
            fontSize: 'clamp(40px, 7vw, 72px)',
            fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.03em',
            color: '#fff', maxWidth: 900, marginInline: 'auto',
          }}
        >
          {t('home.hero.prefix')}{' '}
          <span style={{
            background: 'linear-gradient(135deg, #00CCF5 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {t('home.hero.product')}
          </span>
          <br />{t('home.hero.audience')}
        </MotionH1>

        {/* Subheading */}
        <MotionP
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          style={{
            margin: '24px auto 0',
            fontSize: 'clamp(16px, 1.8vw, 19px)',
            color: 'rgba(255,255,255,0.72)', lineHeight: 'var(--line-height-body)',
            maxWidth: 640,
          }}
        >
          {t('home.hero.description')}
        </MotionP>

        {/* CTAs */}
        <MotionDiv
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{
            marginTop: 32, display: 'flex', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
          }}
        >
          <TrackedButton to="/signup" size="lg"
                  source="home_hero"
                  style={{
                    background: 'linear-gradient(135deg, #00CCF5, #00A8D8)',
                    color: '#0a0e14', border: 'none', fontWeight: 600,
                  }}>
            شروع رایگان <ArrowRight size={15} />
          </TrackedButton>
          <Button as={Link} to="/customers" size="lg" variant="ghost"
                  style={{
                    color: '#fff',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}>
            <PlayCircle size={15} /> دمو دهه 90 را تماشا کنید
          </Button>
        </MotionDiv>

        <MotionP
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}
        >
          بدون کارت اعتباری · برای همیشه رایگان · راه اندازی در 2 دقیقه
        </MotionP>

        {/* Hero mockup with floating cards */}
        <MotionDiv
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginTop: 64, position: 'relative', maxWidth: 1080, marginInline: 'auto' }}
        >
          <ParallaxTilt max={4}>
            <AnimatedDashboardMockup />
          </ParallaxTilt>

          <div className="mkt-hero-floats">
            <FloatingUICard top="6%"  left="-4%"  delay={0.6} tone="cyan"   width={220}>
              <NotificationCard />
            </FloatingUICard>
            <FloatingUICard top="58%" left="-7%"  delay={0.9} tone="green"  width={220}>
              <LeadCapturedCard />
            </FloatingUICard>
            <FloatingUICard top="14%" right="-4%" delay={0.7} tone="purple" width={230}>
              <CampaignMetricCard />
            </FloatingUICard>
            <FloatingUICard top="62%" right="-6%" delay={1.0} tone="pink"   width={230}>
              <AIPopupCard />
            </FloatingUICard>
          </div>
        </MotionDiv>

        <style>{`
          @media (max-width: 1100px) {
            .mkt-hero-floats { display: none !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

// ── Floating-card contents ──────────────────────────────────────────────────
function NotificationCard() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={floatIconStyle('rgba(0,204,245,0.15)', '#00CCF5')}>
          <Inbox size={11} />
        </span>
        <span style={floatLabel}>پیام جدید · اینستاگرام</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>پریا شارما</div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
        آیا آپارتمان سه‌خوابه هنوز در دسترس است؟ آیا می‌توانم شنبه مراجعه کنم؟
      </div>
    </div>
  );
}

function CampaignMetricCard() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={floatIconStyle('rgba(139,92,246,0.15)', '#a78bfa')}>
          <BarChart3 size={11} />
        </span>
        <span style={floatLabel}>دسترسی هفتگی</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        248,392
      </div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        <TrendingUp size={11} /> +23٪ در مقایسه با هفته گذشته
      </div>
    </div>
  );
}

function LeadCapturedCard() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={floatIconStyle('rgba(16,185,129,0.15)', '#34d399')}>
          <Check size={12} strokeWidth={3} />
        </span>
        <span style={floatLabel}>سرب دستگیر شد</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>راهول ورما</div>
      <div style={{ marginTop: 2, fontSize: 11, color: 'var(--text-secondary)' }}>
        منبع: <strong style={{ color: '#34d399' }}>CTWA · کمپین دیوالی</strong>
      </div>
    </div>
  );
}

function AIPopupCard() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={floatIconStyle('rgba(236,72,153,0.15)', '#f472b6')}>
          <Sparkles size={11} />
        </span>
        <span style={floatLabel}>پیشنهاد هوش مصنوعی</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 'var(--line-height-body)' }}>
        سعی کنید حلقه‌ها را در سه‌شنبه 7 بعدازظهر پست کنید - مخاطبان شما 2.4× فعال‌تر هستند.
      </div>
    </div>
  );
}

const floatLabel = {
  fontSize: 9, fontWeight: 700,
  color: 'var(--text-tertiary)',
  letterSpacing: '0.06em', textTransform: 'uppercase',
};
const floatIconStyle = (bg, color) => ({
  width: 22, height: 22,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: bg, color, borderRadius: 'var(--radius-sm)',
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — PLATFORM STRIP
// Customer-logo carousel intentionally omitted until we have real customers.
// ─────────────────────────────────────────────────────────────────────────────
function TrustStrip() {
  const platforms = ["فیس‌بوک", "اینستاگرام", "یوتیوب", "لینکدین", 'کسب‌وکار گوگل', "کسب و کار واتس‌اپ"];
  return (
    <section style={{
      padding: '40px 24px 32px',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', textAlign: 'center' }}>
        <p style={{
          margin: '0 0 18px',
          fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}>
          یک پلتفرم، هر کانالی که اهمیت دارد
        </p>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '20px 32px',
          justifyContent: 'center', alignItems: 'center',
        }}>
          {platforms.map((label) => (
            <span key={label} style={{
              fontSize: 14, fontWeight: 600,
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
            }}>{label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — THREE PILLARS
// ─────────────────────────────────────────────────────────────────────────────
function ThreePillars() {
  const pillars = [
    { icon: BarChart3, tone: '#00CCF5', toneSoft: 'rgba(0,204,245,0.10)', label: "تحلیل و آمار",
      title: "همه چیز را دنبال کنید",
      blurb: "دسترسی، تعامل و درآمد در 5 پلتفرم در یک داشبورد.",
      preview: <AnalyticsPreview /> },
    { icon: MessageCircle, tone: '#a78bfa', toneSoft: 'rgba(139,92,246,0.10)', label: "درگیر کردن",
      title: "در یک جا پاسخ دهید",
      blurb: "هر پیام خصوصی، نظر، و بررسی در سراسر سیستم عامل - مرتب شده، با اولویت هوش مصنوعی، قابل پاسخ.",
      preview: <InboxPreview /> },
    { icon: Bot, tone: '#34d399', toneSoft: 'rgba(16,185,129,0.10)', label: "تبدیل",
      title: "سرنخ های بیشتری را جذب کنید",
      blurb: "تبلیغات CTWA را با ربات های هوش مصنوعی اجرا کنید که مشتریان را 24/7 واجد شرایط می‌کند و آنها را به سمت CRM خود هدایت می‌کند.",
      preview: <BotBuilderPreview /> },
  ];
  return (
    <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px', background: 'var(--surface-page)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading
            eyebrow={"راوینتا چیست؟"}
            title={"یک محصول، سه ابرقدرت"}
            subtitle={"دستکاری با 5 ابزار مختلف SaaS را متوقف کنید. راوینتا تنها داشبوردی است که بازاریابی مشتری شما را به صورت سرتاسر اجرا می‌کند."}
          />
        </ScrollReveal>

        <div style={{
          marginTop: 48,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
        }} className="mkt-pillars-grid">
          {pillars.map((p, i) => (
            <ScrollReveal key={p.title} delay={0.1 * i}>
              <div style={{
                padding: 24, height: '100%',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', flexDirection: 'column', gap: 18,
              }}>
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36,
                    background: p.toneSoft, color: p.tone,
                    borderRadius: 'var(--radius-md)', marginBottom: 12,
                  }}>
                    <p.icon size={18} strokeWidth={2.2} />
                  </span>
                  <span style={{
                    display: 'block', marginBottom: 4,
                    fontSize: 11, fontWeight: 700, color: p.tone,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>{p.label}</span>
                  <h3 style={{
                    margin: 0, fontSize: 20, fontWeight: 700,
                    color: 'var(--text-primary)', letterSpacing: '-0.01em',
                  }}>{p.title}</h3>
                  <p style={{
                    margin: '8px 0 0',
                    fontSize: 14, lineHeight: 'var(--line-height-body)',
                    color: 'var(--text-secondary)',
                  }}>{p.blurb}</p>
                </div>
                <div style={{ marginTop: 'auto', minHeight: 140 }}>{p.preview}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <style>{`
          @media (max-width: 900px) { .mkt-pillars-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — BENTO GRID
// ─────────────────────────────────────────────────────────────────────────────
function BentoSection() {
  const items = [
    { id: 'ai-assistant', title: "دستیار هوش مصنوعی",
      description: "با داده‌های بازاریابی خود صحبت کنید. Cmd+J در هر جایی.",
      to: '/product/ai-assistant', tone: 'cyan', accentBg: true,
      icon: Sparkles, span: { col: 2, row: 1 },
      preview: <AIAssistantPreview /> },
    { id: 'composer', title: "ویرایشگر محتوا",
      description: "یک بار بنویسید، 5 برابر منتشر کنید.",
      to: '/product/composer', tone: 'purple', icon: PenSquare,
      preview: <ComposerPreview /> },
    { id: 'inbox', title: "صندوق ورودی یکپارچه",
      description: "هر مکالمه در یک مکان.",
      to: '/product/inbox', tone: 'green', icon: Inbox,
      preview: <InboxPreview /> },
    { id: 'bot-builder', title: "سازنده ربات",
      description: "ویرایشگر جریان بصری برای تبلیغات CTWA.",
      to: '/product/bot-builder', tone: 'pink', icon: Bot,
      preview: <BotBuilderPreview /> },
    { id: 'ai-insights', title: "بینش هوش مصنوعی",
      description: "روندهای نقطه ای + افت قبل از اینکه آسیب ببینند.",
      to: '/product/ai', tone: 'amber', icon: TrendingUp,
      preview: <AIInsightPreview /> },
    { id: 'automations', title: "خودکارسازی",
      description: "اگر این اتفاق افتاد، آن را انجام دهید.",
      to: '/product/automations', tone: 'cyan', accentBg: true,
      icon: Zap, span: { col: 2, row: 1 },
      preview: <AutomationsPreview /> },
    { id: 'analytics', title: "تحلیل و آمار",
      description: "معیارهای بین پلتفرمی، ابهام زدایی شده.",
      to: '/product/analytics', tone: 'cyan', icon: BarChart3,
      preview: <AnalyticsPreview /> },
    { id: 'reports', title: "گزارش‌ها",
      description: "گزارش‌هایی که خودشان می‌نویسند.",
      to: '/product/reports', tone: 'purple', icon: BarChart3,
      preview: <ReportsPreview /> },
  ];
  return (
    <section style={{
      padding: 'clamp(64px, 10vh, 120px) 24px',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading
            eyebrow={"هر سطح، جلا"}
            title={"هشت ویژگی که هر تیم را سریعتر می‌کند"}
            subtitle={"هر کاشی را نگه دارید تا حرکت آن را ببینید. برای شیرجه عمیق کلیک کنید."}
          />
        </ScrollReveal>
        <div style={{ marginTop: 48 }}>
          <ScrollReveal>
            <FeatureBento items={items} columns={4} />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — USE CASE TABS
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: 1, title: "ثبت نام رایگان",     blurb: "ایمیل + رمز عبور. جریان 5 ثانیه ای. بدون کارت اعتباری" },
    { n: 2, title: "حساب ها را متصل کنید", blurb: "چسباندن نشانه‌ها یا OAuth - متا + Google + لینکدین پشتیبانی می‌شود." },
    { n: 3, title: "با هوش مصنوعی ایجاد کنید",   blurb: "پست‌ها، پاسخ‌ها و گزارش‌هایی را با لحن برند شما تنظیم کنید." },
    { n: 4, title: "نتایج را پیگیری کنید",    blurb: "تحلیل و آمار بین پلتفرمی + گزارش‌های PDF روایت‌شده با هوش مصنوعی برای مشتریان." },
  ];
  return (
    <section style={{
      padding: 'clamp(64px, 10vh, 120px) 24px',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading eyebrow={"از صفر تا زنده"} title={"در 4 مرحله بلند شوید و بدوید"} />
        </ScrollReveal>

        <div style={{
          marginTop: 48, position: 'relative',
          display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16,
        }} className="mkt-steps-grid">
          <div aria-hidden style={{
            position: 'absolute', top: 26, left: '12.5%', right: '12.5%',
            height: 2, background: 'linear-gradient(90deg, #00CCF5, #8b5cf6)',
            opacity: 0.3, zIndex: 0,
          }} className="mkt-steps-connector" />
          {steps.map((s, i) => (
            <ScrollReveal key={s.n} delay={i * 0.1}>
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, margin: '0 auto 16px',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface-page)',
                  border: '2px solid #00CCF5', borderRadius: '50%',
                  fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                  boxShadow: '0 0 0 6px var(--surface-card), 0 12px 32px rgba(0, 204, 245, 0.18)',
                }}>{s.n}</div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</h3>
                <p style={{
                  margin: '6px 0 0',
                  fontSize: 13, lineHeight: 'var(--line-height-body)',
                  color: 'var(--text-secondary)',
                  maxWidth: 220, marginInline: 'auto',
                }}>{s.blurb}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <style>{`
          @media (max-width: 800px) {
            .mkt-steps-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
            .mkt-steps-connector { display: none !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — AI EVERYWHERE
// ─────────────────────────────────────────────────────────────────────────────
function AIEverywhere() {
  const features = [
    "لحن برند برای کسب و کار شما تنظیم شده است",
    "پست‌ها، پاسخ‌ها و گزارش‌ها را ایجاد می‌کند",
    "بهترین زمان ارسال را پیش بینی می‌کند",
    "بحران های روابط عمومی را قبل از گسترش تشخیص می‌دهد",
    "با تبلیغات محاوره ای سرنخ ها را جذب می‌کند",
  ];
  return (
    <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px', background: 'var(--surface-page)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="mkt-ai-grid">
          <ScrollReveal>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px', marginBottom: 16,
              fontSize: 11, fontWeight: 700,
              color: '#00CCF5', background: 'rgba(0,204,245,0.10)',
              borderRadius: 'var(--radius-pill)', letterSpacing: '0.06em',
            }}>با هوش مصنوعی دولتی اجتماعی</span>
            <h2 style={{
              margin: 0, fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700, letterSpacing: '-0.02em',
              color: 'var(--text-primary)', lineHeight: 1.15,
            }}>هوش مصنوعی در هر گوشه ای</h2>
            <p style={{
              margin: '14px 0 0',
              fontSize: 16, lineHeight: 'var(--line-height-body)',
              color: 'var(--text-secondary)', maxWidth: 480,
            }}>
              راوینتا یک "ویژگی هوش مصنوعی" نیست. این یک محصول بومی هوش مصنوعی است - راوینتا هر جا که گیر کرده اید نشان داده می‌شود.
            </p>
            <ul style={{ margin: '24px 0 0', padding: 0, listStyle: 'none' }}>
              {features.map((f) => (
                <li key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  fontSize: 14, color: 'var(--text-secondary)',
                }}>
                  <Sparkles size={14} style={{ color: '#00CCF5', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24 }}>
              <Button as={Link} to="/product/ai" size="md">
                ویژگی‌های هوش مصنوعی را کاوش کنید <ArrowRight size={14} />
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <AnimatedChat
              userMessage={"وضعیت ما در اینستاگرام این هفته چگونه است؟"}
              assistantReply={"دسترسی شما در مقایسه با هفته گذشته 23٪ افزایش یافته است - بیشتر توسط Reel شما در مورد تور ملک آکمه Heights هدایت می‌شود (3.2× سیوهای معمولی داشت). من پیشنهاد می کنم این هفته 2 حلقه دیگر ارسال کنید. می‌خواهید زیرنویس‌ها را پیش‌نویس کنم؟"}
              speedMs={16}
            />
          </ScrollReveal>
        </div>
        <style>{`
          @media (max-width: 880px) { .mkt-ai-grid { grid-template-columns: 1fr !important; gap: 32px !important; } }
        `}</style>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 8 — COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
function ComparisonSection() {
  const columns = ["راوینتا", 'Hootsuite', "جوانه اجتماعی", "بافر"];
  const rows = [
    { feature: "تحلیل و آمار چند پلتفرم",     cells: ['yes',          'yes',     'yes',     'partial'] },
    { feature: "دستیار عمیق هوش مصنوعی",            cells: ["راوینتا",    'partial', 'partial', 'no'] },
    { feature: 'API واتس‌اپ بیزینس',        cells: ['yes',          'no',      'no',      'no'] },
    { feature: "ربات‌های واتس‌اپ کلیک به‌رو",       cells: ['yes',          'no',      'no',      'no'] },
    { feature: "سازنده ربات بصری",           cells: ['yes',          'no',      'no',      'no'] },
    { feature: "CRM سرب",             cells: ['yes',          'no',      'partial', 'no'] },
    { feature: "بازار نمایندگی دو طرفه", cells: ['yes',          'no',      'no',      'no'] },
    { feature: "دنباله حسابرسی فعالیت",         cells: ['yes',          'partial', 'yes',     'no'] },
    { feature: "رایگان برای کاربران نهایی",           cells: ['yes',          'no',      'no',      'partial'] },
    { feature: "پرداخت هندی + GST",         cells: ['yes',          'no',      'no',      'no'] },
  ];
  return (
    <section style={{
      padding: 'clamp(64px, 10vh, 120px) 24px',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-subtle)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading
            eyebrow={"مقایسه صادقانه"}
            title={"چگونه راوینتا پشته"}
            subtitle={"ما برای همه نیستیم. ما برای آژانس‌ها + مشاغل جدی در مورد AI + واتس‌اپ ساخته شده ایم."}
          />
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div style={{ marginTop: 36 }}>
            <ComparisonTable columns={columns} rows={rows} highlightIndex={0} />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 11 — MARKETPLACE TEASER
// ─────────────────────────────────────────────────────────────────────────────
function MarketplaceTeaser() {
  // Explainer cards for the two-sided marketplace.
  // We don't list specific agencies until we've onboarded them and they've
  // opted into being featured.
  const steps = [
    { title: "آژانس‌های تایید شده را مرور کنید",  body: "جستجو بر اساس صنعت، زبان، بودجه، و پلتفرم." },
    { title: "مطابقت با مناسب",              body: "محدوده‌های قیمت‌گذاری، تخصص‌ها، و نمونه گردش کار را از قبل مشاهده کنید." },
    { title: "از یک صندوق ورودی مدیریت کنید",     body: "تأییدیه‌ها، پست‌های زمان‌بندی‌شده، و گزارش‌دهی از طریق راوینتا جریان دارند." },
  ];
  return (
    <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px', background: 'var(--surface-page)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading
            eyebrow={"بازار داخلی"}
            title={"آیا به آژانسی برای کمک نیاز دارید؟"}
            subtitle={"یک بازار دو طرفه که در آن آژانس‌های تأیید شده با مشاغل بر اساس صنعت و بودجه مطابقت دارند. اکنون در حال ورود به اولین گروه از آژانس‌ها."}
            cta={{ to: '/agencies', label: "بازار را مرور کنید" }}
          />
        </ScrollReveal>

        <div style={{
          marginTop: 36,
          display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14,
        }} className="mkt-marketplace-grid">
          {steps.map((s, i) => (
            <ScrollReveal key={s.title} delay={i * 0.07}>
              <div style={{
                height: '100%',
                padding: 22,
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 'var(--radius-pill)',
                  background: 'var(--brand-primary-soft)',
                  color: 'var(--brand-primary-hover)',
                  fontSize: 13, fontWeight: 700,
                }}>{i + 1}</div>
                <h3 style={{
                  margin: '14px 0 6px',
                  fontSize: 16, fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                }}>{s.title}</h3>
                <p style={{
                  margin: 0, fontSize: 13, lineHeight: 'var(--line-height-body)',
                  color: 'var(--text-secondary)',
                }}>{s.body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <style>{`
          @media (max-width: 1024px) { .mkt-marketplace-grid { grid-template-columns: 1fr 1fr !important; } }
          @media (max-width: 600px)  { .mkt-marketplace-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 12 — STATS BAND
// ─────────────────────────────────────────────────────────────────────────────
function StatsBand() {
  // Capability stats — every claim below is a feature of the product, not
  // a customer-volume metric. We swap to real usage numbers once they're
  // real and verifiable.
  const stats = [
    { value: 5,    suffix: '',   label: "سکوها" },
    { value: 14,   suffix: '+',  label: "زبان پشتیبانی می‌شود" },
    { value: 2,    suffix: 'دقیقه',label: "زمان برای اولین پست" },
    { value: 99.9, suffix: '%',  label: "هدف زمان کار", decimals: 1 },
  ];
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{
        padding: 'clamp(48px, 8vh, 88px) 24px',
        background: 'linear-gradient(135deg, #00CCF5 0%, #00A8D8 50%, #8b5cf6 100%)',
        color: '#fff',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 24, textAlign: 'center',
          }} className="mkt-stats-grid">
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{
                  fontSize: 'clamp(28px, 5vw, 48px)',
                  fontWeight: 700, letterSpacing: '-0.02em',
                  lineHeight: 1.05, color: '#fff',
                }}>
                  <MetricCounter value={s.value} suffix={s.suffix}
                                 decimals={s.decimals || 0} duration={1.6} />
                </div>
                <div style={{
                  marginTop: 8, fontSize: 13, fontWeight: 600,
                  color: 'rgba(255,255,255,0.78)',
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 720px) {
            .mkt-stats-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 14 — FINAL CTA
// ─────────────────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px', background: 'var(--surface-page)' }}>
      <CTASection
        title={"برای ارتقاء بازاریابی خود آماده اید؟"}
        subtitle={"شروع رایگان در 2 دقیقه - بدون نیاز به کارت اعتباری."}
        primary={{ to: '/signup', label: "شروع رایگان" }}
        showEmail
        microCopy={"بدون نیاز به کارت بانکی · همیشه رایگان · راه‌اندازی در ۲ دقیقه"}
        variant="cta"
      />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable section heading
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeading({ eyebrow, title, subtitle, cta }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 720, marginInline: 'auto' }}>
      {eyebrow && (
        <span style={{
          display: 'inline-block',
          padding: '4px 12px', marginBottom: 14,
          fontSize: 11, fontWeight: 700,
          color: 'var(--brand-primary-hover)',
          background: 'var(--brand-primary-soft)',
          borderRadius: 'var(--radius-pill)',
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>{eyebrow}</span>
      )}
      <h2 style={{
        margin: 0,
        fontSize: 'clamp(28px, 4vw, 44px)',
        fontWeight: 700, color: 'var(--text-primary)',
        letterSpacing: '-0.02em', lineHeight: 1.15,
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          margin: '14px auto 0',
          fontSize: 'clamp(15px, 1.5vw, 17px)',
          lineHeight: 'var(--line-height-body)',
          color: 'var(--text-secondary)', maxWidth: 600,
        }}>{subtitle}</p>
      )}
      {cta && (
        <div style={{ marginTop: 16 }}>
          <Button as={Link} to={cta.to} size="md" variant="ghost"
                  style={{ color: 'var(--brand-primary-hover)', padding: 0 }}>
            {cta.label} <ArrowRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
