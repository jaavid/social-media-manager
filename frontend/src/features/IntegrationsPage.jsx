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
import { motion } from 'framer-motion';
import {
  Search, Sparkles, ArrowRight, CheckCircle2,
  MessageSquare, BarChart3, Megaphone, Workflow, CreditCard, ShoppingBag,
  Database, Zap, Mail, Calendar, Image, Brain,
} from 'lucide-react';

import MeshGradient    from '../components/marketing/MeshGradient';
import ScrollReveal    from '../components/marketing/ScrollReveal';
import Button          from '../components/ui/Button';
import Meta            from '../components/Meta';
import { track }       from '../services/analytics';

/**
 * IntegrationsPage — /integrations
 *
 *  1. Hero with search
 *  2. Category pills
 *  3. Featured 3-card row (Meta · Google · WhatsApp)
 *  4. Full grid (filterable + searchable)
 *  5. "Don't see it?" custom-integration CTA
 *  6. Bottom CTA
 *
 * No external API. The integration list lives in this file as static data —
 * easy to add new entries without touching the layout.
 */

// ── Categories ────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',         label: "همه",          icon: Sparkles  },
  { id: 'social',      label: "اجتماعی",       icon: Megaphone },
  { id: 'messaging',   label: "پیام‌رسانی",    icon: MessageSquare },
  { id: 'analytics',   label: "تحلیل و آمار",    icon: BarChart3 },
  { id: 'crm',         label: 'CRM',          icon: Database  },
  { id: 'commerce',    label: "تجارت",     icon: ShoppingBag },
  { id: 'automation',  label: "خودکارسازی",   icon: Workflow  },
  { id: 'ai',          label: "هوش مصنوعی",           icon: Brain     },
  { id: 'productivity',label: "بهره وری", icon: Calendar  },
];

