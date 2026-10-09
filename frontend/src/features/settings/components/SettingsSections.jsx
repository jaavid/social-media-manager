/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { cn } from "@/lib/utils";
import { persistentStorage } from "@/lib/runtime/storage";

/**
 *
 * These cover surfaces that are useful immediately and don't require new
 * backend endpoints (they all read/write to localStorage or wrap existing
 * flows). When real APIs come online, swap the local-state hooks for the
 * relevant API call.
 */

import { useState } from 'react';
import { AppLink as Link } from "@/core/navigation";
import {
  Sun,
  Moon,
  Monitor,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import KeyboardShortcut from "@/components/ui/KeyboardShortcut";
import toast from "@/components/ui/toast";
import { useLanguage } from "@/i18n";
import NotificationPreferencesPage from "@/components/notifications/NotificationPreferences";

// ─────────────────────────────────────────────────────────────────────────
// 1. Notifications — per-channel × per-event matrix
// ─────────────────────────────────────────────────────────────────────────
export function NotificationsSection() {
  return <NotificationPreferencesPage />;
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Appearance — theme + density
// ─────────────────────────────────────────────────────────────────────────
const DENSITY_KEY = 'socialstats_density';
export function AppearanceSection() {
  const { t: brandT } = useLanguage();
  const { preference, setTheme } = useTheme();
  const [density, setDensity] = useState(() => {
    try {
      return persistentStorage.getItem(DENSITY_KEY) || 'comfortable';
    } catch {
      return 'comfortable';
    }
  });
  function changeDensity(value) {
    setDensity(value);
    try {
      persistentStorage.setItem(DENSITY_KEY, value);
      document.documentElement.dataset.density = value;
      toast.success(`Density set to ${value}`);
    } catch {}
  }
  return (
    <SectionContainer
      title="Appearance"
      description={brandT('brand.appearanceHelp')}
    >
      <Card padding="md">
        <div
          className={cn(
            '[margin-bottom:8px]',
            '[font-size:14px]',
            '[font-weight:600]',
            '[color:var(--text-primary)]',
          )}
        >
          Theme
        </div>
        <p
          className={cn(
            '[margin:0_0_16px]',
            '[font-size:13px]',
            '[color:var(--text-secondary)]',
          )}
        >
          Choose a light or dark theme. "System" matches your OS preference.
        </p>
        <div
          className={cn(
            '[display:grid]',
            '[grid-template-columns:repeat(3,_minmax(0,_1fr))]',
            '[gap:12px]',
          )}
        >
          <ThemeCard
            active={preference === 'light'}
            icon={Sun}
            label="Light"
            onClick={() => setTheme('light')}
          />
          <ThemeCard
            active={preference === 'dark'}
            icon={Moon}
            label="Dark"
            onClick={() => setTheme('dark')}
          />
          <ThemeCard
            active={preference === 'system'}
            icon={Monitor}
            label="System"
            onClick={() => setTheme('system')}
          />
        </div>
      </Card>

      <Card padding="md" className={cn('[margin-top:16px]')}>
        <div
          className={cn(
            '[margin-bottom:8px]',
            '[font-size:14px]',
            '[font-weight:600]',
            '[color:var(--text-primary)]',
          )}
        >
          Density
        </div>
        <p
          className={cn(
            '[margin:0_0_16px]',
            '[font-size:13px]',
            '[color:var(--text-secondary)]',
          )}
        >
          Show more or less content per screen. "Compact" reduces row heights
          and padding.
        </p>
        <div className={cn('[display:flex]', '[gap:8px]')}>
          {[
            {
              value: 'comfortable',
              label: 'Comfortable',
            },
            {
              value: 'compact',
              label: 'Compact',
            },
          ].map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => changeDensity(d.value)}
              className={cn(
                '[padding:8px_14px]',
                '[min-height:unset]',
                '[min-width:unset]',
                density === d.value
                  ? '[background:var(--brand-primary-soft)]'
                  : '[background:var(--surface-card)]',
                density === d.value
                  ? '[color:var(--brand-primary-hover)]'
                  : '[color:var(--text-secondary)]',
                density === d.value
                  ? '[border:1px_solid_var(--brand-primary)]'
                  : '[border:1px_solid_var(--border-default)]',
                '[border-radius:var(--radius-pill)]',
                '[font-size:13px]',
                '[font-weight:600]',
                '[cursor:pointer]',
                '[font-family:inherit]',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Card>
    </SectionContainer>
  );
}
function ThemeCard({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        '[display:flex]',
        '[flex-direction:column]',
        '[align-items:center]',
        '[gap:8px]',
        '[padding:18px]',
        '[min-height:unset]',
        '[min-width:unset]',
        active
          ? '[background:var(--brand-primary-soft)]'
          : '[background:var(--surface-card)]',
        active
          ? '[border:1px_solid_var(--brand-primary)]'
          : '[border:1px_solid_var(--border-default)]',
        active
          ? '[box-shadow:var(--shadow-glow)]'
          : '[box-shadow:var(--shadow-xs)]',
        '[border-radius:var(--radius-md)]',
        '[cursor:pointer]',
        '[font-family:inherit]',
        active
          ? '[color:var(--brand-primary-hover)]'
          : '[color:var(--text-secondary)]',
        '[transition:var(--transition-fast)]',
      )}
    >
      <Icon size={20} strokeWidth={2} />
      <span className={cn('[font-size:13px]', '[font-weight:600]')}>
        {label}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Keyboard Shortcuts — list of all shortcuts
// ─────────────────────────────────────────────────────────────────────────
const SHORTCUTS = [
  {
    keys: 'cmd+k',
    label: 'Open command palette',
    category: 'Global',
  },
  {
    keys: 'cmd+/',
    label: 'Show shortcuts',
    category: 'Global',
  },
  {
    keys: 'esc',
    label: 'Close modal / palette',
    category: 'Global',
  },
  {
    keys: 'cmd+j',
    label: 'Open AI assistant',
    category: 'Global',
  },
  {
    keys: 'g+d',
    label: 'Go to dashboard',
    category: 'Navigation',
  },
  {
    keys: 'g+a',
    label: 'Go to analytics',
    category: 'Navigation',
  },
  {
    keys: 'g+r',
    label: 'Go to reports',
    category: 'Navigation',
  },
  {
    keys: 'g+i',
    label: 'Go to inbox',
    category: 'Navigation',
  },
  {
    keys: 'cmd+enter',
    label: 'Submit composer / form',
    category: 'Composer',
  },
  {
    keys: 'cmd+s',
    label: 'Save draft',
    category: 'Composer',
  },
  {
    keys: 'cmd+shift+p',
    label: 'Publish now',
    category: 'Composer',
  },
  {
    keys: 'r',
    label: 'Reply',
    category: 'Inbox',
  },
  {
    keys: 'a',
    label: 'Archive conversation',
    category: 'Inbox',
  },
  {
    keys: 'shift+u',
    label: 'Toggle unread',
    category: 'Inbox',
  },
];
export function KeyboardShortcutsSection() {
  const grouped = SHORTCUTS.reduce((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});
  return (
    <SectionContainer
      title="Keyboard Shortcuts"
      description="Speed up your workflow with these keyboard shortcuts."
    >
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} padding="none" className={cn('[margin-bottom:14px]')}>
          <div
            className={cn(
              '[padding:12px_18px]',
              '[border-bottom:1px_solid_var(--border-subtle)]',
              '[font-size:11px]',
              '[font-weight:600]',
              '[letter-spacing:0.08em]',
              '[text-transform:uppercase]',
              '[color:var(--text-tertiary)]',
              '[background:var(--surface-sunken)]',
            )}
          >
            {cat}
          </div>
          {items.map((s, i) => (
            <div
              key={s.keys}
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:space-between]',
                '[padding:12px_18px]',
                i > 0
                  ? '[border-top:1px_solid_var(--border-subtle)]'
                  : '[border-top:none]',
              )}
            >
              <span
                className={cn(
                  '[font-size:13px]',
                  '[color:var(--text-primary)]',
                )}
              >
                {s.label}
              </span>
              <KeyboardShortcut keys={s.keys} size="md" />
            </div>
          ))}
        </Card>
      ))}
      <p
        className={cn(
          '[margin-top:12px]',
          '[font-size:12px]',
          '[color:var(--text-tertiary)]',
        )}
      >
        Custom keybindings coming soon. Press{' '}
        <KeyboardShortcut keys="cmd+/" size="sm" /> from anywhere to view this
        list.
      </p>
    </SectionContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4. API Keys — generate / revoke (: now wired to /api/api-keys/)
