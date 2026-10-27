import AccountControls from './AccountControls';
import useWorkspaceScope from '@/hooks/useWorkspaceScope';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useLanguage } from '../../i18n';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * EndUserShell — layout wrapper for the end-user (B2C) experience under /u.
 *
 * Distinct from the agency-side AppShell: lighter sidebar, friendlier copy,
 * and only the navigation that's relevant to a workspace owner. Pages that
 * are not yet built (later marketplace stages) are listed with `comingSoon`.
 */
import { useEffect, useRef, useState } from 'react';
import { AppNavLink as NavLink, useAppLocation as useLocation } from '../../core/navigation';
import {
  LayoutDashboard, CalendarDays,
  Building2, Plug, ShieldCheck, ClipboardCheck, Search,
  Sparkles, Bell, Menu,
} from 'lucide-react';

import { useSession as useAuth } from '../../core/session';
import Drawer from '@/components/ui/Drawer';
import WorkspaceContext from '@/components/shell/WorkspaceContext';

const SECTIONS = [
  { title: 'nav.overview', items: [{ to: '/u', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { title: 'nav.content', items: [{ to: '/u/calendar', label: 'Calendar', icon: CalendarDays, scoped: true }] },
  { title: 'nav.management', items: [
    { to: '/u/organizations', label: 'nav.organizations', icon: Building2 },
    { to: '/u/connections', label: 'Connections', icon: Plug, scoped: true },
    { to: '/u/approvals', label: 'nav.approvalRequests', icon: ClipboardCheck },
    { to: '/u/activity', label: 'nav.activity', icon: ShieldCheck },
    { to: '/u/agency', label: 'My agency', icon: Building2 },
    { to: '/u/notifications', label: 'Notifications', icon: Bell },
  ] },
  { title: 'nav.discover', items: [{ to: '/u/agency/find', label: 'Find an agency', icon: Search, end: true }] },
];
const FUTURE = ['Posts', 'nav.createPost', 'Inbox', 'Analytics', 'Reports', 'Settings', 'Billing'];

export default function EndUserShell({ children }) {
  const { tr, t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const { workspaceId } = useWorkspaceScope();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuTrigger = useRef(null);
  const text = value => value.startsWith('nav.') ? t(value) : tr(value);
  // Close mobile drawer on route change
  useEffect(() => { void Promise.resolve().then(() => setMobileOpen(false)); }, [location.pathname, location.search]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-page)' }} className="eu-shell">
      {/* Mobile top-bar — visible only at narrow widths */}
      <header className="eu-mobile-bar" style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'none',
        alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <button
          ref={menuTrigger} type="button" onClick={() => setMobileOpen(true)} aria-label={tr("Open menu")}
          style={{
            width: 36, height: 36, padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--text-primary)',
            border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          <Menu size={18} />
        </button>
        <span style={{
          width: 26, height: 26, background: 'var(--brand-gradient)', color: '#fff',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={13} strokeWidth={2.4} />
        </span>
        <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{tr("Ravinta")}</strong>
      </header>

      <aside aria-label={tr('End-user navigation')} className="eu-sidebar"
        style={{ width: 240, background: 'var(--surface-card)', borderInlineEnd: '1px solid var(--border-subtle)',
          padding: 14, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{
            width: 28, height: 28,
            background: 'var(--brand-gradient)',
            borderRadius: 'var(--radius-sm)',
            color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={14} strokeWidth={2.4} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{tr("Ravinta")}</div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{tr("Personal account")}</div>
          </div>
        </div>

        <WorkspaceContext />
        <EndUserMenu workspaceId={workspaceId} text={text} t={t} />

        {user && (
          <div style={{
            padding: 10,
            background: 'var(--surface-sunken)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              <bdi dir="auto">{user.first_name || user.email}</bdi>
            </div>
            <div style={{ color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <bdi dir="ltr">{user.email}</bdi>
            </div>
            <AccountControls key={user.id} />
          </div>
        )}
      </aside>

      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} side="start" width="min(320px, 100vw)"
        title={tr('End-user navigation')} returnFocusRef={menuTrigger}>
        <WorkspaceContext />
        <EndUserMenu workspaceId={workspaceId} text={text} t={t} />
        {user && <AccountControls key={user.id} />}
      </Drawer>
      <main style={{ flex: 1, minWidth: 0, padding: 28 }} className="eu-main">
        <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
      </main>

      <style>{`
        @media (max-width: 880px) {
          .eu-shell { flex-direction: column; }
          .eu-mobile-bar { display: flex !important; }
          .eu-main { padding: 18px 14px !important; }
          .eu-sidebar { display: none !important; }

        }
      `}</style>
    </div>
  );
}

function EndUserMenu({ workspaceId, text, t }) {
  return <nav className="grid gap-4 overflow-y-auto" aria-label={t('nav.workspaceTools')}>
    {SECTIONS.map(section => <section key={section.title}>
      <h2 className="px-2 py-1 text-xs font-semibold text-muted-foreground">{text(section.title)}</h2>
      {section.items.filter(item => !item.scoped || workspaceId).map(item => <NavRow key={item.to} {...item}
        label={text(item.label)} to={item.scoped ? `${item.to}?workspace=${workspaceId}` : item.to} />)}
    </section>)}
    {!workspaceId && <p className="px-2 text-xs text-muted-foreground">{t('nav.selectHelp')}</p>}
    <details className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-semibold">{t('nav.future')}</summary>
      <p className="mt-2 leading-relaxed">{t('nav.futureHelp')}</p>
      <ul className="mt-2 grid gap-1">{FUTURE.map(label => <li key={label}>{text(label)} — {t('nav.notReady')}</li>)}</ul>
    </details>
  </nav>;
}

function NavRow({ to, label, icon: Icon, end }) {
  return <NavLink to={to} end={end} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline focus-visible:ring-2 focus-visible:ring-ring"
    style={({ isActive }) => ({ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: isActive ? 'var(--brand-primary-glow)' : 'transparent', fontWeight: isActive ? 600 : 500 })}>
    <Icon size={15} aria-hidden="true" /><span>{label}</span>
  </NavLink>;
}