// ── Integrations ──────────────────────────────────────────────────────
// `live: true` = fully shipped; otherwise shows a "Coming soon" badge.
const INTEGRATIONS = [
  // Social
  { slug: 'facebook',   name: "فیس‌بوک",   tagline: "صفحات، پست‌ها، تبلیغات، نظرات.",          category: 'social',     live: true,  badge: "یکپارچه", accent: '#1877F2', initial: 'f' },
  { slug: 'instagram',  name: "اینستاگرام",  tagline: "پست‌ها، قرقره ها، داستان ها، پیامک ها.",           category: 'social',     live: true,  badge: "یکپارچه", accent: '#E4405F', initial: 'I' },
  { slug: 'youtube',    name: "یوتیوب",    tagline: "بارگذاری، نظرات، تحلیل و آمار.",         category: 'social',     live: true,  badge: "یکپارچه", accent: '#FF0000', initial: 'Y' },
  { slug: 'linkedin',   name: "لینکدین",   tagline: "صفحات، پست‌ها، فرم‌های اصلی.",         category: 'social',     live: true,  badge: "یکپارچه", accent: '#0A66C2', initial: 'in' },

  // Messaging
  { slug: 'whatsapp',   name: "کسب و کار واتس‌اپ", tagline: "چت دو طرفه، کمپین ها، CTWA.", category: 'messaging',  live: true,  badge: "یکپارچه", accent: '#25D366', initial: 'W' },
  { slug: 'pinbot',     name: 'Pinbot.ai',  tagline: "درگاه واتس‌اپ کسب و کار API.",         category: 'messaging',  live: true,                   accent: '#22c55e', initial: 'pb' },
  { slug: 'messenger',  name: "مسنجر",  tagline: "مکالمات از فیس‌بوک.",          category: 'messaging',  live: true,                   accent: '#0084FF', initial: 'M' },
  { slug: 'telegram',   name: "تلگرام",   tagline: "کانال ها و پاسخ های ربات.",             category: 'messaging',  live: false,                  accent: '#26A5E4', initial: 'tg' },
  { slug: 'slack',      name: "اسلک",      tagline: "اطلاعیه ها، تأییدیه ها، هشدارها.",     category: 'messaging',  live: true,                   accent: '#4A154B', initial: 'S' },
  { slug: 'discord',    name: "دیسکورد",    tagline: "اطلاعیه های سرور از طریق webhook.",     category: 'messaging',  live: false,                  accent: '#5865F2', initial: 'D' },

  // Analytics
  { slug: 'ga4',        name: "گوگل آنالیتیکس ۴", tagline: "جلسات، تبدیل ها، مسیرها.", category: 'analytics',  live: true,                   accent: '#E37400', initial: 'GA' },
  { slug: 'gsc',        name: "کنسول جستجو",     tagline: "عملکرد سئو و پرس و جو.",  category: 'analytics',  live: true,                   accent: '#4285F4', initial: 'SC' },
  { slug: 'gmb',        name: 'کسب‌وکار گوگل',    tagline: "نظرات، پست‌ها، بینش‌های محلی.",category: 'analytics',  live: true,  badge: "یکپارچه", accent: '#34A853', initial: 'GB' },
  { slug: 'ga-meta-ads',name: "تبلیغات متا",           tagline: "خرج کردن، ROAS، امتیازدهی خلاق.",category: 'analytics',  live: true,  badge: "یکپارچه", accent: '#1877F2', initial: 'MA' },
  { slug: 'google-ads', name: "تبلیغات گوگل",         tagline: "کمپین ها، کلمات کلیدی، هزینه.",   category: 'analytics',  live: false,                  accent: '#4285F4', initial: 'gA' },

  // CRM
  { slug: 'hubspot',    name: 'HubSpot',    tagline: "مخاطبین و مکالمات را همگام کنید.",     category: 'crm',         live: true,                   accent: '#FF7A59', initial: 'H' },
  { slug: 'salesforce', name: "سیلزفورس", tagline: "همگام سازی هدایت، تماس و معامله.",        category: 'crm',         live: false,                  accent: '#00A1E0', initial: 'sf' },
  { slug: 'zoho',       name: 'Zoho CRM',   tagline: "همگام سازی دو طرفه - سرنخ ها + فعالیت ها.",   category: 'crm',         live: true,                   accent: '#C8202C', initial: 'Z' },
  { slug: 'freshsales', name: "فرش‌سیلز", tagline: "خط لوله و همگام سازی تماس.",           category: 'crm',         live: false,                  accent: '#21B573', initial: 'fs' },

  // Commerce
  { slug: 'shopify',    name: 'Shopify',    tagline: "محصولات، سفارشات، مشتریان.",          category: 'commerce',    live: true,                   accent: '#96BF48', initial: 'sh' },
  { slug: 'woocommerce',name: "ووکامرس",tagline: "همگام سازی وردپرس + ووکامرس.",         category: 'commerce',    live: true,                   accent: '#7F54B3', initial: 'W' },
  { slug: 'magento',    name: "مجنتو",    tagline: "همگام سازی Adobe Commerce.",                  category: 'commerce',    live: false,                  accent: '#EE672F', initial: 'm' },

  // Automation
  { slug: 'zapier',     name: "زاپیر",     tagline: "بیش از 5000 برنامه از طریق محرک‌های زاپیر.",      category: 'automation',  live: true,                   accent: '#FF4F00', initial: 'Z' },
  { slug: 'make',       name: "میک",       tagline: "اتوماسیون بصری، جریان‌های عمیق.",        category: 'automation',  live: true,                   accent: '#6D00CC', initial: 'M' },
  { slug: 'n8n',        name: 'n8n',        tagline: "اتوماسیون خود میزبان.",               category: 'automation',  live: false,                  accent: '#EA4B71', initial: 'n8' },
  { slug: 'webhook',    name: "وب‌هوک‌ها",   tagline: "خود را بیاورید - خروجی + ورودی.", category: 'automation',  live: true,                   accent: '#6b7280', initial: 'wh' },

  // AI
  { slug: 'anthropic',  name: "آنتروپیک کلود", tagline: "کلید آنتروپیک API خود را (سازمانی) بیاورید.", category: 'ai',         live: false,                  accent: '#D97706', initial: 'C' },
  { slug: 'openai',     name: 'OpenAI',      tagline: "کلید GPT خود را (سازمانی) بیاورید.",category: 'ai',         live: false,                  accent: '#10a37f', initial: 'o' },
  { slug: 'gemini',     name: "گوگل جمینی", tagline: "کلید Gemini API خود را (سازمانی) بیاورید.", category: 'ai',         live: false,                  accent: '#4285F4', initial: 'G' },

  // Productivity
  { slug: 'gcal',       name: "تقویم گوگل", tagline: "همگام سازی تقویم محتوا.",           category: 'productivity',live: true,                   accent: '#4285F4', initial: 'gc' },
  { slug: 'gmail',      name: "جیمیل",       tagline: "ارسال پاسخ و خلاصه.",            category: 'productivity',live: true,                   accent: '#EA4335', initial: 'gm' },
  { slug: 'gdrive',     name: "گوگل درایو",tagline: "رسانه را به ویرایشگر محتوا بکشید.",            category: 'productivity',live: true,                   accent: '#0F9D58', initial: 'gd' },
  { slug: 'dropbox',    name: "دراپ باکس",     tagline: "رسانه را به ویرایشگر محتوا بکشید.",            category: 'productivity',live: false,                  accent: '#0061FF', initial: 'db' },
  { slug: 'notion',     name: "نوشن",      tagline: "خلاصه‌ها را به صفحات مفهومی فشار دهید.",         category: 'productivity',live: false,                  accent: '#000000', initial: 'N' },
  { slug: 'figma',      name: "فیگما",       tagline: "طرح ها را به ویرایشگر محتوا بکشید.",      category: 'productivity',live: false,                  accent: '#F24E1E', initial: 'F' },
  { slug: 'canva',      name: "کانوا",       tagline: "برای طراحی به Canva فشار دهید.",            category: 'productivity',live: true,                   accent: '#00C4CC', initial: 'cv' },

];