// ─────────────────────────────────────────────────────────────────────────
export { default as APIKeysSection } from './APIKeysSection';

// ─────────────────────────────────────────────────────────────────────────
// 5. Data & Privacy — export + delete account
// ─────────────────────────────────────────────────────────────────────────
export { default as DataPrivacySection } from './DataPrivacySection';

// ─────────────────────────────────────────────────────────────────────────
// 6. Webhooks — external endpoint subscriptions (stub)
// ─────────────────────────────────────────────────────────────────────────
export function WebhooksSection() {
  const { tr } = useLanguage();
  return <SectionContainer title={tr('Webhooks')} description={tr('Webhook delivery is not available yet.')} >
    <Card padding="md"><p role="status">{tr('Coming soon')}</p></Card>
  </SectionContainer>;
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Cross-link cards — for sections that live as separate pages
// ─────────────────────────────────────────────────────────────────────────
export function CrossLinksSection({ user }) {
  const isStaff = user?.role === 'superadmin' || user?.role === 'staff';
  const base = isStaff ? '/admin' : '/dashboard';
  const LINKS = [
    {
      to: `${base}/management`,
      label: 'Team & permissions',
      description: 'Invite teammates, assign roles, override permissions.',
      staffOnly: true,
    },
    {
      to: `${base}/workspaces`,
      label: 'Workspaces (workspaces)',
      description: 'Manage every workspace account in your agency.',
      staffOnly: true,
    },
    {
      to: `${base}/analytics/audit-log`,
      label: 'Audit log',
      description: 'Search every action across your account.',
      staffOnly: true,
    },
    {
      to: '/help',
      label: 'Help center',
      description: 'Setup guides, troubleshooting, FAQs.',
      staffOnly: false,
    },
  ].filter((l) => !l.staffOnly || isStaff);
  return (
    <SectionContainer
      title="More settings"
      description="Some areas live as their own pages. Jump to them here."
    >
      <div className={cn('[display:grid]', '[gap:10px]')}>
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              cn(
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:space-between]',
                '[gap:12px]',
                '[padding:16px]',
                '[background:var(--surface-card)]',
                '[border:1px_solid_var(--border-subtle)]',
                '[border-radius:var(--radius-lg)]',
                '[box-shadow:var(--shadow-xs)]',
                '[text-decoration:none]',
                '[transition:var(--transition-fast)]',
              ),
              'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <div className={cn('[min-width:0]')}>
              <div
                className={cn(
                  '[font-size:14px]',
                  '[font-weight:600]',
                  '[color:var(--text-primary)]',
                )}
              >
                {l.label}
              </div>
              <div
                className={cn(
                  '[margin-top:2px]',
                  '[font-size:12px]',
                  '[color:var(--text-secondary)]',
                  '[line-height:var(--line-height-body)]',
                )}
              >
                {l.description}
              </div>
            </div>
            <ArrowRight
              size={14}
              className={cn('[color:var(--text-tertiary)]', '[flex-shrink:0]')}
            />
          </Link>
        ))}
      </div>
    </SectionContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared section container
// ─────────────────────────────────────────────────────────────────────────
function SectionContainer({ title, description, action, children }) {
  return (
    <div className="settings-section">
      <div
        className={cn(
          '[display:flex]',
          '[align-items:flex-start]',
          '[justify-content:space-between]',
          '[gap:12px]',
          '[margin-bottom:4px]',
          '[flex-wrap:wrap]',
        )}
      >
        <h2
          className={cn(
            '[margin:0]',
            '[font-size:20px]',
            '[font-weight:600]',
            '[letter-spacing:-0.015em]',
            '[color:var(--text-primary)]',
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      <p
        className={cn(
          '[margin:4px_0_24px]',
          '[font-size:14px]',
          '[color:var(--text-secondary)]',
          '[line-height:var(--line-height-body)]',
        )}
      >
        {description}
      </p>
      {children}

      <style>{`
        .settings-section { padding: 32px 36px; }
        @media (max-width: 768px) {
          .settings-section { padding: 22px 18px; }
        }
      `}</style>
    </div>
  );
}
