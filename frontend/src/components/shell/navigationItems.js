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
export const NAV_SETS = {
  analytics: {
    label: 'nav.workspaceTools',
    subtitle: 'nav.workspaceToolsHelp',
    icon: LineChart,
    sections: [
      {
        title: 'Publish',
        items: [
          {
            label: 'nav.createPost',
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

const original = NAV_SETS.analytics.sections;
const items = title => original.find(section => section.title === title).items;
const overview = items('Overview');
NAV_SETS.analytics.sections = [
  { title: 'nav.overview', items: overview.slice(0, 1) },
  { title: 'nav.content', items: [...items('Publish'), ...items('Content'), items('Setup')[0]] },
  { title: 'nav.messages', items: items('Engage') },
  { title: 'nav.reports', items: [...overview.slice(1), ...items('Performance').slice(0, 2), ...items('Grow')] },
  { title: 'nav.management', items: [...items('Setup').slice(1), ...items('Performance').slice(2)] },
];

export function navigationHref(basePath, module, item, workspaceId) {
  const path = item.path.startsWith('/admin/') ? item.path : `${basePath}/${module}${item.path}`;
  // Approvals and notifications are account-wide APIs, not selected-workspace counts.
  if (!workspaceId || item.path.startsWith('/admin/') || ['/approvals', '/notifications'].includes(item.path)) return path;
  const url = new URL(path, 'https://navigation.invalid');
  url.searchParams.set('workspace', String(workspaceId));
  return url.pathname + url.search + url.hash;
}

export function visibleSections(module, basePath, can) {
  return (NAV_SETS[module] || NAV_SETS.analytics).sections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.disabled &&
      (!item.path.startsWith('/admin/') || basePath === '/admin') &&
      (!item.permission || can(item.permission))),
  })).filter(section => section.items.length);
}

export function navigationText(value, { t, tr }) {
  return value.startsWith('nav.') ? t(value) : tr(value);
}

// Search returns legacy /admin links, including undelivered detail routes.
// Choose a delivered route without changing the API or alias contracts.
export function searchNavigationResults(results, basePath, can, workspaceId) {
  const definitions = {
    posts: { allowed: can('composer.view'), module: 'analytics', path: row => `/composer/${row.id}` },
    leads: { allowed: basePath === '/admin' && can('leads.view'), path: row => `/admin/leads/${row.id}` },
    conversations: { allowed: can('inbox.view'), module: 'analytics', path: () => '/inbox' },
    contacts: { allowed: can('whatsapp.manage_contacts'), module: 'messaging', path: () => '/contacts' },
  };
  const filtered = Object.fromEntries(Object.entries(definitions).map(([kind, definition]) => [kind,
    definition.allowed ? (results[kind] || []).filter(row => Number.isSafeInteger(row.id) && row.id > 0).map(row => ({
      ...row, deep_link: navigationHref(basePath, definition.module, { path: definition.path(row) }, workspaceId),
    })) : [],
  ]));
  return { ...filtered, total: Object.values(filtered).reduce((count, rows) => count + rows.length, 0) };
}
