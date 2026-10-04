'use client';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useMemo, useState } from 'react';
import Link from '../components/marketing/MarketingLink';
import {
  Search, Rocket, Plug, PenSquare, Inbox, CreditCard, Wrench, Shield, BookOpen, ArrowRight, MessageCircle,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Meta from '../components/Meta';

const CATEGORIES = [
  { id: 'getting-started', icon: Rocket,    color: '#00CCF5', title: "شروع به کار",     count: 12, body: "ثبت نام، راه اندازی فضای کاری، دعوت از تیم شما." },
  { id: 'connections',     icon: Plug,      color: '#10b981', title: "اتصالات",         count: 18, body: "OAuth، نشانه های دستی، عیب یابی اتصال مجدد." },
  { id: 'composer',        icon: PenSquare, color: '#8b5cf6', title: "ویرایشگر محتوا",            count: 14, body: "تالیف، زمان‌بندی، تأییدیه‌ها، کتابخانه رسانه." },
  { id: 'inbox',           icon: Inbox,     color: '#f59e0b', title: "صندوق پیام‌ها",               count: 9,  body: "صندوق ورودی یکپارچه، پاسخ‌های هوش مصنوعی، قوانین اتوماسیون." },
  { id: 'billing',         icon: CreditCard,color: '#3b82f6', title: "صورتحساب",             count: 11, body: "طرح ها، روش های پرداخت، فاکتورها، بازپرداخت." },
  { id: 'troubleshooting', icon: Wrench,    color: '#ef4444', title: "عیب یابی",     count: 7,  body: "مسائل رایج، کدهای خطا، مراحل بازیابی." },
  { id: 'security',        icon: Shield,    color: '#0891b2', title: "امنیت و حریم خصوصی",  count: 8,  body: "احراز هویت، گزارش حسابرسی، نگهداری داده ها." },
  { id: 'api',             icon: BookOpen,  color: '#6366f1', title: "API و توسعه دهندگان",    count: 16, body: "کلیدهای API، webhooks، محدودیت‌های نرخ." },
];

const POPULAR = [
  "چگونه یک صفحه فیس‌بوک را متصل کنم؟",
  "چرا توکن متای من منقضی شد؟",
  "چگونه هم تیمی ها را دعوت کنم و نقش ها را تعیین کنم؟",
  "تاییدیه ها در ویرایشگر محتوا چگونه کار می‌کنند؟",
  "گزارش مشتری را به صورت PDF از کجا دانلود کنم؟",
  "چگونه اشتراک خود را لغو کنم؟",
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query.trim()) return CATEGORIES;
    const q = query.toLowerCase();
    return CATEGORIES.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      c.body.toLowerCase().includes(q) ||
      c.id.includes(q)
    );
  }, [query]);

  return (
    <>
      <Meta
        title={"مرکز راهنما"}
        description={"راهنماهای راه‌اندازی، مراحل عیب‌یابی، سؤالات متداول و پاسخ به سؤالات رایج در مورد استفاده از راوینتا."}
      />
      {/* Hero with search */}
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
          <Badge variant="brand" size="md" icon={BookOpen}>مرکز راهنما</Badge>
          <h1 style={{
            margin: '20px 0 16px',
            fontSize: 'clamp(36px, 4.4vw, 48px)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            چگونه می‌توانیم کمک کنیم؟
          </h1>
          <p style={{ margin: '0 auto 28px', maxWidth: 560, fontSize: 16, lineHeight: 'var(--line-height-body)', color: 'var(--text-secondary)' }}>
            مقالات، راهنماها و مراحل عیب‌یابی را جستجو کنید - یا بر اساس دسته بندی مرور کنید.
          </p>

          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            <Input
              size="lg"
              type="search"
              placeholder={"جستجو در مقالات، راهنماها، کدهای خطا…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              prefix={<Search size={16} />}
            />
          </div>

          {/* Popular searches */}
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', alignSelf: 'center' }}>پرطرفدار:</span>
            {POPULAR.slice(0, 3).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery(t)}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-pill)',
                  cursor: 'pointer',
                  minHeight: 'auto', minWidth: 'auto',
                  fontFamily: 'inherit',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section style={{ padding: '32px 32px 64px' }}>
        <div style={{ maxWidth: 'var(--container-xl)', margin: '0 auto' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            بر اساس دسته بندی مرور کنید
          </h2>

          {filtered.length === 0 ? (
            <div
              style={{
                padding: 40,
                textAlign: 'center',
                background: 'var(--surface-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                color: 'var(--text-secondary)',
              }}
            >
              هیچ دسته ای مطابقت ندارد "{query}". جستجوی دیگری را امتحان کنید یا{' '}
              <Link to="/contact" style={{ color: 'var(--text-link)', fontWeight: 500 }}>با پشتیبانی تماس بگیرید</Link>.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 16,
              }}
              className="help-grid"
            >
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  to={`/help/${c.id}`}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    padding: 24,
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xs)',
                    textDecoration: 'none',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                >
                  <span style={{
                    display: 'inline-flex',
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: c.color, color: '#fff',
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    <c.icon size={16} strokeWidth={2.2} />
                  </span>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                  <p style={{ margin: '4px 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)', flex: 1 }}>
                    {c.body}
                  </p>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{c.count} مقالات</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-link)', fontWeight: 600 }}>
                      مرور کنید <ArrowRight size={12} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          <style>{`
            @media (max-width: 980px) { .help-grid { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 560px) { .help-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </section>

      {/* Still need help band */}
      <section style={{ padding: '64px 32px 120px' }}>
        <div
          style={{
            maxWidth: 720, margin: '0 auto',
            padding: 32,
            display: 'flex', gap: 20, alignItems: 'center',
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-2xl)',
            boxShadow: 'var(--shadow-sm)',
          }}
          className="help-cta"
        >
          <span
            style={{
              flexShrink: 0,
              width: 48, height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary-hover)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MessageCircle size={22} strokeWidth={1.8} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
              هنوز به کمک نیاز دارید؟
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
              تیم پشتیبانی ما ظرف یک روز کاری پاسخ می‌دهد. سریعتر در رشد + برنامه های سازمانی.
            </div>
          </div>
          <Button as={Link} to="/contact" size="md" iconRight={ArrowRight}>
            ارتباط با پشتیبانی
          </Button>
          <style>{`
            @media (max-width: 640px) { .help-cta { flex-direction: column !important; align-items: flex-start !important; text-align: left; } }
          `}</style>
        </div>
      </section>
    </>
  );
}
