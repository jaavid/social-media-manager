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
    { id: 'agencies', label: 'Agencies', icon: Briefcase,
      headline: 'Manage 100+ clients without losing your mind.',
      bullets: [
        'Multi-client workspaces with one-click switcher',
        'Team collaboration with role permissions',
        'White-label client portals + branded reports',
        'Approval workflows for every action',
        'AI assistant tuned to each client\'s brand voice',
      ],
      cta: { label: 'Read agency case study', to: '/customers' } },
    { id: 'real-estate', label: 'Real Estate', icon: Building2,
      headline: 'Sell more properties on social media.',
      bullets: [
        'Property listing carousels for Instagram + Facebook',
        'Site-visit reminders via WhatsApp',
        'Lead capture from CTWA ads — directly to CRM',
        'AI-written property descriptions',
        'Open-house promo automation',
      ],
      cta: { label: 'Real estate playbook', to: '/solutions/real-estate' } },
    { id: 'clinics', label: 'Healthcare', icon: Stethoscope,
      headline: 'Engage patients across every platform.',
      bullets: [
        'Appointment reminders via WhatsApp Business',
        'Lab-report delivery with end-to-end audit trail',
        'Pre-built health-awareness content calendar',
        'HIPAA-aligned content checker',
        'Review management with AI-suggested replies',
      ],
      cta: { label: 'Healthcare playbook', to: '/solutions/clinics' } },
    { id: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed,
      headline: 'Fill more tables with social.',
      bullets: [
        'Reservation bots that integrate with your POS',
        'Daily-specials posting on auto-pilot',
        'Review management for Zomato + Google',
        'Influencer outreach + tracking',
        'Festival campaigns (Diwali, Eid, Christmas) ready to go',
      ],
      cta: { label: 'Restaurant playbook', to: '/solutions/restaurants' } },
    { id: 'creators', label: 'Creators', icon: Palette,
      headline: 'Track your creator economy.',
      bullets: [
        'YouTube + Instagram + LinkedIn analytics in one view',
        'Brand-deal tracking + invoicing',
        'Audience insights — what your fans actually want',
        'Posting optimization with AI predictions',
        'Content calendar tuned to your schedule',
      ],
      cta: { label: 'Creator playbook', to: '/solutions/creators' } },
  ];
  const [active, setActive] = useState(tabs[0].id);
  const current = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <section style={{ padding: 'clamp(64px, 10vh, 120px) 24px', background: 'var(--surface-page)' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <ScrollReveal>
          <SectionHeading eyebrow="Made for every kind of marketer" title="Whoever you are, Social Stats fits" />
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