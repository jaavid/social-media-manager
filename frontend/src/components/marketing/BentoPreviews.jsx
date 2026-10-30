'use client';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * BentoPreviews — small animated UI peeks used inside FeatureBento tiles.
 * Each preview is intentionally lightweight (pure HTML/SVG, framer-motion
 * for the few animated bits) so 8 of them on one page don't tank perf.
 *
 * Every preview honours `prefers-reduced-motion` via framer-motion's
 * `useReducedMotion` hook (used inside the bits that genuinely animate).
 */
import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight, Send, Zap, Bot, Sparkles, BarChart3,
  Calendar, FileText, MessageCircle, TrendingUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// 1. AI Assistant — chat with streaming reply
// ─────────────────────────────────────────────────────────────────────────────
export function AIAssistantPreview() {
  return (
    <div style={cardStyle}>
      <Bubble side="user" tone="cyan">برای راه اندازی ملک جدید ما 3 پست بنویسید</Bubble>
      <Bubble side="ai">
        در اینجا سه پیش‌نویس برای لحن برند شما تنظیم شده است
        <span style={dotsStyle}>
          <span style={dot(0)} /><span style={dot(0.15)} /><span style={dot(0.3)} />
        </span>
      </Bubble>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Composer — multi-platform tabs
// ─────────────────────────────────────────────────────────────────────────────
export function ComposerPreview() {
  const platforms = [
    { name: "اینستاگرام", tone: '#E4405F', active: true },
    { name: "فیس‌بوک",  tone: '#1877F2' },
    { name: "لینکدین",  tone: '#0A66C2' },
  ];
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {platforms.map((p) => (
          <span key={p.name} style={{
            padding: '4px 10px',
            fontSize: 10, fontWeight: 600,
            color: p.active ? '#fff' : 'var(--text-tertiary)',
            background: p.active ? p.tone : 'var(--surface-sunken)',
            border: `1px solid ${p.active ? p.tone : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-pill)',
          }}>{p.name}</span>
        ))}
      </div>
      <div style={{
        padding: 10,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)',
      }}>
        راه اندازی جدید - لوکس آپارتمان سه‌خوابه در <strong style={{ color: 'var(--text-primary)' }}>ارتفاعات آکم</strong>. استخر روی پشت بام، خانه هوشمند، آماده نقل مکان. بازدید از سایت این آخر هفته باز است 🌅
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>تغییر اندازه خودکار برای اینستاگرام · 220 کاراکتر</span>
        <Send size={11} style={{ color: 'var(--brand-primary)' }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Inbox — chat list across platforms
// ─────────────────────────────────────────────────────────────────────────────
export function InboxPreview() {
  const messages = [
    { name: "نگار احمدی",    plat: 'IG', text: "آیا این هنوز موجود است؟",     tone: '#E4405F', delay: 0 },
    { name: "گروه آکمه",  plat: 'WA', text: "آیا می‌توانیم شنبه بازدید کنیم؟",    tone: '#25D366', delay: 0.15 },
    { name: "آرمان محمدی", plat: 'FB', text: "محدوده قیمت چیست؟",     tone: '#1877F2', delay: 0.3 },
  ];
  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      {messages.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.2 + m.delay, duration: 0.4 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderBottom: i < messages.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <span style={{
            width: 26, height: 26, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: m.tone, color: '#fff',
            borderRadius: '50%',
            fontSize: 9, fontWeight: 700,
          }}>{m.plat}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.text}
            </div>
          </div>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--brand-primary)', flexShrink: 0,
          }} />
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Bot Builder — node graph with edges
// ─────────────────────────────────────────────────────────────────────────────
export function BotBuilderPreview() {
  const edgeId = useId();
  return (
    <svg role="img" aria-label="نمونه مسیر ربات: شروع، پرسش، دریافت و پاسخ" dir="ltr" viewBox="0 0 280 140" preserveAspectRatio="xMidYMid meet"
         style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '2 / 1', overflow: 'visible' }}>
      <defs>
        <linearGradient id={edgeId} x1="0" x2="1">
          <stop offset="0%"   stopColor="var(--brand-primary)" />
          <stop offset="100%" stopColor="var(--module-ai)" />
        </linearGradient>
      </defs>
      {/* Edges */}
      <motion.path d="M 80 30 L 140 30" stroke={`url(#${edgeId})`} strokeWidth="1.5" fill="none"
                   initial={false} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} />
      <motion.path d="M 200 30 L 230 55" stroke={`url(#${edgeId})`} strokeWidth="1.5" fill="none"
                   initial={false} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.6 }} />
      <motion.path d="M 170 40 L 110 90" stroke={`url(#${edgeId})`} strokeWidth="1.5" fill="none"
                   initial={false} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.6 }} />

      {/* Nodes */}
      <Node x={20}  y={30} label={"شروع"}   tone="var(--brand-primary)" />
      <Node x={140} y={30} label={"پرسش"}     tone="var(--module-ai)" delay={0.4} />
      <Node x={200} y={65} label={"دریافت"} tone="var(--success)" delay={0.8} />
      <Node x={80}  y={100} label={"پاسخ"}  tone="var(--warning)" delay={0.8} />
    </svg>
  );
}

function Node({ x, y, label, tone, delay = 0.1 }) {
  return (
    <motion.g
      initial={false}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      <rect x={x} y={y - 10} width={60} height={20}
            rx={6} fill="var(--surface-elevated)"
            stroke={tone} strokeWidth="1.2" />
      <circle cx={x + 6} cy={y} r={3} fill={tone} />
      <text x={x + 34} y={y + 3.5} textAnchor="middle" direction="rtl"
            fontSize="9" fontWeight="600"
            fill="var(--text-primary)"
            fontFamily="var(--font-sans)">{label}</text>
    </motion.g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. AI Insights — alert card with metric
// ─────────────────────────────────────────────────────────────────────────────
export function AIInsightPreview() {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--warning)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><Sparkles size={11} /></span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--warning)',
                       textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          بینش هوش مصنوعی · همین الان
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 'var(--line-height-body)' }}>
        تعامل در روزهای سه شنبه 30 درصد کاهش یافت
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 'var(--line-height-body)' }}>
        سعی کنید پست سه شنبه خود را به ساعت 7 بعدازظهر منتقل کنید - در آن زمان مخاطبان شما بیشتر فعال هستند.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Automations — IF/THEN rule chain
