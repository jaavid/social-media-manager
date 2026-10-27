import WorkspaceContext from './WorkspaceContext';
import {
  AppLink as Link,
  useAppLocation as useLocation,
} from '../../core/navigation';
import {
  ChevronRight,
  Search,
} from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../ui/NotificationBell';
import LanguageToggle from '../ui/LanguageToggle';
import { useSession as useAuth } from '../../core/session';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';
export default function TopBar({ basePath, onOpenPalette }) {
  const location = useLocation();
  const { user } = useAuth();
  const { isPersian, t, tr } = useLanguage();
  const crumbs = buildBreadcrumbs(location.pathname, basePath);
  const isMac =
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  return (
    <header className="ds-topbar fixed inset-x-0 top-0 z-80 ms-[calc(var(--module-rail-width)+var(--feature-sidebar-width))] flex h-[var(--topbar-height)] items-center gap-2 border-b border-border/70 bg-card/90 px-3 xl:gap-3 xl:px-5 backdrop-blur-xl">
      <WorkspaceSwitcher user={user} basePath={basePath} />

      <nav
        aria-label={t('common.navigation', 'Breadcrumb')}
        className="hidden min-w-0 items-center gap-1.5 2xl:flex"
      >
        {crumbs.map((c, i) => {
          const label = tr(c.label);
          return (
            <span
              key={`${c.label}-${i}`}
              className="inline-flex min-w-0 items-center gap-1.5"
            >
              {i > 0 && (
                <ChevronRight
                  size={12}
                  className={cn(
                    'shrink-0 text-muted-foreground',
                    isPersian && 'rotate-180',
                  )}
                />
              )}
              {i === crumbs.length - 1 ? (
                <span className="max-w-56 truncate text-[13px] font-semibold text-foreground">
                  {label}
                </span>
              ) : c.to ? (
                <Link
                  to={c.to}
                  className="whitespace-nowrap text-[13px] text-muted-foreground no-underline transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  {label}
                </span>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenPalette}
        aria-label={t('common.search', 'Open command palette')}
        className="group flex h-9 min-w-9 flex-[0_1_260px] items-center gap-2 rounded-lg border-0 bg-muted/70 px-3 text-[13px] font-medium text-muted-foreground transition hover:border-border hover:bg-accent hover:text-foreground"
      >
        <Search size={14} className="shrink-0" />
        <span className="hidden flex-1 truncate text-start xl:block">
          {t('common.search', 'Search anything…')}
        </span>
        <kbd className="hidden rounded bg-card px-1.5 py-0.5 text-[11px] leading-relaxed text-muted-foreground xl:block">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        <LanguageToggle variant="ghost" />
        <ThemeToggle size="md" variant="ghost" />
        <NotificationBellWrapper />
      </div>

    </header>
  );
}
function WorkspaceSwitcher({ basePath }) {
  return <div className="min-w-0 max-w-64"><WorkspaceContext basePath={basePath} compact /></div>;
}
function NotificationBellWrapper() {
  try {
    return <NotificationBell variant="ghost" />;
  } catch {
    return null;
  }
}
function buildBreadcrumbs(pathname, basePath) {
  const rest = pathname.startsWith(basePath)
    ? pathname.slice(basePath.length)
    : pathname;
  const parts = rest.split('/').filter(Boolean);
  if (parts.length === 0)
    return [
      {
        label: 'Home',
      },
    ];
  const out = [];
  let acc = basePath;
  for (let i = 0; i < parts.length; i += 1) {
    acc += `/${parts[i]}`;
    out.push({
      label: humanize(parts[i]),
      to: i < parts.length - 1 ? acc : undefined,
    });
  }
  return out;
}
function humanize(seg) {
  if (seg === 'synclogs') return 'Sync Logs';
  if (/^\d+$/.test(seg)) return `#${seg}`;
  return seg.replace(/-|_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
