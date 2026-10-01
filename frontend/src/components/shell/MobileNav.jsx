import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  AlertCircle,
  Inbox,
  Send,
  Users2,
  FileType,
  Rocket,
} from 'lucide-react';
import { useLanguage } from '../../i18n';
import { cn } from '../../lib/utils';

export default function MobileNav({ module, basePath }) {
  const location = useLocation();
  const { tr } = useLanguage();
  const tabs = MOBILE_TABS[module] || MOBILE_TABS.analytics;

  return (
    <nav
      className="mobile-bottom-nav ds-mobile-nav fixed inset-x-3 bottom-3 z-150 flex h-16 items-stretch overflow-hidden rounded-2xl border border-border/70 bg-card/92 px-1.5 pb-[env(safe-area-inset-bottom)] shadow-xl backdrop-blur-2xl"
      aria-label={`${tr(module === 'analytics' ? 'Analytics' : module === 'messaging' ? 'Messaging' : 'Ads')} bottom tabs`}
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
            className={cn(
              'group relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold no-underline transition',
              active ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'grid h-7 w-9 place-items-center rounded-xl transition',
                active ? 'bg-primary/12 shadow-sm' : 'bg-transparent group-hover:bg-muted'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="truncate px-1">{label}</span>
            {active && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden />}
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
  ads: [{ label: 'Soon', icon: Rocket, path: '' }],
};