// ─────────────────────────────────────────────────────────────────────────────
export function AutomationsPreview() {
  return (
    <div style={cardStyle}>
      <div style={ruleRowStyle}>
        <span style={kindStyle('cyan')}>اگر</span>
        <span style={ruleTextStyle}>نظر شامل کلمه «قیمت» است</span>
      </div>
      <ChainArrow />
      <div style={ruleRowStyle}>
        <span style={kindStyle('purple')}>سپس</span>
        <span style={ruleTextStyle}>ارسال پاسخ آماده <strong style={{ color: 'var(--text-primary)' }}>"قیمت"</strong></span>
      </div>
      <ChainArrow />
      <div style={ruleRowStyle}>
        <span style={kindStyle('green')}>و</span>
        <span style={ruleTextStyle}>برچسب مخاطب: <strong style={{ color: 'var(--text-primary)' }}>سرنخ علاقه‌مند</strong></span>
      </div>
    </div>
  );
}

function ChainArrow() {
  return (
    <div aria-hidden style={{ height: 14, marginInlineStart: 16, display: 'flex', alignItems: 'center' }}>
      <span style={{
        display: 'block', width: 1.5, height: '100%',
        background: 'linear-gradient(to bottom, var(--brand-primary), var(--module-ai))',
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Analytics — sparkline chart
// ─────────────────────────────────────────────────────────────────────────────
export function AnalyticsPreview() {
  const reduced = useReducedMotion();
  const path = 'M 0 60 L 30 50 L 60 55 L 90 40 L 120 30 L 150 38 L 180 22 L 210 18 L 240 10';
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)' }}>رسیدن · 30 روز</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 2,
          fontSize: 11, fontWeight: 700, color: 'var(--success)',
        }}><TrendingUp size={11} /> +23%</span>
      </div>
      <svg viewBox="0 0 240 80" style={{ width: '100%', height: 80 }}>
        <defs>
          <linearGradient id="ana-line" x1="0" x2="1">
            <stop offset="0%"  stopColor="var(--brand-primary)" />
            <stop offset="100%" stopColor="var(--module-ai)" />
          </linearGradient>
          <linearGradient id="ana-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="var(--brand-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path d={path + ' L 240 80 L 0 80 Z'} fill="url(#ana-fill)"
                     initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                     viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.5 }} />
        <motion.path d={path} fill="none" stroke="url(#ana-line)" strokeWidth="2" strokeLinecap="round"
                     initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                     viewport={{ once: true }} transition={{ duration: reduced ? 0 : 1.2, ease: 'easeOut' }} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-tertiary)' }}>
        <span>1 آوریل</span><span>15 آوریل</span><span>30 آوریل</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Reports — PDF preview card
