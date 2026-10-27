import { routeIsActive } from '../../lib/runtime/navigation';
import useNavigationAccess from '../../hooks/useNavigationAccess';
import { visibleSections, navigationHref, navigationText } from './navigationItems';
import useWorkspaceScope from '../../hooks/useWorkspaceScope';
import {
  AppNavLink as NavLink,
  useAppLocation as useLocation,
} from '../../core/navigation';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';
export default function MobileNav({ module, basePath }) {
  const location = useLocation();
  const language = useLanguage();
  const { tr, t } = language;
  const can = useNavigationAccess();
  const { workspaceId } = useWorkspaceScope();
  const priorities = module === 'messaging' ? ['/inbox', '/campaigns', '/templates', '/contacts'] : ['/dashboard', '/composer', '/inbox', '/reports'];
  const items = visibleSections(module, basePath, can).flatMap(section => section.items);
  const tabs = priorities.map(path => items.find(item => item.path === path)).filter(Boolean);
  if (!tabs.length) return null;
  return (
    <nav
      className="mobile-bottom-nav ds-mobile-nav fixed inset-x-3 bottom-3 z-150 flex h-16 items-stretch overflow-x-auto rounded-2xl border border-border/70 bg-card/92 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-2xl"
      aria-label={`${module === 'analytics' ? t('nav.workspaceTools') : tr(module === 'messaging' ? 'Messaging' : 'Ads')} ${tr('bottom tabs')}`}
    >
      {tabs.map((tab) => {
        const to = navigationHref(basePath, module, tab, workspaceId);
        const active = routeIsActive(to, location.pathname, tab.end);
        const Icon = tab.icon;
        const label = navigationText(tab.label, language);
        return (
          <NavLink
            key={tab.path || tab.label}
            to={to}
            end={tab.end}
            aria-label={label}
            className={cn(
              'group relative flex min-h-0 min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold no-underline transition',
              active
                ? 'text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-9 place-items-center rounded-xl transition',
                active
                  ? 'bg-primary/12 shadow-sm'
                  : 'bg-transparent group-hover:bg-muted',
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="whitespace-nowrap px-1">{label}</span>
            {active && (
              <span
                className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-primary"
                aria-hidden
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
