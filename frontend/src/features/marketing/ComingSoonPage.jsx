/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { AppLink as Link, useAppLocation as useLocation } from '../../core/navigation';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import MarketingLayout from '../../components/marketing/MarketingLayout';
import MeshGradient from '../../components/marketing/MeshGradient';
import Button from '../../components/ui/Button';
import Meta from '../../components/Meta';

/**
 * ComingSoonPage — placeholder for /product/* and /solutions/* routes
 * that get their full content in + 4 of the marketing build.
 *
 * Each route gets its own pretty placeholder so visitors who land via the
 * mega-menu don't see "404" — they see a polite "this page is shipping
 * shortly" with the right title pulled from the URL + a CTA back to the
 * surfaces that ARE complete.
 */

const TITLES = {
  // /product/*
  '/product/analytics':           { kind: 'product', title: "تحلیل و آمار",     blurb: "معیارهای کراس پلتفرم در یک داشبورد." },
  '/product/composer':            { kind: 'product', title: "ویرایشگر محتوا",      blurb: "یک بار بنویسید، در هر پلتفرمی منتشر کنید." },
  '/product/inbox':               { kind: 'product', title: "صندوق ورودی یکپارچه", blurb: "هر مکالمه در یک مکان." },
  '/product/whatsapp':            { kind: 'product', title: "کسب و کار واتس‌اپ", blurb: "کمپین ها + چت دو طرفه در مقیاس." },
  '/product/bot-builder':         { kind: 'product', title: "سازنده ربات تبلیغات کلیک به واتس‌اپ", blurb: "ویرایشگر جریان بصری برای قیف های تبلیغاتی." },
  '/product/ai':                  { kind: 'product', title: "استودیوی هوش مصنوعی",     blurb: "راوینتا در هر گوشه." },
  '/product/ai-assistant':        { kind: 'product', title: "دستیار هوش مصنوعی",  blurb: "Cmd+J - با داده‌های بازاریابی خود صحبت کنید." },
  '/product/reports':             { kind: 'product', title: "گزارش‌ها",       blurb: "گزارش‌هایی که خودشان می‌نویسند." },
  '/product/automations':         { kind: 'product', title: "خودکارسازی",   blurb: "اگر این اتفاق افتاد، آن را انجام دهید." },
  '/product/marketplace-product': { kind: 'product', title: "بازار خدمات",   blurb: "بازار آژانس-مشتری دو طرفه." },

  // /solutions/*
  '/solutions/agencies':    { kind: 'solution', title: "برای آژانس‌ها",   blurb: "بیش از 100 مشتری را بدون از دست دادن ذهن خود مدیریت کنید." },
  '/solutions/businesses':  { kind: 'solution', title: "برای کسب‌وکارها", blurb: "کنترل شبکه‌های اجتماعی خود را در دست بگیرید." },
  '/solutions/creators':    { kind: 'solution', title: "برای تولیدکنندگان محتوا",   blurb: "اقتصاد سازنده خود را دنبال کنید." },
  '/solutions/real-estate': { kind: 'solution', title: "املاک",    blurb: "فروش املاک بیشتر در شبکه‌های اجتماعی." },
  '/solutions/clinics':     { kind: 'solution', title: "سلامت و درمان",     blurb: "بیماران را در هر پلتفرمی درگیر کنید." },
  '/solutions/restaurants': { kind: 'solution', title: "رستوران‌ها",    blurb: "جداول بیشتری را با اجتماعی پر کنید." },
  '/solutions/ecommerce':   { kind: 'solution', title: "تجارت الکترونیکی",     blurb: "فروش را از شبکه‌های اجتماعی هدایت کنید." },
  '/solutions/education':   { kind: 'solution', title: "آموزش",      blurb: "به دانش آموزان بیشتری به صورت آنلاین دسترسی پیدا کنید." },
};


export default function ComingSoonPage() {
  const { pathname } = useLocation();
  const meta = TITLES[pathname] || { kind: 'product', title: "به‌زودی", blurb: "این صفحه به زودی ارسال می‌شود." };

  return (
    <MarketingLayout>
      <Meta
        title={`${meta.title} - به زودی`}
        description={meta.blurb}
      />
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <MeshGradient variant="hero" />
        <div style={{ position: 'relative', maxWidth: 640 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', marginBottom: 24,
            fontSize: 12, fontWeight: 600,
            color: '#00CCF5',
            background: 'rgba(0,204,245,0.10)',
            border: '1px solid rgba(0,204,245,0.25)',
            borderRadius: 'var(--radius-pill)',
          }}>
            <Sparkles size={12} />
            {meta.kind === 'solution' ? "صفحه راه حل" : "صفحه محصول"} - به زودی ارسال می‌شود
          </span>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#fff',
            lineHeight: 1.1,
          }}>
            {meta.title}
          </h1>

          <p style={{
            margin: '20px auto 0',
            fontSize: 'clamp(16px, 1.8vw, 19px)',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 'var(--line-height-body)',
            maxWidth: 540,
          }}>
            {meta.blurb}
          </p>

          <p style={{
            margin: '24px auto 0',
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            maxWidth: 540, lineHeight: 'var(--line-height-body)',
          }}>
            ما در حال ساخت این صفحه هستیم. در عین حال، برای یک حساب کاربری رایگان ثبت نام کنید و محصول زنده را کاوش کنید - همه ویژگی‌های موجود در منو در حال ارسال هستند.
          </p>

          <div style={{
            marginTop: 32,
            display: 'flex', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Button as={Link} to="/signup" size="lg"
                    style={{
                      background: 'linear-gradient(135deg, #00CCF5, #00A8D8)',
                      color: '#0a0e14', border: 'none',
                    }}>
              شروع رایگان <ArrowRight size={15} />
            </Button>
            <Button as={Link} to="/" size="lg" variant="ghost"
                    style={{
                      color: '#fff',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.18)',
                    }}>
              <ArrowLeft size={15} /> بازگشت به صفحه اصلی
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