// Featured trio — always pinned at the top.
const FEATURED_SLUGS = ['facebook', 'whatsapp', 'gmb'];

export default function IntegrationsPage() {
  const [filter, setFilter] = useState('all');
  const [query, setQuery]   = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INTEGRATIONS
      .filter((i) => filter === 'all' || i.category === filter)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.tagline.toLowerCase().includes(q));
  }, [filter, query]);

  const featured = FEATURED_SLUGS.map((s) => INTEGRATIONS.find((i) => i.slug === s)).filter(Boolean);

  return (
    <>
      <Meta
        noSuffix
        title={"ادغام - راوینتا"}
        description={"بیش از 40 ادغام بومی در شبکه‌های اجتماعی، پیام‌رسانی، تحلیل و آمار، CRM، تجارت، هوش مصنوعی و موارد دیگر. راوینتا را در عرض چند دقیقه به پشته موجود خود وصل کنید."}
      />

      {/* ╭──────────────╮
          │   1.  HERO   │
          ╰──────────────╯ */}
      <section style={{
        position: 'relative',
        padding: '120px 24px 64px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <MeshGradient variant="hero" />

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', marginBottom: 20,
            fontSize: 12, fontWeight: 600,
            color: '#00CCF5',
            background: 'rgba(0,204,245,0.10)',
            border: '1px solid rgba(0,204,245,0.25)',
            borderRadius: 'var(--radius-pill)',
          }}>
            <Sparkles size={12} /> اتصال‌ها
          </span>

          <h1 style={{
            margin: 0,
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#fff',
            lineHeight: 1.05,
          }}>
            راوینتا را به آن وصل کنید<br />
            <span style={{ background: 'linear-gradient(135deg, #00CCF5, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ابزارهایی که قبلاً استفاده می‌کنید
            </span>
          </h1>

          <p style={{
            margin: '20px auto 32px',
            maxWidth: 560,
            fontSize: 'clamp(16px, 1.8vw, 19px)',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.55,
          }}>
            بیش از ۴۰ اتصال یکپارچه برای شبکه‌های اجتماعی، پیام‌رسانی، تحلیل و آمار، مدیریت ارتباط با مشتری، تجارت و هوش مصنوعی. این اتصال‌ها را تیم ما توسعه می‌دهد و نگهداری می‌کند.
          </p>

          {/* Search */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10,
            maxWidth: 480, margin: '0 auto',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 'var(--radius-pill)',
            backdropFilter: 'blur(12px)',
          }}>
            <Search size={16} color="rgba(255,255,255,0.55)" />
            <input
              type="search"
              aria-label={"ادغام جستجو"}
              placeholder={"ادغام جستجو…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent',
                border: 'none', outline: 'none',
                color: '#fff',
                fontSize: 15,
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={"جستجو را پاک کنید"}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', fontSize: 14,
                }}
              >
                ×
              </button>
            )}
          </label>
        </div>
      </section>

      {/* ╭──────────────────────╮
          │   2 + 3.  FEATURED   │
          ╰──────────────────────╯ */}
      {!query && filter === 'all' && (
        <section style={{ padding: '32px 24px 48px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <ScrollReveal>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)', marginBottom: 16,
                textAlign: 'center',
              }}>
                برجسته
              </div>
            </ScrollReveal>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {featured.map((i, idx) => (
                <ScrollReveal key={i.slug} delay={idx * 0.06}>
                  <FeaturedCard i={i} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ╭──────────────────────╮
          │   4.  CATEGORY GRID  │
          ╰──────────────────────╯ */}
      <section style={{ padding: '40px 24px 100px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Filter pills */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            marginBottom: 36,
          }}>
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const count = id === 'all' ? INTEGRATIONS.length : INTEGRATIONS.filter((i) => i.category === id).length;
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? '#0a0e14' : '#fff',
                    background: active ? 'linear-gradient(135deg, #00CCF5, #00A8D8)' : 'rgba(255,255,255,0.06)',
                    border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={13} />
                  {label}
                  <span style={{ opacity: 0.6, fontSize: 11 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {filtered.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}>
              {filtered.map((i, idx) => (
                <IntegrationCard key={i.slug} i={i} index={idx} />
              ))}
            </div>
          ) : (
            <div style={{
              padding: 56, textAlign: 'center',
              color: 'rgba(255,255,255,0.55)',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-xl)',
            }}>
              <p style={{ margin: 0, fontSize: 15 }}>
                هیچ ادغامی مطابقت ندارد "{query}&quot;.
              </p>
              <p style={{ margin: '8px 0 16px', fontSize: 13 }}>
                کلمه کلیدی دیگری را امتحان کنید - یا آن را در زیر درخواست کنید.
              </p>
              <Button as={Link} to="/contact" size="sm" variant="ghost"
                style={{
                  color: '#fff',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.18)',
                }}>
                درخواست ادغام
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* ╭──────────────────────────╮
          │   5.  CUSTOM / API CTA   │
          ╰──────────────────────────╯ */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}>
            <Tile
              icon={Zap}
              title={"خود را بسازید"}
              body={"با API عمومی، وب‌هوک‌های خروجی، زاپیر و میک، اتصال موردنیاز خود را بسازید."}
              cta={{ to: '/contact?topic=api', label: "دسترسی API را دریافت کنید" }}
            />
            <Tile
              icon={Mail}
              title={"آیا ابزار خود را نمی بینید؟"}
              body={"ابزارهای موردنیازتان را به ما بگویید. هر سه ماه دو تا سه اتصال تازه ارائه می‌کنیم و درخواست‌های مشتریان در اولویت قرار می‌گیرند."}
              cta={{ to: '/contact', label: "درخواست ادغام" }}
            />
            <Tile
              icon={Image}
              title={"ادغام سازمانی"}
              body={"مدیریت کاربران با SCIM، ورود یکپارچه با SAML یا OIDC و وب‌هوک خصوصی، در طرح سازمانی در دسترس است."}
              cta={{ to: '/contact?topic=enterprise', label: "با فروشندگان صحبت کنید" }}
            />
          </div>
        </div>
      </section>

      {/* ╭──────────────╮
          │   6.  CTA    │
          ╰──────────────╯ */}
      <section style={{
        position: 'relative',
        padding: '120px 24px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <MeshGradient variant="cta" />

        <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(32px, 4.5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#fff',
            lineHeight: 1.1,
          }}>
            پشته خود را وصل کنید<br />
            <span style={{ background: 'linear-gradient(135deg, #00CCF5, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              در کمتر از 10 دقیقه
            </span>
          </h2>

          <p style={{
            margin: '20px auto 32px',
            maxWidth: 480,
            fontSize: 17,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.55,
          }}>
            اکثر مشتریان قبل از اینکه قهوه صبح خود را تمام کنند، 4-6 پلتفرم را به هم متصل می‌کنند. طرح رایگان، بدون کارت.
          </p>

          <div style={{
            display: 'flex', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Button as={Link} to="/signup" size="lg"
              onClick={() => track('signup_click', { source: 'integrations_cta' })}
              style={{
                background: 'linear-gradient(135deg, #00CCF5, #00A8D8)',
                color: '#0a0e14', border: 'none',
              }}>
              شروع رایگان <ArrowRight size={15} />
            </Button>
            <Button as={Link} to="/contact" size="lg" variant="ghost"
              style={{
                color: '#fff',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}>
              با فروشندگان صحبت کنید
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

// ── card components ────────────────────────────────────────────────────
function FeaturedCard({ i }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      style={{
        position: 'relative',
        padding: 24,
        borderRadius: 'var(--radius-xl)',
        background: `linear-gradient(135deg, ${i.accent}1A, rgba(255,255,255,0.04))`,
        border: `1px solid ${i.accent}40`,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 14,
      }}>
        <Logo i={i} size={44} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{i.name}</div>
          {i.badge && (
            <div style={{ fontSize: 11, fontWeight: 600, color: i.accent }}>{i.badge}</div>
          )}
        </div>
      </div>

      <p style={{
        margin: 0, flex: 1,
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 1.55,
      }}>
        {i.tagline}
      </p>

      <div style={{
        marginTop: 18, paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, fontWeight: 600,
        color: '#00CCF5',
      }}>
        <CheckCircle2 size={13} /> اکنون زندگی کنید
      </div>
    </motion.article>
  );
}

function IntegrationCard({ i }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      style={{
        position: 'relative',
        padding: 18,
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        cursor: 'default',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 10,
      }}>
        <Logo i={i} size={34} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {i.name}
          </div>
        </div>
        {i.live ? (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: '#10b981',
            padding: '2px 7px',
            background: 'rgba(16,185,129,0.10)',
            border: '1px solid rgba(16,185,129,0.30)',
            borderRadius: 'var(--radius-pill)',
            whiteSpace: 'nowrap',
          }}>
            زنده
          </span>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            padding: '2px 7px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--radius-pill)',
            whiteSpace: 'nowrap',
          }}>
            به‌زودی
          </span>
        )}
      </div>

      <p style={{
        margin: 0, flex: 1,
        fontSize: 12,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.5,
      }}>
        {i.tagline}
      </p>
    </motion.div>
  );
}

function Logo({ i, size = 36 }) {
  return (
    <div style={{
      flexShrink: 0,
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 8,
      background: `${i.accent}22`,
      color: i.accent,
      fontWeight: 700,
      fontSize: size <= 34 ? 12 : 15,
      letterSpacing: '-0.02em',
    }}>
      {i.initial}
    </div>
  );
}

function Tile({ icon: Icon, title, body, cta }) {
  return (
    <ScrollReveal>
      <div style={{
        padding: 28,
        borderRadius: 'var(--radius-xl)',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.10)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 10,
          background: 'rgba(0,204,245,0.12)',
          color: '#00CCF5',
          marginBottom: 14,
        }}>
          <Icon size={20} strokeWidth={1.6} />
        </div>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#fff' }}>
          {title}
        </h3>
        <p style={{
          margin: '8px 0 16px', flex: 1,
          fontSize: 14,
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.55,
        }}>
          {body}
        </p>
        <Link to={cta.to} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 13, fontWeight: 600,
          color: '#00CCF5',
          textDecoration: 'none',
        }}>
          {cta.label} <ArrowRight size={13} />
        </Link>
      </div>
    </ScrollReveal>
  );
}
