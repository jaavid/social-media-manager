/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import ErrorBoundary from '@/components/ui/ErrorBoundary';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Sheet from '../ui/Drawer';
import { cn } from '../../lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useAppLocation as useLocation,
  useAppNavigate as useNavigate,
} from '../../core/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BarChart3, MessageCircle, Target, Menu, X, Search } from 'lucide-react';
import toast from '../ui/toast';
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
import { useSession as useAuth } from '../../core/session';
import { useLanguage } from '../../i18n';
export default function AppShell({ children, isAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { isMobile } = useBreakpoint();
  const reducedMotion = useReducedMotion();
  const { language, tr } = useLanguage();
  const basePath = isAdmin ? '/admin' : '/dashboard';
  const currentModule = useMemo(
    () => deriveModule(location.pathname, basePath),
    [location.pathname, basePath],
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  useRealtime((event) => {
    if (!event || !event.type) return;
    const d = event.data || {};
    switch (event.type) {
      case 'composer.post_published':
        toast.success(`Published: ${d.title || 'post'}`);
        break;
      case 'composer.post_partial':
        toast(
          `Published partially (${d.success_count}/${(d.success_count || 0) + (d.failed_count || 0)})`,
          {
            icon: '⚠️',
          },
        );
        break;
      case 'composer.post_failed':
        toast.error(`Publish failed: ${d.title || 'post'}`);
        break;
      case 'inbox.new_message':
        if (d.preview) {
          toast(
            `💬 ${d.contact_name || 'New message'}: ${String(d.preview).slice(0, 80)}`,
            {
              duration: 3500,
            },
          );
        }
        break;
      case 'inbox.new_review':
        toast(
          `⭐ New ${d.rating || ''}-star review${d.reviewer_name ? ' from ' + d.reviewer_name : ''}`,
          {
            duration: 4000,
          },
        );
        break;
      case 'credential.token_expired':
        toast.error(
          `${d.platform || 'Platform'} token expired — please reconnect.`,
          {
            duration: 6000,
          },
        );
        break;
      default:
        break;
    }
  });
  const modules = useMemo(() => {
    const all = [
      {
        id: 'analytics',
        label: tr('Analytics'),
        icon: BarChart3,
        enabled: true,
      },
      {
        id: 'messaging',
        label: tr('Messaging'),
        icon: MessageCircle,
        enabled: isAdmin || can?.('whatsapp.view'),
      },
      {
        id: 'ads',
        label: tr('Ads'),
        icon: Target,
        enabled: false,
        comingSoon: true,
      },
    ];
    return all.filter((m) => m.enabled || m.comingSoon || isAdmin);
  }, [isAdmin, can, language, tr]);
  const showRail = !isMobile;
  const showSidebar = !isMobile;
  return (
    <div
      className={cn(
        '[min-height:100vh]',
        '[background:var(--surface-page)]',
        '[color:var(--text-primary)]',
      )}
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
        className={cn(
          'main-content',
          isMobile
            ? '[margin-inline-start:0]'
            : '[margin-inline-start:calc(var(--module-rail-width)_+_var(--feature-sidebar-width))]',
          '[padding-top:var(--topbar-height)]',
          isMobile ? '[padding-bottom:80px]' : '[padding-bottom:0]',
          '[min-height:100vh]',
          '[outline:none]',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 8,
                  }
            }
            animate={
              reducedMotion
                ? {}
                : {
                    opacity: 1,
                    y: 0,
                  }
            }
            exit={
              reducedMotion
                ? {}
                : {
                    opacity: 0,
                    y: -4,
                  }
            }
            transition={
              reducedMotion
                ? {
                    duration: 0,
                  }
                : {
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }
            }
          >
            <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
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
  const initial = (
    (user?.name || user?.email || 'U').trim()[0] || 'U'
  ).toUpperCase();
  const hue = hashHue(user?.email || user?.name || '');
  return (
    <header
      className={cn(
        'ds-mobile-topbar',
        '[position:fixed]',
        '[top:0]',
        '[inset-inline-start:0]',
        '[inset-inline-end:0]',
        '[height:var(--topbar-height)]',
        '[z-index:150]',
        '[background:var(--surface-card)]',
        '[border-bottom:1px_solid_var(--border-subtle)]',
        '[display:flex]',
        '[align-items:center]',
        '[gap:8px]',
        '[padding:0_12px]',
        '[padding-top:env(safe-area-inset-top)]',
      )}
    >
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label={t('common.openMenu', 'Open menu')}
        className={cn(
          '[width:36px]',
          '[height:36px]',
          '[display:inline-flex]',
          '[align-items:center]',
          '[justify-content:center]',
          '[border:0]',
          '[border-radius:var(--radius-md)]',
          '[background:var(--surface-card)]',
          '[color:var(--text-primary)]',
          '[cursor:pointer]',
          '[flex-shrink:0]',
          '[min-height:unset]',
          '[min-width:unset]',
          '[padding:0]',
        )}
      >
        <Menu size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={onOpenPalette}
        aria-label={t('common.search', 'Search')}
        className={cn(
          '[flex:1]',
          '[min-width:0]',
          '[height:36px]',
          '[display:flex]',
          '[align-items:center]',
          '[gap:8px]',
          '[padding:0_12px]',
          '[background:var(--surface-sunken)]',
          '[border:0]',
          '[border-radius:var(--radius-md)]',
          '[color:var(--text-tertiary)]',
          '[font-size:13px]',
          '[min-height:unset]',
          '[text-align:start]',
        )}
      >
        <Search size={16} className="shrink-0" aria-hidden />
        <span className="hidden min-[480px]:inline truncate">{t('common.search', 'Search anything…')}</span>
      </button>
      <LanguageToggle variant="ghost" />
      <ThemeToggle variant="ghost" />
      <div
        className={cn(
          '[width:32px]',
          '[height:32px]',
          '[border-radius:999px]',
          '[background:var(--brand-gradient)]',
          '[color:var(--text-on-brand)]',
          '[font-weight:700]',
          '[font-size:12px]',
          '[display:flex]',
          '[align-items:center]',
          '[justify-content:center]',
          '[flex-shrink:0]',
        )}
      >
        {initial}
      </div>
    </header>
  );
}
function MobileDrawer({ open, onClose, modules, currentModule, basePath }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        side="start"
        width={320}
        title={t('common.navigation', 'Navigation')}
      >
        <div
          className={cn(
            '[padding:10px_12px]',
            '[display:grid]',
            '[grid-template-columns:1fr_1fr_1fr]',
            '[gap:8px]',
            '[border-bottom:1px_solid_var(--border-subtle)]',
          )}
        >
          {modules.map((m) => {
            const Icon = m.icon;
            const active = m.id === currentModule;
            const disabled = !m.enabled || m.comingSoon;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    navigate(`${basePath}/${m.id}`);
                    onClose();
                  }
                }}
                className={cn(
                  '[padding:12px]',
                  '[border:1px_solid_var(--border-subtle)]',
                  '[border-radius:var(--radius-md)]',
                  active
                    ? '[background:var(--brand-gradient)]'
                    : '[background:var(--surface-sunken)]',
                  active
                    ? '[color:var(--text-on-brand)]'
                    : disabled
                      ? '[color:var(--text-tertiary)]'
                      : '[color:var(--text-primary)]',
                  '[display:flex]',
                  '[flex-direction:column]',
                  '[align-items:center]',
                  '[gap:6px]',
                  '[font-size:12px]',
                  '[font-weight:600]',
                  disabled ? '[cursor:not-allowed]' : '[cursor:pointer]',
                  disabled ? '[opacity:0.6]' : '[opacity:1]',
                  '[min-height:unset]',
                )}
              >
                <Icon size={18} />
                <span className="text-xs leading-relaxed">{m.label}</span>
                {m.comingSoon && (
                  <span className={cn('[font-size:9px]', '[opacity:0.7]')}>
                    {t('common.soon', 'Soon')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={cn('sidebar-scroll', '[flex:1]', '[overflow-y:auto]')}>
          <FeatureSidebar module={currentModule} basePath={basePath} />
        </div>
      </Sheet>
    </>
  );
}
function deriveModule(pathname, basePath) {
  const rest = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  const seg = rest.split('/').filter(Boolean)[0];
  if (seg === 'analytics' || seg === 'messaging' || seg === 'ads') return seg;
  return 'analytics';
}
function hashHue(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++)
    h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % 360;
}
