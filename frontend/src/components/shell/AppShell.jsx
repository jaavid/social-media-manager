/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BarChart3, MessageCircle, Target, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRealtime } from '../../hooks/useRealtime';

import ModuleRail from './ModuleRail';
import FeatureSidebar from './FeatureSidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import MobileNav from './MobileNav';
import AIFloatingTrigger from '../ai/AIFloatingTrigger';
import SkipLink from '../ui/SkipLink';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageToggle from '../ui/LanguageToggle';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n';

export default function AppShell({ children, isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { isMobile } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const { language, tr } = useLanguage();

  const basePath = isAdmin ? '/admin' : '/dashboard';
  const currentModule = useMemo(() => deriveModule(location.pathname, basePath), [location.pathname, basePath]);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useRealtime((event) => {
    if (!event || !event.type) return;
    const d = event.data || {};
    switch (event.type) {
      case 'composer.post_published':
        toast.success(`Published: ${d.title || 'post'}`);
        break;
      case 'composer.post_partial':
        toast(`Published partially (${d.success_count}/${(d.success_count || 0) + (d.failed_count || 0)})`, { icon: '⚠️' });
        break;
      case 'composer.post_failed':
        toast.error(`Publish failed: ${d.title || 'post'}`);
        break;
      case 'inbox.new_message':
        if (d.preview) {
          toast(`💬 ${d.contact_name || 'New message'}: ${String(d.preview).slice(0, 80)}`, { duration: 3500 });
        }
        break;
      case 'inbox.new_review':
        toast(`⭐ New ${d.rating || ''}-star review${d.reviewer_name ? ' from ' + d.reviewer_name : ''}`, { duration: 4000 });
        break;
      case 'credential.token_expired':
        toast.error(`${d.platform || 'Platform'} token expired — please reconnect.`, { duration: 6000 });
        break;
      default:
        break;
    }
  });

  const modules = useMemo(() => {
    const all = [
      {
        id: 'analytics', label: tr('Analytics'), icon: BarChart3,
        enabled: true,
      },
      {
        id: 'messaging', label: tr('Messaging'), icon: MessageCircle,
        enabled: isAdmin || can?.('whatsapp.view'),
      },
      {
        id: 'ads', label: tr('Ads'), icon: Target,
        enabled: false, comingSoon: true,
      },
    ];
    return all.filter((m) => m.enabled || m.comingSoon || isAdmin);
  }, [isAdmin, can, language, tr]);

  const showRail = !isMobile;
  const showSidebar = !isMobile;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-page)',
        color: 'var(--text-primary)',
      }}
    >
      <SkipLink targetId="main-content" />

      {showRail && (
        <ModuleRail
          currentModule={currentModule}
          basePath={basePath}
          modules={modules}
        />
      )}

      {showSidebar && (
        <FeatureSidebar
          module={currentModule}
          basePath={basePath}
          isAdmin={isAdmin}
        />
      )}

      {isMobile && (
        <MobileDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          modules={modules}
          currentModule={currentModule}
          basePath={basePath}
        />
      )}

      {!isMobile && (
        <TopBar
          basePath={basePath}
          module={currentModule}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      )}

      {isMobile && (
        <MobileTopBar
          onMenuOpen={() => setMobileMenuOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className="main-content"
        style={{
          marginInlineStart: isMobile ? 0 : 'calc(var(--module-rail-width) + var(--feature-sidebar-width))',
          paddingTop: 'var(--topbar-height)',
          paddingBottom: isMobile ? 80 : 0,
          minHeight: '100vh',
          outline: 'none',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {isMobile && <MobileNav module={currentModule} basePath={basePath} />}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        basePath={basePath}
      />

      <AIFloatingTrigger />
    </div>
  );
}

function MobileTopBar({ onMenuOpen, onOpenPalette }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const initial = ((user?.name || user?.email || 'U').trim()[0] || 'U').toUpperCase();
  const hue = hashHue(user?.email || user?.name || '');

  return (
    <header
      className="ds-mobile-topbar"
      style={{
        position: 'fixed',
        top: 0, insetInlineStart: 0, insetInlineEnd: 0,
        height: 'var(--topbar-height)',
        zIndex: 150,
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <button type="button" onClick={onMenuOpen} aria-label={t('common.openMenu', 'Open menu')} style={iconBtn}>
        <Menu size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label={t('common.search', 'Search')}
        style={{
          flex: 1, minWidth: 0,
          height: 36,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-tertiary)',
          fontSize: 13,
          minHeight: 'unset',
          textAlign: 'start',
        }}
      >
        {t('common.search', 'Search anything…')}
      </button>
      <LanguageToggle />
      <ThemeToggle size="sm" />
      <div style={{
        width: 32, height: 32,
        borderRadius: 999,
        background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 50) % 360},65%,45%))`,
        color: '#fff', fontWeight: 700, fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {initial}
      </div>
    </header>
  );
}

function MobileDrawer({ open, onClose, modules, currentModule, basePath }) {
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const { isPersian, t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    const timer = setTimeout(() => {
      const first = drawerRef.current?.querySelector('button, [href]');
      first?.focus?.();
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={`mobile-drawer-backdrop ${open ? 'open' : ''}`}
        aria-hidden
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('common.navigation', 'Navigation drawer')}
        aria-hidden={!open}
        style={{
          position: 'fixed',
          top: 0, bottom: 0,
          insetInlineStart: 0,
          width: 'min(82vw, 320px)',
          zIndex: 300,
          background: 'var(--surface-card)',
          borderInlineEnd: '1px solid var(--border-subtle)',
          transform: open ? 'translateX(0)' : isPersian ? 'translateX(100%)' : 'translateX(-100%)',
          transition: 'transform var(--transition-default)',
          display: 'flex', flexDirection: 'column',
          boxShadow: open ? 'var(--shadow-lg)' : 'none',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t('common.navigation', 'Navigation')}</strong>
          <button type="button" onClick={onClose} aria-label={t('common.closeMenu', 'Close menu')} style={iconBtn}>
            <X size={16} />
          </button>
        </header>

        <div style={{
          padding: '10px 12px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          {modules.map((m) => {
            const Icon = m.icon;
            const active = m.id === currentModule;
            const disabled = !m.enabled || m.comingSoon;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => { if (!disabled) { navigate(`${basePath}/${m.id}`); onClose(); } }}
                style={{
                  padding: 12,
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--brand-gradient)' : 'var(--surface-sunken)',
                  color: active ? '#fff' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                  minHeight: 'unset',
                }}
              >
                <Icon size={18} />
                {m.label}
                {m.comingSoon && <span style={{ fontSize: 9, opacity: 0.7 }}>{t('common.soon', 'Soon')}</span>}
              </button>
            );
          })}
        </div>

        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          <FeatureSidebar module={currentModule} basePath={basePath} />
        </div>
      </div>
    </>
  );
}

function deriveModule(pathname, basePath) {
  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const seg = rest.split('/').filter(Boolean)[0];
  if (seg === 'analytics' || seg === 'messaging' || seg === 'ads') return seg;
  return 'analytics';
}

function hashHue(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}

const iconBtn = {
  width: 36, height: 36,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  flexShrink: 0,
  minHeight: 'unset', minWidth: 'unset',
  padding: 0,
};
