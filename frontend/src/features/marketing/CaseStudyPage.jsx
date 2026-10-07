/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * CaseStudyPage — generic, data-driven customer story page.
 *
 * One template renders all case studies from `caseStudies.js`, picked
 * by URL slug (`/customers/:slug`).
 *
 * Layout:
 *   1. Hero (portrait + headline metric)
 *   2. Customer profile sidebar
 *   3. Challenge block
 *   4. Solution block (with bullets)
 *   5. Pull quote 1
 *   6. Results (animated MetricCounter grid)
 *   7. Pull quote 2
 *   8. Used products
 *   9. Final CTA + back link
 */
import Link from '../../components/marketing/MarketingLink';
import { MotionDiv } from '../../components/marketing/Motion';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Quote,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

import MarketingLayout from '../../components/marketing/MarketingLayout';
import MeshGradient    from '../../components/marketing/MeshGradient';
import ScrollReveal    from '../../components/marketing/ScrollReveal';
import MetricCounter   from '../../components/marketing/MetricCounter';
import SamplePreviewBanner from '../../components/marketing/SamplePreviewBanner';
import Button          from '../../components/marketing/MarketingButton';
import Meta            from '../../components/Meta';
import JsonLd, { buildBreadcrumbs, SITE_URL } from '../../components/JsonLd';

import STUDIES from './caseStudies';
import { notFound } from 'next/navigation';

