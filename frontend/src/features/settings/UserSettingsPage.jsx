/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import SecurityTab from './components/PasswordSection';
import DeleteAccountSection from './components/DeleteAccountSection';
import ProfileSettings from './components/ProfileSettings';
import { cn } from '../../lib/utils';
/**
 * UserSettingsPage — /account-settings
 * Tabs: Profile | Security | Agency (client only)
 * Available to all roles (admin, staff, client).
 */
import {
  useState,
} from 'react';
import { useAppNavigate as useNavigate } from '../../core/navigation';
import {
  User,
  Lock,
  Building2,
  Bell,
  Palette,
  Keyboard,
  Key,
  Database,
  Webhook,
  MoreHorizontal,
} from 'lucide-react';
import { useSession as useAuth } from '../../core/session';
import AgencyTab from './components/AgencySection';
import PageHeader from '../../components/layout/PageHeader';
import {
  NotificationsSection,
  AppearanceSection,
  KeyboardShortcutsSection,
  APIKeysSection,
  DataPrivacySection,
  WebhooksSection,
  CrossLinksSection,
} from './components/SettingsSections';
const TAB_GROUPS = [
  {
    label: 'Account',
    items: [
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
      },
      {
        id: 'security',
        label: 'Account & Security',
        icon: Lock,
      },
      {
        id: 'agency',
        label: 'Agency',
        icon: Building2,
        clientOnly: true,
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
      },
      {
        id: 'appearance',
        label: 'Appearance',
        icon: Palette,
      },
      {
        id: 'shortcuts',
        label: 'Keyboard',
        icon: Keyboard,
      },
    ],
  },
  {
    label: 'Developer',
    items: [
      {
        id: 'api',
        label: 'API Keys',
        icon: Key,
      },
      {
        id: 'webhooks',
        label: 'Webhooks',
        icon: Webhook,
      },
    ],
  },
  {
    label: 'Privacy',
    items: [
      {
        id: 'data',
        label: 'Data & Privacy',
        icon: Database,
      },
      {
        id: 'more',
        label: 'More settings',
        icon: MoreHorizontal,
      },
    ],
  },
];

// Flat list for filtering by clientOnly
export default function UserSettingsPage() {
  const { user, refreshAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  return (
    <div className={cn('app-page app-page--content app-page--lg settings-page', '[min-height:100vh]')}>
      <PageHeader
        title="Settings"
        subtitle="Manage your account, workspace, and integrations"
      />

      <div
        className={cn(
          'settings-body',
          '[display:flex]',
          '[gap:24px]',
          'px-0 py-6 sm:px-7',
          '[max-width:960px]',
          '[margin:0_auto]',
        )}
      >
        {/* Sidebar tabs */}
        <div
          className={cn(
            'settings-sidebar',
            '[width:220px]',
            '[flex-shrink:0]',
            '[display:flex]',
            '[flex-direction:column]',
            '[gap:1px]',
            '[padding:8px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-subtle)]',
            '[border-radius:var(--radius-lg)]',
            '[box-shadow:var(--shadow-xs)]',
            '[align-self:flex-start]',
            '[position:sticky]',
            '[top:80px]',
          )}
        >
          {TAB_GROUPS.map((group) => {
            const visible = group.items.filter(
              (t) => !t.clientOnly || user?.role === 'client',
            );
            if (visible.length === 0) return null;
            return (
              <div key={group.label} className={cn('[margin-bottom:6px]')}>
                <div
                  className={cn(
                    '[font-size:11px]',
                    '[font-weight:600]',
                    '[letter-spacing:0.08em]',
                    '[text-transform:uppercase]',
                    '[color:var(--text-tertiary)]',
                    '[padding:6px_10px_8px]',
                  )}
                >
                  {group.label}
                </div>
                {visible.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        '[display:flex]',
                        '[align-items:center]',
                        '[gap:10px]',
                        '[padding:8px_10px]',
                        '[min-height:unset]',
                        '[min-width:unset]',
                        '[border-radius:var(--radius-sm)]',
                        '[border:none]',
                        '[background:none]',
                        '[font-size:13px]',
                        '[font-weight:500]',
                        '[color:var(--text-secondary)]',
                        '[cursor:pointer]',
                        '[text-align:start]',
                        '[transition:var(--transition-fast)]',
                        '[font-family:inherit]',
                        active
                          ? cn(
                              '[background:var(--brand-primary-soft)]',
                              '[color:var(--text-primary)]',
                              '[font-weight:600]',
                              '[box-shadow:inset_2px_0_0_var(--brand-primary)]',
                            )
                          : cn(),
                      )}
                    >
                      <Icon size={14} strokeWidth={2} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Panel */}
        <div
          className={cn(
            'settings-panel',
            '[flex:1]',
            '[min-width:0]',
            '[background:var(--surface-card)]',
            '[border-radius:var(--radius-xl)]',
            '[border:1px_solid_var(--border-subtle)]',
            '[box-shadow:var(--shadow-sm)]',
            '[overflow:hidden]',
          )}
        >
          {tab === 'profile' && (
            <ProfileTab user={user} logout={logout} navigate={navigate} />
          )}
          {tab === 'security' && <SecurityTab user={user} />}
          {tab === 'agency' && user?.role === 'client' && (
            <AgencyTab
              user={user}
              refreshAuth={refreshAuth}
              navigate={navigate}
            />
          )}
          {tab === 'notifications' && <NotificationsSection />}
          {tab === 'appearance' && <AppearanceSection />}
          {tab === 'shortcuts' && <KeyboardShortcutsSection />}
          {tab === 'api' && <APIKeysSection />}
          {tab === 'webhooks' && <WebhooksSection />}
          {tab === 'data' && <DataPrivacySection />}
          {tab === 'more' && <CrossLinksSection user={user} />}
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ user, logout, navigate }) {
  return <ProfileSettings user={user}>
    {user?.role === 'client' && <DeleteAccountSection logout={logout} navigate={navigate} />}
  </ProfileSettings>;
}

// ── Security Tab ──────────────────────────────────────────────────────────────

// ── Agency Tab ────────────────────────────────────────────────────────────────
