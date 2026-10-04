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
  Eye,
  EyeOff,
  Download,
  AlertTriangle,
  ExternalLink,
  Bell,
  Mail,
  Smartphone,
  Sparkles,
  ArrowRight,
  Webhook,
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
import { apiKeysAPI, privacyAPI } from '../../../services/api';

// ─────────────────────────────────────────────────────────────────────────
// 1. Notifications — per-channel × per-event matrix
// ─────────────────────────────────────────────────────────────────────────
const NOTIF_CHANNELS = [
  {
    id: 'in_app',
    icon: Bell,
    label: 'In-app',
  },
  {
    id: 'email',
    icon: Mail,
    label: 'Email',
  },
  {
    id: 'browser',
    icon: Smartphone,
    label: 'Browser',
  },
];
const NOTIF_EVENTS = [
  {
    id: 'mentions',
    label: 'Mentions',
    description: 'Someone mentioned a tracked account.',
  },
  {
    id: 'alerts',
    label: 'Performance alerts',
    description: 'Engagement drops or viral posts.',
  },
  {
    id: 'reports',
    label: 'Scheduled reports',
    description: 'Weekly + monthly report emails.',
  },
  {
    id: 'team',
    label: 'Team activity',
    description: 'New members, role changes, invitations.',
  },
  {
    id: 'token_expiry',
    label: 'Token expiry',
    description: 'OAuth tokens about to expire.',
  },
];
const NOTIF_KEY = 'socialstats_notif_prefs';
const NOTIF_DEFAULT = NOTIF_EVENTS.reduce((acc, e) => {
  acc[e.id] = {
    in_app: true,
    email: e.id === 'token_expiry',
    browser: false,
  };
  return acc;
}, {});
export function NotificationsSection() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = persistentStorage.getItem(NOTIF_KEY);
      return raw
        ? {
            ...NOTIF_DEFAULT,
            ...JSON.parse(raw),
          }
        : NOTIF_DEFAULT;
    } catch {
      return NOTIF_DEFAULT;
    }
  });
  function toggle(eventId, channelId) {
    setPrefs((p) => ({
      ...p,
      [eventId]: {
        ...p[eventId],
        [channelId]: !p[eventId]?.[channelId],
      },
    }));
  }
  function save() {
    try {
      persistentStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Could not save preferences');
    }
  }
  return (
    <SectionContainer
      title="Notifications"
      description="Choose which events you'd like to be notified about, and where."
      action={
        <Button onClick={save} size="sm">
          Save preferences
        </Button>
      }
    >
      <Card padding="none">
        <div className={cn('[overflow-x:auto]')}>
          <table
            className={cn(
              '[width:100%]',
              '[border-collapse:collapse]',
              '[font-size:13px]',
              '[min-width:560px]',
            )}
          >
            <thead>
              <tr className={cn('[background:var(--surface-sunken)]')}>
                <th
                  scope="col"
                  className={cn(
                    '[text-align:start]',
                    '[padding:12px_16px]',
                    '[font-size:11px]',
                    '[font-weight:600]',
                    '[letter-spacing:0.06em]',
                    '[text-transform:uppercase]',
                    '[color:var(--text-tertiary)]',
                  )}
                >
                  Event
                </th>
                {NOTIF_CHANNELS.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    className={cn(
                      '[text-align:start]',
                      '[padding:12px_16px]',
                      '[font-size:11px]',
                      '[font-weight:600]',
                      '[letter-spacing:0.06em]',
                      '[text-transform:uppercase]',
                      '[color:var(--text-tertiary)]',
                      '[text-align:center]',
                    )}
                  >
                    <span
                      className={cn(
                        '[display:inline-flex]',
                        '[align-items:center]',
                        '[gap:6px]',
                      )}
                    >
                      <c.icon size={12} /> {c.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NOTIF_EVENTS.map((e, i) => (
                <tr
                  key={e.id}
                  className={cn(
                    i > 0
                      ? '[border-top:1px_solid_var(--border-subtle)]'
                      : '[border-top:none]',
                  )}
                >
                  <td
                    className={cn(
                      '[padding:14px_16px]',
                      '[vertical-align:top]',
                    )}
                  >
                    <div
                      className={cn(
                        '[font-size:14px]',
                        '[font-weight:600]',
                        '[color:var(--text-primary)]',
                      )}
                    >
                      {e.label}
                    </div>
                    <div
                      className={cn(
                        '[margin-top:2px]',
                        '[font-size:12px]',
                        '[color:var(--text-secondary)]',
                        '[line-height:1.5]',
                      )}
                    >
                      {e.description}
                    </div>
                  </td>
                  {NOTIF_CHANNELS.map((c) => (
                    <td
                      key={c.id}
                      className={cn(
                        '[padding:14px_16px]',
                        '[text-align:center]',
                      )}
                    >
                      <Switch
                        checked={!!prefs[e.id]?.[c.id]}
                        onChange={() => toggle(e.id, c.id)}
                        size="sm"
                        aria-label={`${c.label} notifications for ${e.label}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </SectionContainer>
  );
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
const CONSENT_LABELS = {
  marketing_emails: 'Marketing emails',
  product_emails: 'Product update emails',
  cookies_analytics: 'Analytics cookies',
  cookies_marketing: 'Marketing cookies',
  ai_processing_optout: 'AI processing — opt out',
  whatsapp_marketing: 'WhatsApp marketing messages',
  data_processing: 'Core service data processing',
};
export function DataPrivacySection() {
  const [exports, setExports] = useState([]);
  const [exportBusy, setExportBusy] = useState(false);
  const [consents, setConsents] = useState({});
  const [processingPaused, setProcessingPaused] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [loading, setLoading] = useState(true);
  function loadAll() {
    setLoading(true);
    Promise.all([
      privacyAPI.exportList().catch(() => ({
        data: {
          requests: [],
        },
      })),
      privacyAPI.consents().catch(() => ({
        data: {
          consents: {},
        },
      })),
      privacyAPI.processingStatus().catch(() => ({
        data: {
          workspaces: [],
        },
      })),
    ])
      .then(([ex, co, ps]) => {
        setExports(ex.data?.requests || []);
        setConsents(co.data?.consents || {});
        const ws = ps.data?.workspaces || [];
        setProcessingPaused(
          ws.length > 0 && ws.every((w) => w.is_processing_paused),
        );
        // Canceled deletions get filtered out client-side; "queued" is the actionable one.
        const queued = (ex.data?.requests || []).find(() => false); // exports list, not deletions
        setPendingDeletion(queued || null);
      })
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    loadAll();
  }, []);
  async function requestExport() {
    setExportBusy(true);
    try {
      await privacyAPI.exportRequest();
      toast.success('Export queued — we will email you when it is ready');
      loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not queue export');
    } finally {
      setExportBusy(false);
    }
  }
  async function toggleConsent(type, given) {
    try {
      await privacyAPI.setConsent(type, given);
      setConsents((c) => ({
        ...c,
        [type]: given,
      }));
    } catch {
      toast.error('Could not save consent');
    }
  }
  async function toggleProcessing(paused) {
    try {
      await privacyAPI.setProcessingPaused(paused);
      setProcessingPaused(paused);
      toast.success(paused ? 'Processing paused' : 'Processing resumed');
    } catch {
      toast.error('Could not update');
    }
  }
  async function deleteAccount() {
    const reason = window.prompt(
      'Tell us why (optional). Your account will be permanently deleted in 30 days unless canceled.',
    );
    if (reason === null) return;
    try {
      const r = await privacyAPI.deleteAccount(reason || '');
      setPendingDeletion(r.data);
      toast.success('Deletion scheduled — you have 30 days to cancel');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Could not schedule deletion');
    }
  }
  async function cancelDeletion() {
    try {
      await privacyAPI.cancelDeleteAccount();
      setPendingDeletion(null);
      toast.success('Deletion canceled');
    } catch {
      toast.error('Could not cancel');
    }
  }
  if (loading) {
    return (
      <SectionContainer title="Data & Privacy" description="Loading…">
        <Card padding="md" />
      </SectionContainer>
    );
  }
  return (
    <SectionContainer
      title="Data & Privacy"
      description="Your data, your rights. Export everything, manage consents, pause processing, or delete your account."
    >
      {/* Export */}
      <Card padding="md" className={cn('[margin-bottom:14px]')}>
        <div
          className={cn(
            '[display:flex]',
            '[gap:14px]',
            '[align-items:flex-start]',
          )}
        >
          <span
            className={cn(
              '[display:inline-flex]',
              '[flex-shrink:0]',
              '[width:40px]',
              '[height:40px]',
              '[border-radius:var(--radius-md)]',
              '[background:var(--brand-primary-soft)]',
              '[color:var(--brand-primary-hover)]',
              '[align-items:center]',
              '[justify-content:center]',
            )}
          >
            <Download size={18} strokeWidth={2.2} />
          </span>
          <div className={cn('[min-width:0]', '[flex:1]')}>
            <div className={cn('[font-size:15px]', '[font-weight:600]')}>
              Export your data
            </div>
            <p
              className={cn(
                '[margin:4px_0_12px]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
              )}
            >
              Download a ZIP with your profile, owned workspaces, consent log,
              and request history. Delivered via email link (expires in 7 days).
            </p>
            <Button
              size="sm"
              icon={Download}
              disabled={exportBusy}
              onClick={requestExport}
            >
              {exportBusy ? 'Queueing…' : 'Request export'}
            </Button>
            {exports.length > 0 && (
              <ul
                className={cn(
                  '[margin:12px_0_0]',
                  '[padding:0]',
                  '[list-style:none]',
                  '[font-size:12px]',
                  '[color:var(--text-tertiary)]',
                )}
              >
                {exports.slice(0, 3).map((e) => (
                  <li key={e.id} className={cn('[padding:4px_0]')}>
                    #{e.id} · {e.status}
                    {e.completed_at && (
                      <> · {new Date(e.completed_at).toLocaleDateString()}</>
                    )}
                    {e.download_url && e.status === 'completed' && (
                      <>
                        {' '}
                        ·{' '}
                        <a
                          href={e.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className={cn('[color:var(--brand-primary-hover)]')}
                        >
                          Download
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {/* Consents */}
      <Card padding="md" className={cn('[margin-bottom:14px]')}>
        <div
          className={cn(
            '[font-size:15px]',
            '[font-weight:600]',
            '[margin-bottom:8px]',
          )}
        >
          Your consents
        </div>
        <p
          className={cn(
            '[margin:0_0_12px]',
            '[font-size:13px]',
            '[color:var(--text-secondary)]',
          )}
        >
          Toggle communication and tracking preferences. Withdrawals take effect
          immediately.
        </p>
        <div
          className={cn(
            '[display:flex]',
            '[flex-direction:column]',
            '[gap:10px]',
          )}
        >
          {Object.entries(CONSENT_LABELS).map(([key, label]) => (
            <div
              key={key}
              className={cn(
                '[display:flex]',
                '[justify-content:space-between]',
                '[align-items:center]',
                '[padding:8px_0]',
                '[border-bottom:1px_solid_var(--border-subtle)]',
              )}
            >
              <span className={cn('[font-size:13px]')}>{label}</span>
              <Switch
                checked={!!consents[key]}
                onChange={(v) => toggleConsent(key, v)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Processing pause */}
      <Card padding="md" className={cn('[margin-bottom:14px]')}>
        <div
          className={cn(
            '[display:flex]',
            '[justify-content:space-between]',
            '[align-items:center]',
          )}
        >
          <div className={cn('[flex:1]', '[min-width:0]')}>
            <div className={cn('[font-size:15px]', '[font-weight:600]')}>
              Pause data processing
            </div>
            <p
              className={cn(
                '[margin:4px_0_0]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
              )}
            >
              When paused, sync tasks skip your workspaces, AI features are
              disabled, and the composer goes read-only. You can still log in to
              view existing data.
            </p>
          </div>
          <Switch checked={processingPaused} onChange={toggleProcessing} />
        </div>
      </Card>

      {/* Danger zone */}
      <Card padding="md" className={cn('[border-color:var(--danger)]')}>
        <div
          className={cn(
            '[display:flex]',
            '[gap:14px]',
            '[align-items:flex-start]',
          )}
        >
          <span
            className={cn(
              '[display:inline-flex]',
              '[flex-shrink:0]',
              '[width:40px]',
              '[height:40px]',
              '[border-radius:var(--radius-md)]',
              '[background:var(--danger-bg)]',
              '[color:var(--danger)]',
              '[align-items:center]',
              '[justify-content:center]',
            )}
          >
            <AlertTriangle size={18} strokeWidth={2.2} />
          </span>
          <div className={cn('[min-width:0]', '[flex:1]')}>
            <div
              className={cn(
                '[font-size:15px]',
                '[font-weight:600]',
                '[color:var(--danger)]',
              )}
            >
              Delete account
            </div>
            <p
              className={cn(
                '[margin:4px_0_12px]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
              )}
            >
              Permanently delete your account, sessions, MFA, API keys, and
              personal data after a 30-day grace period. Audit logs are
              anonymised but retained for compliance.
            </p>
            {pendingDeletion ? (
              <div
                className={cn(
                  '[padding:10px_12px]',
                  '[background:var(--warning-bg)]',
                  '[color:var(--warning)]',
                  '[border:1px_solid_var(--warning)]',
                  '[border-radius:var(--radius-sm)]',
                  '[font-size:12px]',
                  '[margin-bottom:8px]',
                )}
              >
                Deletion scheduled — completes on{' '}
                {new Date(pendingDeletion.grace_until).toLocaleDateString()}{' '}
                <Button size="xs" variant="ghost" onClick={cancelDeletion}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={deleteAccount}
              >
                Delete my account
              </Button>
            )}
          </div>
        </div>
      </Card>
    </SectionContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Webhooks — external endpoint subscriptions (stub)
// ─────────────────────────────────────────────────────────────────────────
const WEBHOOK_KEY = 'socialstats_webhook_endpoints';
const WEBHOOK_EVENTS = [
  'composer.post_published',
  'composer.post_failed',
  'inbox.new_message',
  'credential.token_expired',
  'goal.milestone_hit',
];
export function WebhooksSection() {
  const [endpoints, setEndpoints] = useState(() => {
    try {
      return JSON.parse(persistentStorage.getItem(WEBHOOK_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [url, setUrl] = useState('');
  function save(next) {
    setEndpoints(next);
    try {
      persistentStorage.setItem(WEBHOOK_KEY, JSON.stringify(next));
    } catch {}
  }
  function add() {
    if (!/^https:\/\//.test(url)) {
      toast.error('Endpoint must use HTTPS');
      return;
    }
    save([
      {
        id: `wh_${Date.now()}`,
        url: url.trim(),
        events: WEBHOOK_EVENTS,
        active: true,
      },
      ...endpoints,
    ]);
    setUrl('');
    toast.success('Endpoint added');
  }
  function remove(id) {
    save(endpoints.filter((e) => e.id !== id));
    toast.success('Endpoint removed');
  }
  return (
    <SectionContainer
      title="Webhooks"
      description="Receive HTTP POST notifications when events happen in your workspace."
    >
      <Card padding="md" className={cn('[margin-bottom:14px]')}>
        <div
          className={cn(
            '[font-size:14px]',
            '[font-weight:600]',
            '[color:var(--text-primary)]',
            '[margin-bottom:8px]',
          )}
        >
          Add an endpoint
        </div>
        <div
          className={cn(
            '[display:flex]',
            '[gap:8px]',
            '[align-items:flex-end]',
            '[flex-wrap:wrap]',
          )}
        >
          <div className={cn('[flex:1_1_280px]', '[min-width:0]')}>
            <Input
              label="Webhook URL"
              size="md"
              type="url"
              placeholder="https://your-server.com/webhooks/socialstats"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button onClick={add} icon={Plus} size="md">
            Add
          </Button>
        </div>
      </Card>

      {endpoints.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Webhook}
            title="No webhook endpoints"
            description="Add an HTTPS endpoint above to start receiving events."
            compact
          />
        </Card>
      ) : (
        <Card padding="none">
          {endpoints.map((e, i) => (
            <div
              key={e.id}
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[gap:12px]',
                '[padding:14px_18px]',
                i > 0
                  ? '[border-top:1px_solid_var(--border-subtle)]'
                  : '[border-top:none]',
              )}
            >
              <span className={cn('[flex:1]', '[min-width:0]')}>
                <div
                  className={cn(
                    '[font-family:var(--font-mono)]',
                    '[font-size:13px]',
                    '[color:var(--text-primary)]',
                    '[overflow:hidden]',
                    '[text-overflow:ellipsis]',
                    '[white-space:nowrap]',
                  )}
                >
                  {e.url}
                </div>
                <div
                  className={cn(
                    '[margin-top:4px]',
                    '[font-size:12px]',
                    '[color:var(--text-tertiary)]',
                  )}
                >
                  {e.events.length} events subscribed
                </div>
              </span>
              <Badge variant={e.active ? 'success' : 'default'} size="sm" dot>
                {e.active ? 'Active' : 'Paused'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={Trash2}
                aria-label="Remove"
                onClick={() => remove(e.id)}
              />
            </div>
          ))}
        </Card>
      )}
    </SectionContainer>
  );
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