// ─────────────────────────────────────────────────────────────────────────────
export function ReportsPreview() {
  return (
    <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        padding: 12,
        background: '#fff',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingBottom: 8, borderBottom: '1px solid var(--border-default)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>آکمه املاک · آوریل</span>
          <FileText size={11} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <ReportStat label={"دسترسی مخاطبان"}  value="248K" />
          <ReportStat label={"پست‌ها"}  value="42"   />
          <ReportStat label={"سرنخ‌ها"}  value="312"  />
        </div>
        <div style={{ marginTop: 8, height: 24, background: 'linear-gradient(90deg, var(--brand-primary) 65%, var(--border-default) 65%)',
                      borderRadius: 4 }} />
        <div style={{ marginTop: 6, fontSize: 9, color: 'var(--text-secondary)' }}>
          خلاصه هوش مصنوعی: میزان دسترسی شما 23 درصد افزایش یافته است که توسط ریلز هدایت می‌شود…
        </div>
      </div>
    </div>
  );
}

function ReportStat({ label, value }) {
  return (
    <div style={{ flex: 1, padding: '6px 8px', background: 'var(--surface-sunken)', borderRadius: 4 }}>
      <div style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────────────
const cardStyle = {
  padding: 14,
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  display: 'flex', flexDirection: 'column', gap: 8,
  height: '100%',
};

function Bubble({ side, tone = 'plain', children }) {
  const isUser = side === 'user';
  const cyan = tone === 'cyan';
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '88%',
      padding: '8px 12px',
      fontSize: 12, lineHeight: 'var(--line-height-body)',
      color: cyan ? 'var(--brand-primary-hover)' : 'var(--text-primary)',
      background: cyan ? 'var(--brand-primary-soft)' : 'var(--surface-card)',
      border: cyan ? 'none' : '1px solid var(--border-subtle)',
      borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
    }}>
      {children}
    </div>
  );
}

const dotsStyle = {
  display: 'inline-flex', gap: 3, marginInlineStart: 6, verticalAlign: 'middle',
};

const dot = (delay) => ({
  width: 4, height: 4, borderRadius: '50%',
  background: 'var(--text-tertiary)', display: 'inline-block',
  animation: `mkt-dot 1.4s ease-in-out ${delay}s infinite`,
});

const ruleRowStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 10px',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 11, color: 'var(--text-secondary)',
};

const ruleTextStyle = {
  flex: 1, minWidth: 0,
};

const kindStyle = (tone) => {
  const colors = {
    cyan:   { color: 'var(--brand-primary)', bg: 'rgba(0,204,245,0.1)' },
    purple: { color: 'var(--module-ai)', bg: 'rgba(139,92,246,0.1)' },
    green:  { color: 'var(--success)', bg: 'rgba(16,185,129,0.1)' },
  }[tone];
  return {
    padding: '2px 8px',
    fontSize: 9, fontWeight: 700,
    color: colors.color, background: colors.bg,
    borderRadius: 'var(--radius-pill)',
    letterSpacing: '0.06em',
  };
};
