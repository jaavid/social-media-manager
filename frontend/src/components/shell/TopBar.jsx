import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/DropdownMenu';
import { useMemo, useState } from 'react';
import {
  AppLink as Link,
  useAppLocation as useLocation,
  useAppNavigate as useNavigate,
} from '../../core/navigation';
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  Sparkles,
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

      <Link
        to="/changelog"
        target="_blank"
        rel="noopener noreferrer"
        className="ds-whats-new hidden items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary no-underline transition hover:bg-primary/15 2xl:inline-flex"
        aria-label={t('common.new', "What's new")}
      >
        <Sparkles size={11} />
        {t('common.new', 'New')}
      </Link>
    </header>
  );
}
function WorkspaceSwitcher({ user, basePath }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const workspaces = useMemo(() => normalizeWorkspaces(user), [user]);
  const current =
    workspaces.find((workspace) => workspace.current) || workspaces[0];
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 min-w-0 max-w-40 shrink xl:max-w-52 items-center gap-2 rounded-lg border-0 px-2 text-start transition hover:bg-accent"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
            <Building2 size={14} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-relaxed text-foreground">
              {current.name}
            </span>
            <span className="block truncate text-[11px] leading-relaxed text-muted-foreground">
              <bdi dir="auto">{current.subtitle}</bdi>
            </span>
          </span>
          <ChevronDown
            size={13}
            className={cn(
              'ms-1 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="bottom" align="start">
        <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t('common.workspace', 'Workspace')}
        </div>

        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            disabled={!workspace.path || workspace.current}
            onSelect={() => {
              if (!workspace.path || workspace.current) return;
              setOpen(false);
              navigate(workspace.path);
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-start transition hover:bg-accent disabled:cursor-default disabled:opacity-100"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Building2 size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">
                {workspace.name}
              </span>
              <span className="block truncate text-[11px] leading-relaxed text-muted-foreground">
                <bdi dir="auto">{workspace.subtitle}</bdi>
              </span>
            </span>
            {workspace.current && <Check size={14} className="text-primary" />}
          </DropdownMenuItem>
        ))}

        <div className="my-1 h-px bg-border/70" />
        <DropdownMenuItem
          onSelect={() => {
            setOpen(false);
            navigate(`${basePath}/account-settings`);
          }}
          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Settings size={14} />
          {t('common.settings', 'Manage workspace')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function normalizeWorkspaces(user) {
  const raw = Array.isArray(user?.workspaces) ? user.workspaces : [];
  if (raw.length) {
    return raw.map((workspace, index) => ({
      id: String(workspace.id ?? index),
      name: workspace.name || workspace.company || `Workspace ${index + 1}`,
      subtitle:
        workspace.role ||
        workspace.plan ||
        workspace.email ||
        'Social workspace',
      current: Boolean(
        workspace.current ?? workspace.is_current ?? index === 0,
      ),
      path: workspace.path || workspace.url || null,
    }));
  }
  return [
    {
      id: 'current',
      name: user?.company || user?.organization || user?.name || 'Ravinta',
      subtitle: user?.email || 'Social workspace',
      current: true,
      path: null,
    },
  ];
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
  if (/^\d+$/.test(seg)) return `#${seg}`;
  return seg.replace(/-|_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
