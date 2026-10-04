/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Link from './MarketingLink';
import Logo from '../ui/Logo';
import { Github, Linkedin, Twitter, Youtube, Sparkles } from 'lucide-react';
export default function MarketingFooter() {
  const year = new Date().getFullYear();

  const COLUMNS = [
    {
      title: 'Product',
      links: [
        { label: 'Analytics',     to: '/product/analytics' },
        { label: 'Composer',      to: '/product/composer' },
        { label: 'Inbox',         to: '/product/inbox' },
        { label: 'WhatsApp',      to: '/product/whatsapp' },
        { label: 'Bot Builder',   to: '/product/bot-builder' },
        { label: 'AI Studio',     to: '/product/ai' },
        { label: 'Reports',       to: '/product/reports' },
        { label: 'Automations',   to: '/product/automations' },
        { label: 'Marketplace',   to: '/product/marketplace-product' },
      ],
    },
    {
      title: 'Solutions',
      links: [
        { label: 'For Agencies',   to: '/solutions/agencies' },
        { label: 'For Businesses', to: '/solutions/businesses' },
        { label: 'Real Estate',    to: '/solutions/real-estate' },
        { label: 'Healthcare',     to: '/solutions/clinics' },
        { label: 'Restaurants',    to: '/solutions/restaurants' },
        { label: 'Creators',       to: '/solutions/creators' },
        { label: 'E-commerce',     to: '/solutions/ecommerce' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Customers',     to: '/customers' },
        { label: 'Blog',          to: '/blog' },
        { label: 'Help Center',   to: '/help' },
        { label: 'Changelog',     to: '/changelog' },
        { label: 'Status',        to: '/status' },
        { label: 'Integrations',  to: '/integrations' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About',     to: '/about' },
        { label: 'Customers', to: '/customers' },
        { label: 'Contact',   to: '/contact' },
        { label: 'Press',     to: '/about#press' },
        { label: 'Careers',   to: '/about#careers' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy',         to: '/privacy' },
        { label: 'Terms',           to: '/terms' },
        { label: 'Cookies',         to: '/cookies' },
        { label: 'GDPR',            to: '/gdpr' },
        { label: 'DPDP',            to: '/dpdp' },
        { label: 'Security',        to: '/security' },
      ],
    },
  ];

  return (
    <footer
      style={{
        marginTop: 80,
        background: 'var(--surface-card)',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-2xl)',
          margin: '0 auto',
          padding: '64px 32px 32px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) repeat(5, minmax(0, 1fr))',
            gap: 40,
          }}
          className="mkt-footer-grid"
        >
          {/* Brand column */}
          <div>
            <Logo variant="horizontal" height={28} />
            <p style={{
              margin: '14px 0 16px',
              fontSize: 13, lineHeight: 1.6,
              color: 'var(--text-secondary)',
              maxWidth: 280,
            }}>
              The AI marketing OS for modern agencies. Analytics, content, conversations, and ads — for every client, in one place.
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <SocialIconLink href="https://github.com/socialstats"            label="GitHub"   icon={Github} />
              <SocialIconLink href="https://linkedin.com/company/socialstats"  label="LinkedIn" icon={Linkedin} />
              <SocialIconLink href="https://twitter.com/socialstats"           label="Twitter"  icon={Twitter} />
              <SocialIconLink href="https://youtube.com/@socialstats"          label="YouTube"  icon={Youtube} />
            </div>
            {/* Geographic framing intentionally omitted from the global footer.
                Office and contact information lives on /contact and /dpdp. */}
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 style={{
                margin: '0 0 12px',
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}>{col.title}</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link className="mkt-footer-link"
                      to={l.to}
                      style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        transition: 'var(--transition-fast)',
                      }}
                    >{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          fontSize: 12, color: 'var(--text-tertiary)',
        }}>
          <span>© {year} SocialStats. All rights reserved.</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/status" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--text-tertiary)', textDecoration: 'none',
            }}>
              <span aria-hidden style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 8px rgba(16,185,129,0.6)',
              }} />
              All systems operational
            </Link>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: 'var(--text-tertiary)',
            }}>
              <Sparkles size={11} /> Built with Social Stats
            </span>
          </div>
        </div>

        <style>{`
          .mkt-footer-link:hover { color: var(--text-primary) !important; }
          @media (max-width: 1100px) {
            .mkt-footer-grid {
              grid-template-columns: 1fr 1fr 1fr !important;
            }
            .mkt-footer-grid > div:first-child { grid-column: 1 / -1; }
          }
          @media (max-width: 640px) {
            .mkt-footer-grid { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>
      </div>
    </footer>
  );
}

function SocialIconLink({ href, label, icon: Icon }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32,
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-tertiary)',
        background: 'var(--surface-card)',
        transition: 'var(--transition-fast)',
        textDecoration: 'none',
      }}
    >
      <Icon size={14} strokeWidth={2} />
    </a>
  );
}