export default function CaseStudyPage({ slug }) {
  const study = STUDIES[slug];
  if (!study) notFound();

  const { company, industry, accent, tagline, hero, profile,
          challenge, solution, results, pulls } = study;

  return (
    <MarketingLayout>
      <Meta
        noSuffix
        title={`${company} - داستان مشتری راوینتا`}
        description={tagline}
      />
      <JsonLd
        id="breadcrumbs"
        data={buildBreadcrumbs([
          { name: "خانه",      url: `${SITE_URL}/` },
          { name: "مشتریان", url: `${SITE_URL}/customers` },
          { name: company,     url: `${SITE_URL}/customers/${slug}` },
        ])}
      />

      <SamplePreviewBanner kind="case_study" />

      {/* ╭──────────────╮
          │   1.  HERO   │
          ╰──────────────╯ */}
      <section style={{
        position: 'relative',
        padding: '120px 24px 64px',
        overflow: 'hidden',
      }}>
        <MeshGradient variant="hero" />

        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <Link to="/customers" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13,
            color: 'rgba(255,255,255,0.65)',
            textDecoration: 'none',
            marginBottom: 24,
          }}>
            <ArrowLeft size={14} /> همه مشتریان
          </Link>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'clamp(32px, 5vw, 56px)',
            alignItems: 'center',
          }}>
            {/* Left: copy */}
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', marginBottom: 16,
                fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
                color: accent,
                background: `${accent}1A`,
                border: `1px solid ${accent}40`,
                borderRadius: 'var(--radius-pill)',
              }}>
                <Sparkles size={11} /> {industry}
              </span>

              <h1 data-typography="display" style={{
                margin: 0,
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 1.05,
              }}>
                {company}
              </h1>

              <p style={{
                margin: '20px 0 0',
                fontSize: 'clamp(18px, 2vw, 22px)',
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 'var(--line-height-body)',
                maxWidth: 540,
              }}>
                {tagline}
              </p>
            </div>

            {/* Right: portrait + headline metric */}
            <ScrollReveal delay={0.1}>
              <MotionDiv
                whileHover={{ y: -4 }}
                style={{
                  position: 'relative',
                  padding: 32,
                  borderRadius: 'var(--radius-xl)',
                  background: `linear-gradient(135deg, ${accent}14, rgba(255,255,255,0.04))`,
                  border: `1px solid ${accent}40`,
                  textAlign: 'center',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `radial-gradient(circle at 50% 0%, ${accent}33, transparent 60%)`,
                  pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative' }}>
                  <div style={{
                    fontSize: 'clamp(72px, 10vw, 124px)',
                    fontWeight: 700,
                    color: accent,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}>
                    <MetricCounter value={hero.metric.value} suffix={hero.metric.suffix} />
                  </div>
                  <div style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.75)',
                  }}>
                    {hero.metric.label}
                  </div>

                  <div style={{
                    marginTop: 28,
                    paddingTop: 24,
                    borderTop: `1px solid ${accent}30`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 44, height: 44,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      background: `${accent}33`,
                      color: accent,
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {hero.portrait.initial}
                    </div>
                    <div style={{ textAlign: 'start' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                        {hero.portrait.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                        {hero.portrait.role}
                      </div>
                    </div>
                  </div>
                </div>
              </MotionDiv>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ╭──────────────────────────────╮
          │  2 + 3.  PROFILE + CHALLENGE │
          ╰──────────────────────────────╯ */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)',
          gap: 'clamp(32px, 5vw, 64px)',
          alignItems: 'start',
        }}>
          {/* Profile sidebar */}
          <ScrollReveal>
            <aside style={{
              padding: 24,
              borderRadius: 'var(--radius-xl)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              position: 'sticky', top: 96,
            }}>
              <div style={{
                width: 52, height: 52,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12,
                background: `${accent}22`,
                color: accent,
                fontSize: 22, fontWeight: 700,
                marginBottom: 16,
              }}>
                {hero.logoText}
              </div>

              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
                {company}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>
                {industry}
              </div>

              <ProfileRow label={"صنعت"}  value={profile.sector} />
              <ProfileRow label={"اندازه"}      value={profile.size} />
              <ProfileRow label={"تاسیس شد"}   value={profile.founded} />
              <ProfileRow label={"مکان"}  value={profile.location} />
              <ProfileRow label={"وب سایت"}   value={profile.website} icon={<ExternalLink size={11} />} />

              <div style={{
                marginTop: 18,
                paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
                  استفاده می‌کند
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profile.uses.map((u) => (
                    <span key={u} style={{
                      padding: '4px 10px',
                      fontSize: 11, fontWeight: 600,
                      color: 'rgba(255,255,255,0.75)',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 'var(--radius-pill)',
                    }}>
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </ScrollReveal>

          {/* Long-form */}
          <div style={{ minWidth: 0 }}>
            <ScrollReveal>
              <SectionLabel accent={accent}>چالش</SectionLabel>
              <h2 style={{
                margin: '8px 0 16px',
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 'var(--line-height-body)',
              }}>
                {challenge.title}
              </h2>
              {challenge.body.map((p, i) => (
                <p key={i} style={paraStyle}>{p}</p>
              ))}
            </ScrollReveal>

            {/* Pull 1 */}
            {pulls[0] && (
              <ScrollReveal delay={0.05}>
                <PullQuote pull={pulls[0]} accent={accent} />
              </ScrollReveal>
            )}

            {/* Solution */}
            <ScrollReveal>
              <SectionLabel accent={accent}>راه حل</SectionLabel>
              <h2 style={{
                margin: '8px 0 16px',
                fontSize: 'clamp(26px, 3.5vw, 36px)',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: 'var(--line-height-body)',
              }}>
                {solution.title}
              </h2>
              {solution.body.map((p, i) => (
                <p key={i} style={paraStyle}>{p}</p>
              ))}

              <ul style={{
                marginTop: 16, padding: 0, listStyle: 'none',
                display: 'grid', gap: 10,
              }}>
                {solution.bullets.map((b) => (
                  <li key={b} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    fontSize: 15, color: 'rgba(255,255,255,0.80)', lineHeight: 'var(--line-height-body)',
                  }}>
                    <CheckCircle2 size={18} color={accent} style={{ flexShrink: 0, marginTop: 1 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            {/* Results */}
            <ScrollReveal>
              <div style={{
                marginTop: 56,
                padding: 'clamp(28px, 4vw, 44px)',
                borderRadius: 'var(--radius-xl)',
                background: `linear-gradient(135deg, ${accent}10, rgba(255,255,255,0.02))`,
                border: `1px solid ${accent}30`,
              }}>
                <SectionLabel accent={accent}>نتایج</SectionLabel>
                <h2 style={{
                  margin: '8px 0 12px',
                  fontSize: 'clamp(24px, 3vw, 32px)',
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.02em',
                  lineHeight: 'var(--line-height-body)',
                }}>
                  {results.title}
                </h2>
                <p style={{ ...paraStyle, marginBottom: 28 }}>{results.body}</p>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 16,
                }}>
                  {results.stats.map((s) => (
                    <div key={s.label} style={{
                      padding: 16,
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <div style={{
                        fontSize: 'clamp(28px, 3vw, 36px)',
                        fontWeight: 700,
                        color: accent,
                        letterSpacing: '-0.02em',
                        lineHeight: 1,
                      }}>
                        <MetricCounter
                          value={s.value}
                          suffix={s.suffix}
                          decimals={s.decimals || 0}
                        />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Pull 2 */}
            {pulls[1] && (
              <ScrollReveal delay={0.05}>
                <PullQuote pull={pulls[1]} accent={accent} />
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* ╭──────────────╮
          │   FINAL CTA  │
          ╰──────────────╯ */}
      <section style={{
        position: 'relative',
        padding: '120px 24px',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <MeshGradient variant="cta" />

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{
            margin: 0,
            fontSize: 'clamp(32px, 4.5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#fff',
            lineHeight: 1.1,
          }}>
            آماده برای نوشتن شما<br />
            <span style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              داستان موفقیت خود؟
            </span>
          </h2>

          <p style={{
            margin: '20px auto 32px',
            maxWidth: 520,
            fontSize: 17,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 'var(--line-height-body)',
          }}>
            رایگان شروع کنید. هر زمان خواستید لغو کنید. اکثر تیم ها در هفته اول نتایج را می بینند.
          </p>

          <div style={{
            display: 'flex', gap: 12,
            justifyContent: 'center', flexWrap: 'wrap',
          }}>
            <Button as={Link} to="/signup" size="lg"
              style={{
                background: `linear-gradient(135deg, ${accent}, #00A8D8)`,
                color: '#0a0e14', border: 'none',
              }}>
              شروع رایگان <ArrowRight size={15} />
            </Button>
            <Button as={Link} to="/customers" size="lg" variant="ghost"
              style={{
                color: '#fff',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
              }}>
              <ArrowLeft size={15} /> همه مشتریان
            </Button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

// ── helpers ─────────────────────────────────────────────────────────
const paraStyle = {
  margin: '0 0 16px',
  fontSize: 17,
  lineHeight: 'var(--line-height-body)',
  color: 'rgba(255,255,255,0.78)',
};

function SectionLabel({ accent, children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 600,
      letterSpacing: 2, textTransform: 'uppercase',
      color: accent,
    }}>
      {children}
    </div>
  );
}

function ProfileRow({ label, value, icon }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      fontSize: 13,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
      <span style={{
        color: 'rgba(255,255,255,0.85)',
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {value} {icon}
      </span>
    </div>
  );
}

function PullQuote({ pull, accent }) {
  return (
    <figure style={{
      margin: '40px 0',
      padding: 'clamp(28px, 4vw, 40px)',
      borderRadius: 'var(--radius-xl)',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent}30`,
      borderLeft: `3px solid ${accent}`,
    }}>
      <Quote size={28} color={accent} style={{ opacity: 0.5, marginBottom: 12 }} />
      <blockquote style={{
        margin: 0,
        fontSize: 'clamp(20px, 2.4vw, 26px)',
        fontWeight: 500,
        color: '#fff',
        lineHeight: 'var(--line-height-body)',
        letterSpacing: '-0.01em',
      }}>
        “{pull.quote}”
      </blockquote>
      <figcaption style={{
        marginTop: 16,
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
      }}>
        — {pull.person}
      </figcaption>
    </figure>
  );
}
