/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Link from '../components/marketing/MarketingLink';
import {
  ArrowRight,
  Building2,
  Stethoscope,
  ShoppingBag,
  Utensils,
  Users,
  Sparkles,
  MessageCircle,
  PenSquare,
  TrendingUp,
} from 'lucide-react';

import MarketingLayout from '../components/marketing/MarketingLayout';
import MeshGradient from '../components/marketing/MeshGradient';
import ScrollReveal from '../components/marketing/ScrollReveal';
import Button from '../components/marketing/MarketingButton';
import Meta from '../components/Meta';

/**
 * CustomersPage — /customers
 *
 * We don't have customer testimonials, named case studies, or customer logos
 * to feature yet. This page intentionally leads with the workflows the
 * product is built for, not who's already using it. Real customer stories
 * will replace the example workflows as we onboard the first cohort of
 * launch partners.
 *
 * Sections:
 *   1. Hero — "Customer stories — coming soon" + "Become a launch partner" CTA
 *   2. Example workflows — industry-only descriptions of how Social Stats is
 *      designed to be used. Clearly labeled as example workflows, not real
 *      customer stories.
 *   3. CTA to sign up or talk to sales.
 */

const EXAMPLE_WORKFLOWS = [
  {
    industry: "املاک و مستغلات",
    icon: Building2,
    accent: '#00CCF5',
    headline: "از طریق واتس‌اپ، سرنخ های دارایی را جذب و واجد شرایط کنید",
    body: "تبلیغات کلیکی به واتس‌اپ را اجرا کنید، درخواست‌ها را از طریق رباتی که بودجه و محل را می‌خواهد هدایت کنید، سپس سرنخ‌های واجد شرایط را به سمت CRM خود هدایت کنید. حلقه‌های دارایی و پست‌های اینستاگرام را از همان ویرایشگر محتوا زمان‌بندی کنید.",
    bullets: [
      "کمپین‌های CTWA با فرم های سرب بومی پلتفرم",
      "سازنده ربات بصری برای جریان‌های صلاحیت",
      "شرح‌های هوش مصنوعی با لحن برند در هر فهرست",
    ],
  },
  {
    industry: "سلامت و درمان",
    icon: Stethoscope,
    accent: '#8b5cf6',
    headline: "با یادآوری واتس‌اپ + صندوق ورودی یکپارچه، موارد بدون نمایش را قطع کنید",
    body: "یادآوری‌های قرار را 24 ساعت و 2 ساعت قبل از اسلات از طریق قالب‌های واتس‌اپ ارسال کنید. زمان‌بندی مجدد درخواست‌ها در همان صندوق ورودی پیام‌های پیامکی اینستاگرام و بررسی‌های Google قرار می‌گیرند - تیم شما از یک صف کار می‌کند.",
    bullets: [
      "کمپین‌های قالب واتس‌اپ تایید شده است",
      "صندوق ورودی یکپارچه در پیام خصوصی ها، نظرات، نظرات",
      "فضاهای کاری هر کلینیک با لحن برند مشترک",
    ],
  },
  {
    industry: "آژانس‌ها",
    icon: Users,
    accent: '#f472b6',
    headline: "بسیاری از مشتریان را بدون از دست دادن موضوع مدیریت کنید",
    body: "یک آژانس کوچک می‌تواند بسیاری از فضاهای کاری مشتری را از یک مستاجر راوینتا مدیریت کند. جریان‌های تایید، گزارش‌های برند اختصاصی، و لحن برند هر مشتری به معنای مقیاس های کار بدون افزایش تعداد کار متناسب است.",
    bullets: [
      "فضای کاری برای هر مشتری + لحن برند",
      "جریان‌های تایید برای پست‌ها و پاسخ ها",
      "گزارش‌های برند اختصاصی بر اساس یک برنامه",
    ],
  },
  {
    industry: "رستوران‌ها",
    icon: Utensils,
    accent: '#f59e0b',
    headline: "ربات‌های CTWA که سفارش‌ها و رزروها را دریافت می‌کنند",
    body: "تبلیغات Click-to-واتس‌اپ را اجرا کنید که کاربر را برای منو، مکان و رزرو به ربات می‌اندازد. سفارشات تایید شده را از طریق webhook به POS خود هدایت کنید. اینستاگرام و کسب‌وکار گوگل را با تخفیف های روزانه از یک ویرایشگر محتوا به روز کنید.",
    bullets: [
      "منو + ربات‌های رزرو خارج از جعبه",
      "پست‌های کسب و کار Google به صورت خودکار همگام‌سازی می‌شوند",
      "فضاهای کاری در هر مکان",
    ],
  },
  {
    industry: "تجارت الکترونیکی",
    icon: ShoppingBag,
    accent: '#10b981',
    headline: "تبلیغات کاتالوگ + پرداخت واتس‌اپ",
    body: "محصولات را از Shopify یا Woo به ویرایشگر محتوا بکشید. تبلیغات چرخ و فلک را در اینستاگرام و فیس‌بوک با پیوندهای عمیق در پرداخت کاتالوگ واتس‌اپ اجرا کنید. به پیام‌های ورودی با پاسخ‌های پیشنهادی هوش مصنوعی با لحن برند خود پاسخ دهید.",
    bullets: [
      "خوراک محصول Shopify + Woo",
      "کاتالوگ واتس‌اپ + تسویه حساب",
      "پیشنهادات پاسخ هوش مصنوعی در لحن برند",
    ],
  },
  {
    industry: "تولیدکنندگان محتوا",
    icon: Sparkles,
    accent: '#a78bfa',
    headline: "برنامه‌ریزی، تولید، و ارسال محتوا در سراسر سیستم عامل",
    body: "آموزش راوینتا در پنج پست با صدای خود. انواع کپشن برای توضیحات اینستاگرام، فیسبوک، لینکدین و یوتیوب از یک اعلان ایجاد کنید. یک بار برنامه‌ریزی کنید؛ فرمت های ویرایشگر محتوا در هر پلتفرم",
    bullets: [
      "یک ویرایشگر محتوا، خروجی پنج پلتفرم",
      "آموزش لحن برند در 3 دقیقه",
      "خلاصه ماهانه روایت شده توسط هوش مصنوعی",
    ],
  },
];

