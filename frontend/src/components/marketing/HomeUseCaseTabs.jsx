'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, Stethoscope, UtensilsCrossed, Palette, Check, ArrowRight } from 'lucide-react';
import Link from './MarketingLink';
import Button from '../ui/Button';
import ScrollReveal from './ScrollReveal';
import AnimatedDashboardMockup from './AnimatedDashboardMockup';
export default function UseCaseTabs() {
  const tabs = [
    { id: 'agencies', label: "آژانس‌ها", icon: Briefcase,
      headline: "بیش از 100 مشتری را بدون از دست دادن ذهن خود مدیریت کنید.",
      bullets: [
        "فضاهای کاری چند مشتری با تعویض کننده یک کلیک",
        "همکاری تیمی با مجوزهای نقش",
        "پورتال های مشتری برند اختصاصی + گزارش‌های مارک دار",
        "گردش کار تایید برای هر اقدام",
        "دستیار هوش مصنوعی برای لحن برند هر مشتری تنظیم شده است",
      ],
      cta: { label: "مطالعه موردی آژانس را بخوانید", to: '/customers' } },
    { id: 'real-estate', label: "املاک", icon: Building2,
      headline: "فروش املاک بیشتر در شبکه‌های اجتماعی.",
      bullets: [
        "چرخ فلک های فهرست املاک برای اینستاگرام + فیس‌بوک",
        "یادآوری بازدید از سایت از طریق واتس‌اپ",
        "جذب سرنخ از تبلیغات CTWA - مستقیماً به CRM",
        "توضیحات دارایی نوشته شده توسط هوش مصنوعی",
        "اتوماسیون تبلیغاتی در فضای باز",
      ],
      cta: { label: "کتاب بازی املاک و مستغلات", to: '/solutions/real-estate' } },
    { id: 'clinics', label: "سلامت و درمان", icon: Stethoscope,
      headline: "بیماران را در هر پلتفرمی درگیر کنید.",
      bullets: [
        "یادآوری قرار از طریق واتس‌اپ بیزینس",
        "تحویل گزارش آزمایشگاهی با دنباله حسابرسی سرتاسر",
        "تقویم محتوای آگاهی سلامت از پیش ساخته شده است",
        "جستجوگر محتوای تراز شده با HIPAA",
        "مدیریت را با پاسخ‌های پیشنهادی هوش مصنوعی بررسی کنید",
      ],
      cta: { label: "کتاب بازی مراقبت های بهداشتی", to: '/solutions/clinics' } },
    { id: 'restaurants', label: "رستوران‌ها", icon: UtensilsCrossed,
      headline: "جداول بیشتری را با اجتماعی پر کنید.",
      bullets: [
        "ربات‌های رزرو که با POS شما ادغام می‌شوند",
        "پست روزانه ویژه در خلبان خودکار",
        "مدیریت بررسی برای Zomato + Google",
        "گسترش نفوذ + ردیابی",
        "کمپین‌های جشنواره (دیوالی، عید، کریسمس) آماده راه اندازی است",
      ],
      cta: { label: "کتاب بازی رستوران", to: '/solutions/restaurants' } },
    { id: 'creators', label: "تولیدکنندگان محتوا", icon: Palette,
      headline: "اقتصاد سازنده خود را دنبال کنید.",
      bullets: [
        "تحلیل و آمار یوتیوب + اینستاگرام + لینکدین در یک نمایش",
        "ردیابی معاملات تجاری + صورتحساب",
        "بینش مخاطب - آنچه طرفداران شما واقعاً می‌خواهند",
        "ارسال بهینه سازی با پیش بینی های هوش مصنوعی",
        "تقویم محتوا مطابق با برنامه شما تنظیم شده است",
      ],
      cta: { label: "کتاب بازی سازندگان", to: '/solutions/creators' } },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px', background: 'var(--surface-page)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading eyebrow={"ساخته شده برای هر نوع بازاریاب"} title={"هر کسی که هستید، راوینتا مناسب است"} />
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div role="tablist" style={{
            marginTop: 36, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {tabs.map((t) => (
              <button
                key={t.id} role="tab" aria-selected={active === t.id}
                onClick={() => setActive(t.id)}
                style={{
                  padding: '10px 16px',
                  fontSize: 13, fontWeight: 600,
                  color: active === t.id ? '#0a0e14' : 'var(--text-secondary)',
                  background: active === t.id
                    ? 'linear-gradient(135deg, #00CCF5, #00A8D8)' : 'var(--surface-card)',
                  border: '1px solid',
                  borderColor: active === t.id ? 'transparent' : 'var(--border-default)',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit', transition: 'var(--transition-fast)',
                }}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              marginTop: 32, padding: 32,
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36,
              alignItems: 'center',
            }}
            className="mkt-usecase-grid"
          >
            <div>
              <h3 style={{
                margin: 0, fontSize: 24, fontWeight: 700,
                color: 'var(--text-primary)', letterSpacing: '-0.01em', lineHeight: 1.25,
              }}>{current.headline}</h3>
              <ul style={{ margin: '20px 0 0', padding: 0, listStyle: 'none' }}>
                {current.bullets.map((b) => (
                  <li key={b} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 0',
                    fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.55,
                  }}>
                    <Check size={14} style={{ color: '#00CCF5', flexShrink: 0, marginTop: 4 }} strokeWidth={2.5} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 20 }}>
                <Button as={Link} to={current.cta.to} size="md" variant="ghost"
                        style={{ color: 'var(--brand-primary-hover)', padding: 0 }}>
                  {current.cta.label} <ArrowRight size={14} />
                </Button>
              </div>
            </div>

            <div style={{
              minHeight: 280, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
            }}>
              <AnimatedDashboardMockup />
            </div>
          </motion.div>
          <style>{`
            @media (max-width: 880px) { .mkt-usecase-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </ScrollReveal>
      </div>
    </section>
  );
}
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
          lineHeight: 1.6,
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