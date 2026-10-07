/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { cn } from '../../../lib/utils';
import { persistentStorage } from '../../../lib/runtime/storage';

/**
 *
 * These cover surfaces that are useful immediately and don't require new
 * backend endpoints (they all read/write to localStorage or wrap existing
 * flows). When real APIs come online, swap the local-state hooks for the
 * relevant API call.
 */

import { useEffect, useState } from 'react';
import { AppLink as Link } from '../../../core/navigation';
import {
  Sun,
  Moon,
  Monitor,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import Button from '../../../components/ui/Button';
import Switch from '../../../components/ui/Switch';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import KeyboardShortcut from '../../../components/ui/KeyboardShortcut';
import EmptyState from '../../../components/ui/EmptyState';
import Input from '../../../components/ui/Input';
import toast from '../../../components/ui/toast';
import { useLanguage } from '../../../i18n';
import NotificationPreferencesPage from '../../../components/notifications/NotificationPreferences';
import { apiKeysAPI } from '../../../services/api';

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
      description="Customise how Social Stats looks and feels."
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
export function APIKeysSection() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState('');
  // The plaintext key is shown ONCE on creation. After that, only key_prefix.
  const [justCreated, setJustCreated] = useState(null);
  const [creating, setCreating] = useState(false);
  function load() {
    setLoading(true);
    apiKeysAPI
      .list()
      .then((r) => setKeys(r.data?.keys || []))
      .catch(() => toast.error('Could not load API keys'))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
  }, []);
  async function generate() {
    if (!name.trim()) {
      toast.error('Give the key a name first');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        name: name.trim(),
        scopes: scopes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const r = await apiKeysAPI.create(payload);
      setJustCreated(r.data);
      setKeys((ks) => [r.data, ...ks]);
      setName('');
      setScopes('');
      toast.success('API key created');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not create key');
    } finally {
      setCreating(false);
    }
  }
  async function revoke(id) {
    if (
      !window.confirm(
        'Revoke this key? Any application using it will stop working.',
      )
    )
      return;
    try {
      await apiKeysAPI.revoke(id);
      toast.success('Key revoked');
      load();
    } catch {
      toast.error('Could not revoke');
    }
  }
  function copyKey(value) {
    try {
      navigator.clipboard.writeText(value);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  }
  return (
    <SectionContainer
      title="API Keys"
      description="Programmatic access for your scripts and integrations. Keys are stored as SHA-256 hashes — we never see the plaintext after creation."
    >
      <Card padding="md" className={cn('[margin-bottom:16px]')}>
        <div
          className={cn(
            '[font-size:14px]',
            '[font-weight:600]',
            '[color:var(--text-primary)]',
            '[margin-bottom:8px]',
          )}
        >
          Generate a new key
        </div>
        <div
          className={cn(
            '[display:flex]',
            '[gap:8px]',
            '[align-items:flex-end]',
            '[flex-wrap:wrap]',
          )}
        >
          <div className={cn('[flex:2_1_220px]', '[min-width:0]')}>
            <Input
              size="md"
              placeholder='e.g. "Production deploy"'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={cn('[flex:2_1_220px]', '[min-width:0]')}>
            <Input
              size="md"
              placeholder="Scopes (comma-separated, e.g. read:posts, write:leads)"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
            />
          </div>
          <Button onClick={generate} icon={Plus} size="md" disabled={creating}>
            {creating ? 'Creating…' : 'Generate'}
          </Button>
        </div>
        <p
          className={cn(
            '[margin:8px_0_0]',
            '[font-size:12px]',
            '[color:var(--text-tertiary)]',
          )}
        >
          Keys are shown once at generation — copy and store them securely.
        </p>
      </Card>

      {justCreated && justCreated.plaintext_key && (
        <Card
          padding="md"
          className={cn(
            '[margin-bottom:16px]',
            '[border-color:var(--warning)]',
            '[background:var(--warning-bg)]',
          )}
        >
          <div
            className={cn(
              '[font-size:13px]',
              '[font-weight:700]',
              '[color:var(--warning)]',
              '[margin-bottom:8px]',
              '[display:flex]',
              '[align-items:center]',
              '[gap:6px]',
            )}
          >
            <AlertTriangle size={14} /> Save this key now — it will not be shown
            again
          </div>
          <div
            className={cn(
              '[font-family:var(--font-mono)]',
              '[font-size:12px]',
              '[background:var(--surface-sunken)]',
              '[padding:8px_12px]',
              '[border-radius:var(--radius-xs)]',
              '[word-break:break-all]',
              '[user-select:all]',
            )}
          >
            {justCreated.plaintext_key}
          </div>
          <div
            className={cn('[margin-top:8px]', '[display:flex]', '[gap:8px]')}
          >
            <Button
              size="sm"
              icon={Copy}
              onClick={() => copyKey(justCreated.plaintext_key)}
            >
              Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setJustCreated(null)}
            >
              I've saved it
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card padding="md">
          <div
            className={cn('[color:var(--text-tertiary)]', '[font-size:13px]')}
          >
            Loading…
          </div>
        </Card>
      ) : keys.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Sparkles}
            title="No API keys yet"
            description="Generate your first key above to start integrating Social Stats with your other tools."
            compact
          />
        </Card>
      ) : (
        <Card padding="none">
          {keys.map((k, i) => (
            <div
              key={k.id}
              className={cn(
                '[display:grid]',
                '[grid-template-columns:1fr_auto]',
                '[gap:12px]',
                '[align-items:center]',
                '[padding:14px_18px]',
                i > 0
                  ? '[border-top:1px_solid_var(--border-subtle)]'
                  : '[border-top:none]',
                k.is_active ? '[opacity:1]' : '[opacity:0.6]',
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
                  {k.name}
                  {!k.is_active && (
                    <Badge className={cn('[margin-inline-start:8px]')}>
                      {k.is_expired ? 'Expired' : 'Revoked'}
                    </Badge>
                  )}
                </div>
                <div
                  className={cn(
                    '[margin-top:2px]',
                    '[font-size:12px]',
                    '[color:var(--text-tertiary)]',
                    '[display:flex]',
                    '[gap:12px]',
                    '[flex-wrap:wrap]',
                  )}
                >
                  <span>
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </span>
                  <span>
                    {k.last_used_at
                      ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : 'Never used'}
                  </span>
                  <span>
                    {k.use_count} call{k.use_count === 1 ? '' : 's'}
                  </span>
                  {k.scopes?.length > 0 && (
                    <span>Scopes: {k.scopes.join(', ')}</span>
                  )}
                </div>
                <div
                  className={cn(
                    '[margin-top:6px]',
                    '[font-family:var(--font-mono)]',
                    '[font-size:12px]',
                    '[color:var(--text-secondary)]',
                    '[background:var(--surface-sunken)]',
                    '[padding:4px_8px]',
                    '[border-radius:var(--radius-xs)]',
                    '[display:inline-block]',
                  )}
                >
                  {k.key_prefix}
                  {'•'.repeat(24)}
                </div>
              </div>
              {k.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={Trash2}
                  aria-label="Revoke key"
                  onClick={() => revoke(k.id)}
                />
              )}
            </div>
          ))}
        </Card>
      )}
    </SectionContainer>
  );
}

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
                  '[line-height:1.5]',
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
          '[line-height:1.55]',
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