export default function CustomersPage() {
  return (
    <MarketingLayout>
      <Meta
        title={"داستان های مشتری"}
        description={"داستان‌های مشتریان در اینجا با راه‌اندازی عمومی راوینتا ظاهر می‌شوند. در عین حال، در اینجا نحوه ساخت محصول برای استفاده توسط صنعت آمده است."}
      />

      {/* ╭───────────╮
          │  1. HERO  │
          ╰───────────╯ */}
      <section style={{
        position: 'relative',
        padding: '120px 24px 80px',
        overflow: 'hidden',
      }}>
        <MeshGradient variant="hero" />

        <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', textAlign: 'center' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 12px', marginBottom: 18,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            color: '#fff',
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 'var(--radius-pill)',
            textTransform: 'uppercase',
          }}>به‌زودی</span>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 700, letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: '#fff',
          }}>
            داستان های مشتری - به زودی
          </h1>

          <p style={{
            margin: '20px auto 0', maxWidth: 620,
            fontSize: 'clamp(15px, 1.6vw, 17px)',
            lineHeight: 'var(--line-height-body)',
            color: 'rgba(255,255,255,0.78)',
          }}>
            ما در حال انتشار راوینتا برای اولین گروه از شرکای راه اندازی هستیم. با انتشار عمومی آن شرکا، داستان‌های واقعی مشتریان، با تیم‌های نام‌گذاری شده و اعداد واقعی، در اینجا ظاهر می‌شوند. تا آن زمان، در اینجا نحوه ساخت محصول برای استفاده آمده است.
          </p>

          <div style={{
            marginTop: 32, display: 'inline-flex', gap: 12, flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <Button as={Link} to="/signup" size="lg"
                    style={{
                      background: 'linear-gradient(135deg, #00CCF5, #00A8D8)',
                      color: '#0a0e14',
                      border: 'none',
                    }}>
              شریک راه اندازی شوید <ArrowRight size={15} />
            </Button>
            <Button as={Link} to="/contact" size="lg" variant="ghost"
                    style={{
                      color: '#fff',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                    }}>
              با تیم صحبت کنید
            </Button>
          </div>
        </div>
      </section>

      {/* ╭──────────────────────────╮
          │  2.  EXAMPLE WORKFLOWS   │
          ╰──────────────────────────╯ */}
      <section style={{
        padding: 'clamp(64px, 10vh, 120px) 24px',
        background: 'var(--surface-page)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <ScrollReveal>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{
                display: 'inline-block',
                padding: '3px 10px', marginBottom: 14,
                fontSize: 11, fontWeight: 700,
                color: 'var(--brand-primary-hover)',
                background: 'var(--brand-primary-soft)',
                borderRadius: 'var(--radius-pill)',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>نمونه گردش کار · گویا</span>
              <h2 style={{
                margin: 0, fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 700, letterSpacing: '-0.02em',
                color: 'var(--text-primary)', lineHeight: 1.15,
              }}>چگونه راوینتا برای استفاده ساخته شده است</h2>
              <p style={{
                margin: '14px auto 0', maxWidth: 620,
                fontSize: 16, lineHeight: 'var(--line-height-body)',
                color: 'var(--text-secondary)',
              }}>
                اینها نمونه گردش کار هستند، نه داستانهای واقعی مشتری. هر کدام یک راه‌اندازی معمولی برای آن صنعت را توصیف می‌کنند - کانال‌ها، ویژگی‌های هوش مصنوعی، و جریان‌های تأیید مناسب.
              </p>
            </div>
          </ScrollReveal>

          <div style={{
            display: 'grid', gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}>
            {EXAMPLE_WORKFLOWS.map((w, i) => {
              const Icon = w.icon;
              return (
                <ScrollReveal key={w.industry} delay={i * 0.05}>
                  <article style={{
                    height: '100%',
                    padding: 24,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex', flexDirection: 'column', gap: 14,
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 40, height: 40, borderRadius: 'var(--radius-md)',
                      background: `${w.accent}1A`,
                      color: w.accent,
                    }}>
                      <Icon size={20} strokeWidth={2} />
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                                  textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                      {w.industry}
                    </div>

                    <h3 style={{
                      margin: 0, fontSize: 17, fontWeight: 700,
                      color: 'var(--text-primary)', lineHeight: 'var(--line-height-body)',
                      letterSpacing: '-0.01em',
                    }}>{w.headline}</h3>

                    <p style={{
                      margin: 0, fontSize: 13, lineHeight: 'var(--line-height-body)',
                      color: 'var(--text-secondary)',
                    }}>{w.body}</p>

                    <ul style={{
                      margin: 'auto 0 0', padding: 0, listStyle: 'none',
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      {w.bullets.map((b) => (
                        <li key={b} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          fontSize: 12, color: 'var(--text-secondary)',
                        }}>
                          <span style={{
                            marginTop: 6,
                            width: 4, height: 4, borderRadius: 999,
                            flexShrink: 0,
                            background: w.accent,
                          }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ╭──────────────╮
          │  3. CTA      │
          ╰──────────────╯ */}
      <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px' }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          padding: '48px 32px',
          background: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '6px 12px', marginBottom: 16,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
            color: 'var(--brand-primary-hover)',
            background: 'var(--brand-primary-soft)',
            borderRadius: 'var(--radius-pill)', textTransform: 'uppercase',
          }}>
            <Sparkles size={12} /> راه اندازی برنامه شریک
گیره
          </div>
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(24px, 3.6vw, 32px)',
            fontWeight: 700, letterSpacing: '-0.02em',
            color: 'var(--text-primary)', lineHeight: 'var(--line-height-body)',
          }}>
            اولین داستان مشتری در این صفحه باشید
          </h2>
          <p style={{
            margin: '14px auto 0', maxWidth: 520,
            fontSize: 15, lineHeight: 'var(--line-height-body)',
            color: 'var(--text-secondary)',
          }}>
            تیم‌های شریک راه‌اندازی زمانی که آماده به اشتراک گذاشتن شماره‌هایشان هستند، به صورت عملی، یک خط مستقیم به تیم، و یک نقطه ویژگی در اینجا دریافت می‌کنند.
          </p>
          <div style={{
            marginTop: 28, display: 'inline-flex', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Button as={Link} to="/signup" size="lg" variant="primary">
              شروع رایگان <ArrowRight size={15} />
            </Button>
            <Button as={Link} to="/contact" size="lg" variant="ghost">
              با تیم صحبت کنید
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
