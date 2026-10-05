'use client';
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
  Mail, MessageSquare, Phone, MapPin, ArrowRight,
  BookOpen, Activity, ShieldCheck,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Meta from '../components/Meta';

const REPOSITORY_URL = 'https://github.com/jaavid/social-media-manager';

export default function ContactPage() {
  return (
    <>
      <Meta
        title={"تماس با ما"}
        description={"برای گزارش خطا و پیشنهاد امکانات با تیم راوینتا در گیت‌هاب در تماس باشید."}
      />
      {/* Hero */}
      <section style={{ padding: '128px 32px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: 'var(--brand-mesh)',
            opacity: 0.30, filter: 'blur(80px) saturate(140%)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <Badge variant="brand" size="md">تماس با ما</Badge>
          <h1 style={{
            margin: '20px 0 18px',
            fontSize: 'clamp(40px, 5vw, 56px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            بیایید صحبت کنیم.
          </h1>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
            برای گزارش خطا و پیشنهاد امکانات، در مخزن پروژه یک مسئله ثبت کنید.
          </p>
        </div>
      </section>

      {/* Form + info */}
      <section style={{ padding: '32px 32px 96px' }}>
        <div
          style={{
            maxWidth: 'var(--container-xl)',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)',
            gap: 32,
            alignItems: 'flex-start',
          }}
          className="contact-grid"
        >
          {/* Form */}
          <div
            style={{
              padding: 32,
              background: 'var(--surface-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
              ارتباط با نگهدارندگان پروژه
            </h2>
            <p style={{ margin: '12px 0', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
              دریافت پیام از این صفحه هنوز فعال نیست. برای گزارش خطا یا پیشنهاد امکانات، از گیت‌هاب استفاده کنید.
            </p>
            <p style={{ margin: '12px 0 22px', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
              مسئله‌های گیت‌هاب عمومی هستند؛ اطلاعات خصوصی، رمز عبور یا توکن ارسال نکنید. برای ثبت مسئله به حساب گیت‌هاب نیاز دارید.
            </p>
            <Button as="a" href={`${REPOSITORY_URL}/issues/new/choose`} target="_blank" rel="noopener noreferrer" icon={ArrowRight} style={{ color: 'var(--text-on-brand)' }}>
              ثبت مسئله در گیت‌هاب
            </Button>
          </div>

          {/* Info side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ContactInfoCard
              icon={Mail}
              title={"مشکلات گیت‌هاب"}
              body={"گزارش خطا و پیشنهاد امکانات"}
              detail={"سریع‌ترین راه ارتباط با تیم نگهداری محصول."}
              link={`${REPOSITORY_URL}/issues`}
            />
            <ContactInfoCard
              icon={MessageSquare}
              title={"مخزن"}
              body={"کد منبع و مستندات"}
              detail={"راهنمای میزبانی، تنظیمات و نسخه‌های منتشرشده."}
              link={REPOSITORY_URL}
            />
            <ContactInfoCard
              icon={Phone}
              title={"پشتیبانی"}
              body={"پشتیبانی در گیت‌هاب"}
              detail={"یک مسئله ثبت کنید؛ در مخزن پروژه پاسخ می‌دهیم."}
              link={`${REPOSITORY_URL}/issues`}
            />
            <ContactInfoCard
              icon={MapPin}
              title={"دفتر"}
              body={"بنگلور، هند"}
              detail={"پروژه متن‌باز است و دفتر حضوری ندارد."}
            />
          </div>
        </div>

        <style>{`
          @media (max-width: 980px) { .contact-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </section>

      {/* Support links */}
      <section style={{ padding: '64px 32px', background: 'var(--surface-card)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              به دنبال چیزی خاص هستید؟
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 16,
            }}
            className="contact-support-grid"
          >
            <SupportLinkCard
              icon={BookOpen}
              title={"مرکز راهنما"}
              body={"راهنمای راه‌اندازی، رفع مشکل و پرسش‌های متداول."}
              to="/help"
            />
            <SupportLinkCard
              icon={Activity}
              title={"وضعیت سیستم"}
              body={"دسترس‌پذیری زنده، رخدادها و نگهداری برنامه‌ریزی‌شده."}
              to="/status"
            />
            <SupportLinkCard
              icon={ShieldCheck}
              title={"امنیت"}
              body={"الزامات، گواهی‌ها و گزارش آسیب‌پذیری."}
              to="/security"
            />
          </div>
          <style>{`
            @media (max-width: 880px) { .contact-support-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </section>
    </>
  );
}

function ContactInfoCard({ icon: Icon, title, body, detail, link }) {
  const Wrapper = link ? 'a' : 'div';
  return (
    <Wrapper
      href={link}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: 18,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xs)',
        textDecoration: 'none',
        transition: 'var(--transition-fast)',
        cursor: link ? 'pointer' : 'default',
      }}
      onMouseEnter={link ? (e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } : undefined}
      onMouseLeave={link ? (e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; } : undefined}
    >
      <span style={{
        display: 'inline-flex',
        width: 36, height: 36, borderRadius: 'var(--radius-md)',
        background: 'var(--brand-primary-soft)',
        color: 'var(--brand-primary-hover)',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {title}
        </div>
        <div style={{ marginTop: 2, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          {body}
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
          {detail}
        </div>
      </div>
    </Wrapper>
  );
}

function SupportLinkCard({ icon: Icon, title, body, to }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: 24,
        background: 'var(--surface-page)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        textDecoration: 'none',
        transition: 'var(--transition-fast)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <span style={{
        display: 'inline-flex',
        width: 36, height: 36,
        borderRadius: 'var(--radius-md)',
        background: 'var(--brand-primary-soft)',
        color: 'var(--brand-primary-hover)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
        {body}
      </p>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-link)' }}>
        باز کردن <ArrowRight size={12} />
      </span>
    </Link>
  );
}
