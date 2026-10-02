import Select from '../ui/Select';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { cn } from '../../lib/utils';
import { useState } from 'react';
import {
  AppNavLink as NavLink,
  useAppLocation as useLocation,
  useAppNavigate as useNavigate,
} from '../../app/navigation';
import {
  LayoutDashboard,
  LineChart,
  FileText,
  FileType,
  CalendarDays,
  Wand2,
  Lightbulb,
  Hash,
  TrendingUp,
  AlertCircle,
  FolderSync,
  Inbox,
  Send,
  Users2,
  ListChecks,
  Settings,
  Webhook,
  Rocket,
  ChevronDown,
  Building2,
  Search,
  PenSquare,
  Layers,
  Images,
  Star,
  Zap,
  Film,
  Bell,
  ShieldCheck,
  ClipboardCheck,
  Mic,
  Sparkles,
  Bot,
  MessageSquare,
  Megaphone,
  UserPlus,
} from 'lucide-react';
import PermissionGate from '../ui/PermissionGate';
import { useWorkspaces } from '../../hooks/useData';
import { useBadgeCount } from '../../stores/appStore';
import { useLanguage } from '../../i18n';
export default function FeatureSidebar({
  module,
  basePath,
  isAdmin = false,
  selectedClient,
  onSelectClient,
}) {
  const location = useLocation();
  const { isPersian, tr } = useLanguage();
  const navSet = NAV_SETS[module] || NAV_SETS.analytics;
  return (
    <aside
      aria-label={`${tr(navSet.label)} navigation`}
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
            {tr(navSet.label)}
          </div>
          {navSet.subtitle && (
            <div
              className={cn('[font-size:11px]', '[color:var(--text-tertiary)]')}
            >
              {tr(navSet.subtitle)}
            </div>
          )}
        </div>
      </header>

      <div
        className={cn(
          'sidebar-scroll',
          '[flex:1]',
          '[overflow-y:auto]',
          '[padding:12px_10px]',
        )}
      >
        {navSet.empty ? (
          <EmptyModule message={tr(navSet.empty)} />
        ) : (
          navSet.sections.map((section) => (
            <Section key={section.title} title={tr(section.title)}>
              {section.items.map((item) => (
                <PermissionGate key={item.path} code={item.permission}>
                  <NavItem
                    to={
                      item.path.startsWith('/admin/')
                        ? item.path
                        : `${basePath}/${module}${item.path}`
                    }
                    icon={item.icon}
                    label={tr(item.label)}
                    end={item.end}
                    badge={item.badge}
                    badgeKey={item.badgeKey}
                    pathname={location.pathname}
                    disabled={item.disabled}
                    isPersian={isPersian}
                  />
                </PermissionGate>
              ))}
            </Section>
          ))
        )}
      </div>

      {isAdmin && (
        <ClientSwitcher selected={selectedClient} onSelect={onSelectClient} />
      )}
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
  const isActive = end
    ? pathname === to
    : pathname === to || pathname.startsWith(`${to}/`);
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
function Section({ title, children }) {
  return (
    <div className={cn('[margin-bottom:14px]')}>
      <div
        className={cn(
          '[font-size:11px]',
          '[font-weight:600]',
          '[text-transform:uppercase]',
          '[letter-spacing:0.6px]',
          '[color:var(--text-tertiary)]',
          '[padding:6px_10px_8px]',
        )}
      >
        {title}
      </div>
      <div
        className={cn('[display:flex]', '[flex-direction:column]', '[gap:1px]')}
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
function ClientSwitcher({ selected, onSelect }) {
  const navigate = useNavigate();
  const { workspaces = [] } = useWorkspaces();
  const { t } = useLanguage();
  return (
    <div className="border-t border-border p-2.5">
      <Select
        searchable
        placement="top"
        aria-label={t('common.workspace', 'Workspace')}
        value={selected?.id ?? 'all'}
        options={[
          { value: 'all', label: t('common.allWorkspaces', 'All workspaces') },
          ...workspaces.map((workspace) => ({
            value: workspace.id,
            label: workspace.company,
          })),
        ]}
        onChange={(value) => {
          const workspace =
            workspaces.find((item) => item.id === value) || null;
          onSelect?.(workspace);
          if (workspace) navigate(`/admin/workspace/${workspace.id}`);
        }}
      />
    </div>
  );
}

const NAV_SETS = {
  analytics: {
    label: 'Analytics',
    subtitle: 'Social performance',
    icon: LineChart,
    sections: [
      {
        title: 'Publish',
        items: [
          {
            label: 'Composer',
            icon: PenSquare,
            path: '/composer',
            permission: 'composer.view',
          },
          {
            label: 'Calendar',
            icon: CalendarDays,
            path: '/calendar',
            permission: 'calendar.view',
          },
          {
            label: 'Queues',
            icon: Layers,
            path: '/queues',
            permission: 'composer.view',
          },
          {
            label: 'Media Library',
            icon: Images,
            path: '/media',
            permission: 'composer.view',
          },
          {
            label: 'Video Studio',
            icon: Film,
            path: '/video',
            permission: 'video.view',
          },
        ],
      },
      {
        title: 'Engage',
        items: [
          {
            label: 'Inbox',
            icon: Inbox,
            path: '/inbox',
            permission: 'inbox.view',
            badgeKey: 'unread_inbox',
          },
          {
            label: 'Reviews',
            icon: Star,
            path: '/reviews',
            permission: 'inbox.view',
          },
          {
            label: 'Automations',
            icon: Zap,
            path: '/automations',
            permission: 'automations.view',
          },
        ],
      },
      {
        title: 'Overview',
        items: [
          {
            label: 'Dashboard',
            icon: LayoutDashboard,
            path: '/dashboard',
            end: true,
            permission: 'dashboard.view',
          },
          {
            label: 'Analytics',
            icon: LineChart,
            path: '/analytics',
            permission: 'analytics.view',
          },
          {
            label: 'Reports',
            icon: FileText,
            path: '/reports',
            permission: 'reports.view',
          },
        ],
      },
      {
        title: 'Content',
        items: [
          {
            label: 'Posts',
            icon: FileType,
            path: '/posts',
            permission: 'dashboard.posts_table',
          },
          {
            label: 'Caption Writer',
            icon: Wand2,
            path: '/caption-writer',
          },
          {
            label: 'Post Ideas',
            icon: Lightbulb,
            path: '/post-ideas',
          },
          {
            label: 'Hashtags',
            icon: Hash,
            path: '/hashtags',
          },
          {
            label: 'AI Studio',
            icon: Sparkles,
            path: '/ai-studio',
          },
          {
            label: 'Brand Voice',
            icon: Mic,
            path: '/brand-voice',
            permission: 'ai.brand_voice',
          },
          {
            label: 'AI Insights',
            icon: Sparkles,
            path: '/insights',
          },
          {
            label: 'AI Audit',
            icon: ShieldCheck,
            path: '/ai-audit',
          },
        ],
      },
      {
        title: 'Performance',
        items: [
          {
            label: 'ROI Calculator',
            icon: TrendingUp,
            path: '/roi',
            permission: 'roi.view',
          },
          {
            label: 'Alerts',
            icon: AlertCircle,
            path: '/alerts',
            permission: 'alerts.view',
          },
          {
            label: 'Sync Logs',
            icon: FolderSync,
            path: '/synclogs',
          },
        ],
      },
      {
        title: 'Grow',
        items: [
          {
            label: 'Audience',
            icon: Users2,
            path: '/audience',
            permission: 'audience.view',
          },
          {
            label: 'Competitors',
            icon: TrendingUp,
            path: '/competitors',
            permission: 'competitors.view',
          },
        ],
      },
      {
        title: 'Setup',
        items: [
          {
            label: 'Approvals',
            icon: ClipboardCheck,
            path: '/approvals',
            permission: 'composer.approve',
            badgeKey: 'pending_approvals',
          },
          {
            label: 'Notifications',
            icon: Bell,
            path: '/notifications',
            badgeKey: 'unread_notifications',
          },
          {
            label: 'Audit Log',
            icon: ShieldCheck,
            path: '/audit-log',
            permission: 'audit.view',
          },
        ],
      },
    ],
  },
  messaging: {
    label: 'Messaging',
    subtitle: 'WhatsApp & SMS',
    icon: Inbox,
    sections: [
      {
        title: 'Inbox',
        items: [
          {
            label: 'All conversations',
            icon: Inbox,
            path: '/inbox',
            permission: 'whatsapp.view_inbox',
          },
        ],
      },
      {
        title: 'Outreach',
        items: [
          {
            label: 'Campaigns',
            icon: Send,
            path: '/campaigns',
            permission: 'whatsapp.manage_campaigns',
          },
          {
            label: 'Templates',
            icon: FileType,
            path: '/templates',
            permission: 'whatsapp.manage_templates',
          },
          {
            label: 'Contacts',
            icon: Users2,
            path: '/contacts',
            permission: 'whatsapp.manage_contacts',
          },
          {
            label: 'Lists',
            icon: ListChecks,
            path: '/lists',
            permission: 'whatsapp.manage_contacts',
          },
        ],
      },
      {
        title: 'Conversational AI',
        items: [
          {
            label: 'Bot Flows',
            icon: Bot,
            path: '/admin/bot-flows',
            permission: 'bot.view',
          },
          {
            label: 'Conversations',
            icon: MessageSquare,
            path: '/admin/conversations',
            permission: 'bot.view',
          },
          {
            label: 'Handoff Queue',
            icon: UserPlus,
            path: '/admin/handoff',
            permission: 'bot.view',
          },
          {
            label: 'Leads',
            icon: Users2,
            path: '/admin/leads',
            permission: 'leads.view',
            badgeKey: 'new_leads',
          },
          {
            label: 'CTWA Campaigns',
            icon: Megaphone,
            path: '/admin/ctwa',
            permission: 'ctwa.view',
          },
          {
            label: 'Templates',
            icon: Sparkles,
            path: '/admin/bot-templates',
            permission: 'bot.view',
          },
          {
            label: 'Bot Safety',
            icon: ShieldCheck,
            path: '/admin/bot-settings',
            permission: 'bot.view',
          },
        ],
      },
      {
        title: 'Setup',
        items: [
          {
            label: 'Account',
            icon: Settings,
            path: '/account',
            permission: 'whatsapp.manage_account',
          },
          {
            label: 'Webhooks',
            icon: Webhook,
            path: '/account#webhooks',
            disabled: true,
          },
        ],
      },
    ],
  },
  ads: {
    label: 'Ads',
    subtitle: 'Coming soon',
    icon: Rocket,
    empty: "Ads management is coming soon. We're building it next.",
    sections: [],
  },
};
