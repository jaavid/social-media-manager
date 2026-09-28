/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CalendarDays, AlertCircle,
  Inbox, Send, Users2, FileType,
  Rocket,
} from 'lucide-react';
import { useLanguage } from '../../i18n';

export default function MobileNav({ module, basePath }) {
  const location = useLocation();
  const { tr } = useLanguage();
  const tabs = MOBILE_TABS[module] || MOBILE_TABS.analytics;

  return (
    <nav
      className="mobile-bottom-nav ds-mobile-nav"
      aria-label={`${tr(module === 'analytics' ? 'Analytics' : module === 'messaging' ? 'Messaging' : 'Ads')} bottom tabs`}
      style={{
        position: 'fixed',
        bottom: 0, insetInlineStart: 0, insetInlineEnd: 0,
        zIndex: 150,
        background: 'var(--surface-card)',
        borderTop: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {tabs.map((tab) => {
        const to = `${basePath}/${module}${tab.path}`;
        const active = tab.end ? location.pathname === to : location.pathname.startsWith(to);
        const Icon = tab.icon;
        const label = tr(tab.label);
        return (
          <NavLink
            key={tab.path || tab.label}
            to={to}
            end={tab.end}
            aria-label={label}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4,
              textDecoration: 'none',
              color: active ? 'var(--brand-primary-hover)' : 'var(--text-tertiary)',
              fontSize: 10, fontWeight: 600,
              transition: 'var(--transition-fast)',
              WebkitTapHighlightColor: 'transparent',
              minHeight: 'unset',
              minWidth: 'unset',
            }}
          >
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 28,
              borderRadius: 999,
              background: active ? 'var(--brand-primary-glow)' : 'transparent',
              transition: 'var(--transition-fast)',
            }}>
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

const MOBILE_TABS = {
  analytics: [
    { label: 'Home', icon: LayoutDashboard, path: '/dashboard', end: true },
    { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
    { label: 'Reports', icon: FileText, path: '/reports' },
    { label: 'Alerts', icon: AlertCircle, path: '/alerts' },
  ],
  messaging: [
    { label: 'Inbox', icon: Inbox, path: '/inbox' },
    { label: 'Campaigns', icon: Send, path: '/campaigns' },
    { label: 'Templates', icon: FileType, path: '/templates' },
    { label: 'Contacts', icon: Users2, path: '/contacts' },
  ],
  ads: [
    { label: 'Soon', icon: Rocket, path: '' },
  ],
};
