import useNavigationAccess from '../../hooks/useNavigationAccess';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { cn } from '../../lib/utils';
import { useEffect, useId, useState } from 'react';
import {
  AppNavLink as NavLink,
  useAppLocation as useLocation,
  useAppNavigate as useNavigate,
} from '../../core/navigation';
import { ChevronDown, Rocket } from 'lucide-react';
import { NAV_SETS, visibleSections, navigationHref, navigationText } from './navigationItems';
import { routeIsActive } from '../../lib/runtime/navigation';
import useWorkspaceScope, { useScopedBadgeCount as useBadgeCount } from '../../hooks/useWorkspaceScope';
import { useLanguage } from '../../i18n';
import { useWorkspaces } from '../../hooks/useData';
export default function FeatureSidebar({
  module,
  basePath,
  isAdmin = false,
}) {
  const location = useLocation();
  const language = useLanguage();
  const { isPersian, tr, t } = language;
  const can = useNavigationAccess();
  const { workspaceId } = useWorkspaceScope();
  const text = value => navigationText(value, language);
  const sections = visibleSections(module, basePath, can);
  const navSet = NAV_SETS[module] || NAV_SETS.analytics;
  return (
    <aside
      aria-label={`${text(navSet.label)} ${tr('navigation')}`}
      className={cn(
        'ds-feature-sidebar',
        '[position:fixed]',
        '[top:0]',
        '[bottom:0]',
        '[inset-inline-start:var(--module-rail-width)]',
        '[width:var(--feature-sidebar-width)]',
        '[z-index:90]',
        '[background:var(--surface-card)]',
        '[border-inline-end:1px_solid_var(--border-subtle)]',
        '[display:flex]',
        '[flex-direction:column]',
      )}
    >
      <header
        className={cn(
          '[height:var(--topbar-height)]',
          '[flex-shrink:0]',
          '[padding:0_16px]',
          '[display:flex]',
          '[align-items:center]',
          '[gap:8px]',
          '[border-bottom:1px_solid_var(--border-subtle)]',
        )}
      >
        <div
          className={cn(
            '[width:28px]',
            '[height:28px]',
            '[border-radius:var(--radius-sm)]',
            '[background:var(--brand-primary-glow)]',
            '[color:var(--brand-primary-hover)]',
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:center]',
          )}
        >
          {navSet.icon && <navSet.icon size={15} strokeWidth={2.4} />}
        </div>
        <div>
          <div
            className={cn(
              '[font-size:14px]',
              '[font-weight:600]',
              '[color:var(--text-primary)]',
              '[letter-spacing:-0.01em]',
            )}
          >
            {text(navSet.label)}
          </div>
          {navSet.subtitle && (
            <div
              className={cn('[font-size:11px]', '[color:var(--text-tertiary)]')}
            >
              {text(navSet.subtitle)}
            </div>
          )}
        </div>
      </header>

      <WorkspaceIdentity />
      <div
        className={cn(
          'sidebar-scroll',
          '[flex:1]',
          '[min-height:0]',
          '[overflow-y:auto]',
          '[padding:12px_10px]',
        )}
      >
        {navSet.empty ? (
          <EmptyModule message={tr(navSet.empty)} />
        ) : (
          sections.map((section) => (
            <Section key={`${module}/${section.title}`} title={text(section.title)}
              pathname={location.pathname}
              active={section.items.some(item => routeIsActive(navigationHref(basePath, module, item, workspaceId), location.pathname, item.end))}>
              {section.items.map(item => <NavItem key={item.path}
                to={navigationHref(basePath, module, item, workspaceId)} icon={item.icon}
                label={text(item.label)} end={item.end} badge={item.badge}
                badgeKey={item.badgeKey} pathname={location.pathname} isPersian={isPersian} />)}
            </Section>
          ))

        )}
        <details className="m-2 rounded-lg border border-border p-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">{t('nav.future')}</summary>
          <p className="mt-2">{t('nav.adsHelp')}</p>
          <p>{tr('Webhooks')} — {t('nav.notReady')}</p>
        </details>
      </div>

      <p className="px-3 py-2 text-xs text-muted-foreground">{t('nav.accessHelp')}</p>

    </aside>
  );
}
function NavItem({
  to,
  icon: Icon,
  label,
  end,
  badge,
  badgeKey,
  pathname,
  disabled,
  isPersian,
}) {
  const liveBadge = useBadgeCount(badgeKey || '__none__');
  const effectiveBadge = badge ?? (badgeKey ? liveBadge : 0);
  const isActive = routeIsActive(to, pathname, end);
  if (disabled) {
    return (
      <div
        className={cn(
          '[display:flex]',
          '[align-items:center]',
          '[gap:10px]',
          '[height:36px]',
          '[padding:0_12px]',
          '[border-radius:var(--radius-md)]',
          '[font-size:13px]',
          '[font-weight:500]',
          '[text-decoration:none]',
          '[cursor:pointer]',
          '[transition:var(--transition-fast)]',
          '[color:var(--text-tertiary)]',
          '[cursor:not-allowed]',
          '[opacity:0.55]',
        )}
      >
        <Icon size={16} strokeWidth={2} />
        <span className={cn('[flex:1]')}>{label}</span>
      </div>
    );
  }
  return (
    <NavLink
      to={to}
      end={end}
      className={cn(
        cn(
          '[display:flex]',
          '[align-items:center]',
          '[gap:10px]',
          '[height:36px]',
          '[padding:0_12px]',
          '[border-radius:var(--radius-md)]',
          '[font-size:13px]',
          '[font-weight:500]',
          '[text-decoration:none]',
          '[cursor:pointer]',
          '[transition:var(--transition-fast)]',
          isActive
            ? '[color:var(--text-primary)]'
            : '[color:var(--text-secondary)]',
          isActive
            ? '[background:var(--brand-primary-glow)]'
            : '[background:transparent]',
          isActive
            ? '[border-inline-start:2px_solid_var(--brand-primary)]'
            : '[border-inline-start:2px_solid_transparent]',
          isActive ? '[font-weight:600]' : '[font-weight:500]',
        ),
        'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <Icon size={16} strokeWidth={2} />
      <span
        className={cn(
          '[flex:1]',
          '[min-width:0]',
          '[overflow:hidden]',
          '[text-overflow:ellipsis]',
          '[white-space:nowrap]',
        )}
      >
        {label}
      </span>
      {!!effectiveBadge && effectiveBadge > 0 && (
        <span
          className={cn(
            '[min-width:18px]',
            '[padding:0_5px]',
            '[background:var(--brand-primary-hover)]',
            '[color:var(--text-on-brand)]',
            '[font-size:10px]',
            '[font-weight:700]',
            '[line-height:16px]',
            '[height:16px]',
            '[border-radius:999px]',
            '[text-align:center]',
          )}
        >
          {effectiveBadge > 99 ? '99+' : effectiveBadge}
        </span>
      )}
    </NavLink>
  );
}
function Section({ title, children, active, pathname }) {
  const [open, setOpen] = useState(active);
  const contentId = useId();

  useEffect(() => {
    if (active) setOpen(true);
  }, [active, pathname]);

  return (
    <div className={cn('[margin-bottom:4px]')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
          '[display:flex]',
          '[align-items:center]',
          '[justify-content:space-between]',
          '[width:100%]',
          '[min-height:36px]',
          '[border-radius:var(--radius-md)]',
          '[text-align:start]',
          '[font-size:11px]',
          '[font-weight:600]',
          '[text-transform:uppercase]',
          '[letter-spacing:0.6px]',
          '[color:var(--text-tertiary)]',
          '[padding:6px_10px_8px]',
        )}
      >
        {title}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={cn('transition-transform', !open && '-rotate-90 rtl:rotate-90')}
        />
      </button>
      <div
        id={contentId}
        hidden={!open}
        className={cn('[display:flex]', '[flex-direction:column]', '[gap:1px]')}
        style={!open ? { display: 'none' } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
function EmptyModule({ message }) {
  return (
    <div
      className={cn(
        '[padding:40px_16px]',
        '[text-align:center]',
        '[color:var(--text-tertiary)]',
        '[font-size:12px]',
      )}
    >
      <Rocket
        size={28}
        strokeWidth={1.5}
        className={cn('[margin-bottom:8px]')}
      />
      <div>{message}</div>
    </div>
  );
}
/** Read-only current workspace label; the Shell owns the interactive selector. */
function WorkspaceIdentity() {
  const { workspaceId } = useWorkspaceScope();
  const { workspaces = [], error } = useWorkspaces();
  const { t } = useLanguage();
  const selected = !error && workspaces.find(row => row.id === workspaceId);
  const label = selected ? selected.display_name || selected.company || selected.name || t('nav.unknownWorkspace')
    : t(workspaceId ? 'nav.unknownWorkspace' : 'nav.noWorkspace');
  return <section data-workspace-context aria-label={t('nav.workspace')} className="grid min-w-0 gap-1 border-b border-border px-3 py-3">
    <span className="text-xs text-muted-foreground">{t('nav.workspace')}</span>
    <strong className="break-words text-sm"><bdi>{label}</bdi></strong>
  </section>;
}
