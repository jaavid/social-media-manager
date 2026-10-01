import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';

export default function TopBar({ basePath, onOpenPalette }) {
  const location = useLocation();
  const { user } = useAuth();
  const { isPersian, t, tr } = useLanguage();
  const crumbs = buildBreadcrumbs(location.pathname, basePath);
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

  return (
    <header className="ds-topbar fixed inset-x-0 top-0 z-80 ms-[calc(var(--module-rail-width)+var(--feature-sidebar-width))] flex h-[var(--topbar-height)] items-center gap-3 border-b border-border/70 bg-card/90 px-5 backdrop-blur-xl">
      <WorkspaceSwitcher user={user} basePath={basePath} />

      <div className="h-6 w-px bg-border/70" aria-hidden />

      <nav
        aria-label={t('common.navigation', 'Breadcrumb')}
        className="hidden min-w-0 items-center gap-1.5 lg:flex"
      >
        {crumbs.map((c, i) => {
          const label = tr(c.label);
          return (
            <span key={`${c.label}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  size={12}
                  className={cn('shrink-0 text-muted-foreground', isPersian && 'rotate-180')}
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
                <span className="text-[13px] text-muted-foreground">{label}</span>
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
        className="group flex h-9 min-w-44 flex-[0_1_300px] items-center gap-2 rounded-xl border border-border/70 bg-muted/70 px-3 text-[13px] font-medium text-muted-foreground shadow-sm transition hover:border-border hover:bg-accent hover:text-foreground"
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1 truncate text-start">{t('common.search', 'Search anything…')}</span>
        <kbd className="rounded-md border border-border/70 bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-xs">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/80 p-1 shadow-sm">
        <LanguageToggle />
        <ThemeToggle size="sm" />
        <NotificationBellWrapper />
      </div>

      <Link
        to="/changelog"
        target="_blank"
        rel="noopener noreferrer"
        className="ds-whats-new hidden items-center gap-1.5 rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary no-underline transition hover:bg-primary/15 xl:inline-flex"
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
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  const workspaces = useMemo(() => normalizeWorkspaces(user), [user]);
  const current = workspaces.find((workspace) => workspace.current) || workspaces[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.key === 'Escape' || (event.type === 'mousedown' && !ref.current?.contains(event.target))) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    window.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('keydown', close);
      window.removeEventListener('mousedown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 max-w-60 items-center gap-2 rounded-xl border border-transparent px-2 text-start transition hover:border-border/70 hover:bg-accent"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <Building2 size={14} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-foreground">{current.name}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{current.subtitle}</span>
        </span>
        <ChevronDown size={13} className={cn('ms-1 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute start-0 top-[calc(100%+8px)] z-200 w-72 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t('common.workspace', 'Workspace')}
          </div>

          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              role="menuitem"
              disabled={!workspace.path || workspace.current}
              onClick={() => {
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
                <span className="block truncate text-xs font-semibold">{workspace.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{workspace.subtitle}</span>
              </span>
              {workspace.current && <Check size={14} className="text-primary" />}
            </button>
          ))}

          <div className="my-1 h-px bg-border/70" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate(`${basePath}/account-settings`);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <Settings size={14} />
            {t('common.settings', 'Manage workspace')}
          </button>
        </div>
      )}
    </div>
  );
}

function normalizeWorkspaces(user) {
  const raw = Array.isArray(user?.workspaces) ? user.workspaces : [];
  if (raw.length) {
    return raw.map((workspace, index) => ({
      id: String(workspace.id ?? index),
      name: workspace.name || workspace.company || `Workspace ${index + 1}`,
      subtitle: workspace.role || workspace.plan || workspace.email || 'Social workspace',
      current: Boolean(workspace.current ?? workspace.is_current ?? index === 0),
      path: workspace.path || workspace.url || null,
    }));
  }

  return [{
    id: 'current',
    name: user?.company || user?.organization || user?.name || 'Social Stats',
    subtitle: user?.email || 'Social workspace',
    current: true,
    path: null,
  }];
}

function NotificationBellWrapper() {
  try {
    return <NotificationBell />;
  } catch {
    return null;
  }
}

function buildBreadcrumbs(pathname, basePath) {
  const rest = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname;
  const parts = rest.split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Home' }];

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
