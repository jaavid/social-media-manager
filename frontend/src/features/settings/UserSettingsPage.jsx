/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Input from '../../components/ui/Input';
import ProfileSettings from './components/ProfileSettings';
import { cn } from '../../lib/utils';
/**
 * UserSettingsPage — /account-settings
 * Tabs: Profile | Security | Agency (client only)
 * Available to all roles (admin, staff, client).
 */
import {
  useState,
  useEffect,
  useId,
  cloneElement,
  isValidElement,
} from 'react';
import { useAppNavigate as useNavigate } from '../../core/navigation';
import {
  User,
  Lock,
  Building2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  LogOut,
  Shield,
  Trash2,
  Bell,
  Palette,
  Keyboard,
  Key,
  Database,
  Webhook,
  MoreHorizontal,
} from 'lucide-react';
import { useSession as useAuth } from '../../core/session';
import { profileAPI } from '../../services/api';
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
import { MFAManager, ActiveSessionsList } from './components/SecuritySections';
const CYAN = 'var(--brand-primary)';
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
    <div className={cn('[min-height:100vh]')}>
      <PageHeader
        title="Settings"
        subtitle="Manage your account, workspace, and integrations"
      />

      <div
        className={cn(
          'settings-body',
          '[display:flex]',
          '[gap:24px]',
          '[padding:24px_28px]',
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

// ── Delete Account Section (client only) ──────────────────────────────────────

const DELETE_REASONS = [
  'I no longer need this account',
  'Privacy concerns',
  'Switching to another platform',
  'Too many emails / notifications',
  'Technical issues',
  'Other',
];
function DeleteAccountSection({ logout, navigate }) {
  const [step, setStep] = useState(0); // 0=hidden 1=reason 2=confirm
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await profileAPI.deleteAccount({
        reason,
      });
      logout();
      navigate('/', {
        replace: true,
      });
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          'Failed to delete account. Please try again.',
      );
      setDeleting(false);
    }
  };
  return (
    <div
      className={cn(
        '[margin-top:40px]',
        '[border-top:1px_solid_#fee2e2]',
        '[padding-top:24px]',
      )}
    >
      <div
        className={cn(
          '[display:flex]',
          '[align-items:center]',
          '[gap:8px]',
          '[margin-bottom:14px]',
        )}
      >
        <Trash2 size={16} color="#dc2626" />
        <span
          className={cn(
            '[font-size:13px]',
            '[font-weight:700]',
            'text-destructive',
            '[text-transform:uppercase]',
            '[letter-spacing:0.06em]',
          )}
        >
          Danger Zone
        </span>
      </div>

      <div
        className={cn(
          '[display:flex]',
          '[align-items:center]',
          '[justify-content:space-between]',
          '[gap:16px]',
          '[flex-wrap:wrap]',
        )}
      >
        <div>
          <p
            className={cn(
              '[margin:0_0_4px]',
              '[font-weight:600]',
              '[font-size:14px]',
              '[color:var(--text-primary)]',
            )}
          >
            Delete Account
          </p>
          <p
            className={cn(
              '[margin:0]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
              '[max-width:420px]',
            )}
          >
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
        </div>
        {step === 0 && (
          <button
            onClick={() => setStep(1)}
            className={cn(
              '[display:inline-flex]',
              '[align-items:center]',
              '[gap:7px]',
              '[flex-shrink:0]',
              '[padding:9px_18px]',
              '[border-radius:10px]',
              '[border:1.5px_solid_#fca5a5]',
              'bg-[var(--danger-bg)]',
              'text-destructive',
              '[font-size:13px]',
              '[font-weight:700]',
              '[cursor:pointer]',
            )}
          >
            <Trash2 size={14} /> Delete Account
          </button>
        )}
      </div>

      {/* Step 1 — Reason */}
      {step === 1 && (
        <div
          className={cn(
            '[display:flex]',
            '[gap:14px]',
            '[padding:20px_22px]',
            '[border-radius:16px]',
            '[background:#fffbeb]',
            '[border:1px_solid_#fde68a]',
            '[margin-top:16px]',
          )}
        >
          <AlertTriangle
            size={20}
            color="#dc2626"
            className={cn('[flex-shrink:0]', '[margin-top:2px]')}
          />
          <div className={cn('[flex:1]')}>
            <p
              className={cn(
                '[margin:0_0_4px]',
                '[font-weight:700]',
                '[font-size:14px]',
                '[color:var(--text-primary)]',
              )}
            >
              Why are you deleting your account?
            </p>
            <p
              className={cn(
                '[margin:0_0_14px]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
                '[line-height:1.5]',
              )}
            >
              Please select a reason. This helps us improve Social Stats.
            </p>
            <div
              className={cn(
                '[display:flex]',
                '[flex-direction:column]',
                '[gap:8px]',
                '[margin-bottom:18px]',
              )}
            >
              {DELETE_REASONS.map((r) => (
                <label
                  key={r}
                  className={cn(
                    '[display:flex]',
                    '[align-items:center]',
                    '[gap:10px]',
                    '[cursor:pointer]',
                    '[padding:8px_12px]',
                    '[border-radius:10px]',
                    '[border:1px_solid_var(--border-default)]',
                    '[background:var(--surface-card)]',
                  )}
                >
                  <input
                    type="radio"
                    name="delete_reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className={cn('[accent-color:#dc2626]', '[flex-shrink:0]')}
                  />

                  <span
                    className={cn(
                      '[font-size:13px]',
                      '[color:var(--text-secondary)]',
                    )}
                  >
                    {r}
                  </span>
                </label>
              ))}
            </div>
            <div className={cn('[display:flex]', '[gap:10px]')}>
              <button
                onClick={() => {
                  if (reason) setStep(2);
                }}
                disabled={!reason}
                className={cn(
                  '[display:inline-flex]',
                  '[align-items:center]',
                  '[gap:6px]',
                  '[padding:9px_20px]',
                  '[border-radius:10px]',
                  '[border:none]',
                  '[background:#dc2626]',
                  '[color:var(--surface-card)]',
                  '[font-size:13px]',
                  '[font-weight:700]',
                  '[cursor:pointer]',
                  reason ? '[opacity:1]' : '[opacity:0.45]',
                )}
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setReason('');
                }}
                className={cn(
                  '[padding:9px_20px]',
                  '[border-radius:10px]',
                  '[border:1px_solid_var(--border-default)]',
                  '[background:var(--surface-card)]',
                  '[color:var(--text-secondary)]',
                  '[font-size:13px]',
                  '[font-weight:600]',
                  '[cursor:pointer]',
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Final confirm */}
      {step === 2 && (
        <div
          className={cn(
            '[display:flex]',
            '[gap:14px]',
            '[padding:20px_22px]',
            '[border-radius:16px]',
            '[background:#fffbeb]',
            '[border:1px_solid_#fde68a]',
            '[margin-top:16px]',
            '[border-color:#fca5a5]',
            '[background:#fff5f5]',
          )}
        >
          <AlertTriangle
            size={20}
            color="#dc2626"
            className={cn('[flex-shrink:0]', '[margin-top:2px]')}
          />
          <div className={cn('[flex:1]')}>
            <p
              className={cn(
                '[margin:0_0_4px]',
                '[font-weight:700]',
                '[font-size:14px]',
                '[color:var(--text-primary)]',
              )}
            >
              This will permanently delete everything
            </p>
            <div
              className={cn(
                'bg-[var(--danger-bg)]',
                '[border-radius:12px]',
                '[padding:14px_16px]',
                '[border:1px_solid_#fecaca]',
              )}
            >
              {[
                'All your analytics data and reports',
                'All connected social media accounts',
                'All calendar posts and schedules',
                'Your agency connection and history',
                'Your profile and account credentials',
              ].map((item) => (
                <div
                  key={item}
                  className={cn(
                    '[display:flex]',
                    '[align-items:center]',
                    '[gap:8px]',
                    '[margin-bottom:6px]',
                  )}
                >
                  <X
                    size={13}
                    color="#dc2626"
                    className={cn('[flex-shrink:0]')}
                  />
                  <span
                    className={cn(
                      '[font-size:13px]',
                      '[color:var(--text-secondary)]',
                    )}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <p
              className={cn(
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
                '[font-weight:600]',
                '[margin:16px_0_6px]',
              )}
            >
              Type <strong>DELETE</strong> to confirm:
            </p>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="DELETE"
            />

            {error && <Alert type="error" msg={error} />}
            <div className={cn('[display:flex]', '[gap:10px]')}>
              <button
                onClick={handleDelete}
                disabled={typed !== 'DELETE' || deleting}
                className={cn(
                  '[display:inline-flex]',
                  '[align-items:center]',
                  '[gap:7px]',
                  '[padding:10px_20px]',
                  '[border-radius:10px]',
                  '[border:none]',
                  '[background:#dc2626]',
                  '[color:var(--surface-card)]',
                  '[font-size:13px]',
                  '[font-weight:700]',
                  '[cursor:pointer]',
                  typed !== 'DELETE' ? '[opacity:0.45]' : '[opacity:1]',
                )}
              >
                {deleting ? (
                  <>
                    <Loader2
                      size={14}
                      className={cn('[animation:spin_1s_linear_infinite]')}
                    />{' '}
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Permanently Delete Account
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setStep(0);
                  setReason('');
                  setTyped('');
                  setError('');
                }}
                className={cn(
                  '[padding:9px_20px]',
                  '[border-radius:10px]',
                  '[border:1px_solid_var(--border-default)]',
                  '[background:var(--surface-card)]',
                  '[color:var(--text-secondary)]',
                  '[font-size:13px]',
                  '[font-weight:600]',
                  '[cursor:pointer]',
                )}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab({ user }) {
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showC, setShowC] = useState(false);
  const [showN, setShowN] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isSocial, setIsSocial] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    profileAPI
      .get()
      .then((res) => setIsSocial(res.data.is_social))
      .finally(() => setLoading(false));
  }, []);
  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!current || !newPwd || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (newPwd !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (newPwd.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await profileAPI.changePassword({
        current_password: current,
        new_password: newPwd,
        confirm_password: confirm,
      });
      setSuccess('Password changed successfully.');
      setCurrent('');
      setNewPwd('');
      setConfirm('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Spinner />;
  return (
    <div className={cn('[padding:32px_36px]')}>
      <h3
        className={cn(
          '[margin:0_0_4px]',
          '[font-size:18px]',
          '[font-weight:700]',
          '[color:var(--text-primary)]',
        )}
      >
        Security
      </h3>
      <p
        className={cn(
          '[margin:0_0_28px]',
          '[font-size:14px]',
          '[color:var(--text-secondary)]',
        )}
      >
        Manage your account password and security settings.
      </p>

      {/* Account type badge */}
      <div
        className={cn(
          '[display:flex]',
          '[align-items:flex-start]',
          '[gap:14px]',
          '[padding:16px_18px]',
          '[border-radius:14px]',
          '[background:linear-gradient(135deg,var(--surface-sunken),#f0f9ff)]',
          '[border:1px_solid_var(--border-default)]',
        )}
      >
        <Shield size={18} color={CYAN} />
        <div>
          <p
            className={cn(
              '[margin:0_0_2px]',
              '[font-weight:700]',
              '[font-size:14px]',
              '[color:var(--text-primary)]',
            )}
          >
            {isSocial ? 'Social Login Account' : 'Email & Password Account'}
          </p>
          <p
            className={cn(
              '[margin:0]',
              '[font-size:13px]',
              '[color:var(--text-secondary)]',
            )}
          >
            {isSocial
              ? 'Your account is linked to Google. Password login is not available.'
              : 'You can change your password below.'}
          </p>
        </div>
      </div>

      {isSocial ? (
        <div
          className={cn(
            '[display:flex]',
            '[align-items:flex-start]',
            '[gap:14px]',
            '[padding:16px_18px]',
            '[border-radius:14px]',
            '[background:linear-gradient(135deg,var(--surface-sunken),#f0f9ff)]',
            '[border:1px_solid_var(--border-default)]',
            '[background:linear-gradient(135deg,#f0f9ff,#f8faff)]',
            '[border:1px_solid_rgba(0,215,255,0.15)]',
            '[margin-top:20px]',
          )}
        >
          <CheckCircle size={18} color={CYAN} />
          <p
            className={cn(
              '[margin:0]',
              '[font-size:14px]',
              '[color:var(--text-secondary)]',
            )}
          >
            Password management is handled by Google. To change your password,
            visit your Google account settings.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className={cn('[margin-top:24px]')}>
          <Field label="Current Password" required>
            <PwdInput
              value={current}
              onChange={setCurrent}
              show={showC}
              onToggle={() => setShowC((v) => !v)}
              placeholder="Enter current password"
            />
          </Field>
          <Field label="New Password" required>
            <PwdInput
              value={newPwd}
              onChange={setNewPwd}
              show={showN}
              onToggle={() => setShowN((v) => !v)}
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Confirm New Password" required>
            <PwdInput
              value={confirm}
              onChange={setConfirm}
              show={showConf}
              onToggle={() => setShowConf((v) => !v)}
              placeholder="Re-enter new password"
            />
          </Field>

          {error && <Alert type="error" msg={error} />}
          {success && <Alert type="success" msg={success} />}

          <button
            type="submit"
            disabled={saving}
            className={cn(
              '[display:inline-flex]',
              '[align-items:center]',
              '[gap:8px]',
              '[padding:12px_28px]',
              '[border-radius:14px]',
              '[border:none]',
              '[background:linear-gradient(135deg,#00d7ff,#0099bb)]',
              '[color:#021418]',
              '[font-size:14px]',
              '[font-weight:800]',
              '[cursor:pointer]',
              '[box-shadow:0_6px_20px_rgba(0,215,255,0.25)]',
              '[margin-top:4px]',
            )}
          >
            {saving ? (
              <>
                <Loader2
                  size={15}
                  className={cn('[animation:spin_1s_linear_infinite]')}
                />{' '}
                Saving...
              </>
            ) : (
              <>
                <Lock size={15} /> Change Password
              </>
            )}
          </button>
        </form>
      )}

      {!isSocial && (
        <div
          className={cn(
            '[margin-top:28px]',
            '[display:flex]',
            '[flex-direction:column]',
            '[gap:16px]',
          )}
        >
          <h4
            className={cn(
              '[margin:0]',
              '[font-size:14px]',
              '[font-weight:700]',
              '[letter-spacing:0.04em]',
              '[text-transform:uppercase]',
              '[color:var(--text-tertiary)]',
            )}
          >
            Two-factor authentication
          </h4>
          <MFAManager />

          <h4
            className={cn(
              '[margin:8px_0_0]',
              '[font-size:14px]',
              '[font-weight:700]',
              '[letter-spacing:0.04em]',
              '[text-transform:uppercase]',
              '[color:var(--text-tertiary)]',
            )}
          >
            Active sessions
          </h4>
          <ActiveSessionsList />
        </div>
      )}
    </div>
  );
}

// ── Agency Tab ────────────────────────────────────────────────────────────────

function AgencyTab({ user, refreshAuth, navigate }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    profileAPI
      .agencyInfo()
      .then((res) => setInfo(res.data))
      .catch(() =>
        setInfo({
          connected: false,
        }),
      )
      .finally(() => setLoading(false));
  }, []);
  const handleDisconnect = async () => {
    setError('');
    setDisconnecting(true);
    try {
      const res = await profileAPI.disconnectAgency();
      const updatedUser = await refreshAuth(res.data.access, res.data.refresh);
      // If they already have a client account, go straight to dashboard.
      // Only go to /pending if they have no client record at all.
      if (updatedUser?.client_id) {
        navigate('/dashboard', {
          replace: true,
        });
      } else {
        navigate('/pending', {
          replace: true,
        });
      }
    } catch (err) {
      setError(
        err?.response?.data?.error || 'Failed to disconnect. Please try again.',
      );
      setDisconnecting(false);
    }
    setConfirm(false);
  };
  if (loading) return <Spinner />;
  return (
    <div className={cn('[padding:32px_36px]')}>
      <h3
        className={cn(
          '[margin:0_0_4px]',
          '[font-size:18px]',
          '[font-weight:700]',
          '[color:var(--text-primary)]',
        )}
      >
        Agency Connection
      </h3>
      <p
        className={cn(
          '[margin:0_0_28px]',
          '[font-size:14px]',
          '[color:var(--text-secondary)]',
        )}
      >
        Manage your connection to your agency on Social Stats.
      </p>

      {!info?.connected ? (
        <div
          className={cn(
            '[display:flex]',
            '[align-items:flex-start]',
            '[gap:14px]',
            '[padding:16px_18px]',
            '[border-radius:14px]',
            '[background:linear-gradient(135deg,var(--surface-sunken),#f0f9ff)]',
            '[border:1px_solid_var(--border-default)]',
            '[background:linear-gradient(135deg,var(--surface-sunken),#f0f9ff)]',
            '[border:1px_solid_rgba(0,215,255,0.15)]',
            '[margin-top:8px]',
          )}
        >
          <Building2 size={18} color="var(--text-tertiary)" />
          <div>
            <p
              className={cn(
                '[margin:0_0_2px]',
                '[font-weight:700]',
                '[font-size:14px]',
                '[color:var(--text-primary)]',
              )}
            >
              No Agency Connected
            </p>
            <p
              className={cn(
                '[margin:0]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
              )}
            >
              You are not currently connected to any agency.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Agency card */}
          <div
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[gap:16px]',
              '[padding:20px_20px]',
              '[border-radius:16px]',
              '[margin-bottom:20px]',
              '[background:linear-gradient(135deg,#faf5ff,#f5f3ff)]',
              '[border:1px_solid_rgba(124,58,237,0.2)]',
            )}
          >
            <div
              className={cn(
                '[width:48px]',
                '[height:48px]',
                '[border-radius:14px]',
                '[background:rgba(124,58,237,0.1)]',
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:center]',
                '[flex-shrink:0]',
              )}
            >
              <Building2 size={22} color="#7c3aed" />
            </div>
            <div className={cn('[flex:1]')}>
              <p
                className={cn(
                  '[margin:0_0_2px]',
                  '[font-weight:700]',
                  '[font-size:16px]',
                  '[color:var(--text-primary)]',
                )}
              >
                {info.agency_name}
              </p>
              <p
                className={cn(
                  '[margin:0_0_6px]',
                  '[font-size:13px]',
                  '[color:var(--text-secondary)]',
                )}
              >
                {info.agency_email}
              </p>
              {info.agency_since && (
                <p
                  className={cn(
                    '[margin:0]',
                    '[font-size:12px]',
                    '[color:var(--text-tertiary)]',
                  )}
                >
                  Connected since{' '}
                  {new Date(info.agency_since).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
            <div
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[gap:6px]',
                '[padding:5px_12px]',
                '[border-radius:20px]',
                '[flex-shrink:0]',
                '[background:#dcfce7]',
                '[color:#166534]',
                '[font-size:12px]',
                '[font-weight:700]',
              )}
            >
              <span
                className={cn(
                  '[width:7px]',
                  '[height:7px]',
                  '[border-radius:50%]',
                  '[background:#16a34a]',
                  '[box-shadow:0_0_6px_rgba(22,163,74,0.6)]',
                )}
              />
              Connected
            </div>
          </div>

          {/* What agency can do */}
          <div
            className={cn(
              '[padding:16px_18px]',
              '[border-radius:14px]',
              '[margin-bottom:24px]',
              '[background:linear-gradient(135deg,#f0f9ff,#f8faff)]',
              '[border:1px_solid_rgba(0,215,255,0.15)]',
            )}
          >
            <p
              className={cn(
                '[margin:0_0_10px]',
                '[font-weight:600]',
                '[font-size:13px]',
                '[color:var(--text-secondary)]',
              )}
            >
              Your agency can:
            </p>
            {[
              'View your analytics and reports',
              'Manage your connected social accounts',
              'Create and schedule posts on your behalf',
              'Generate AI insights for your account',
            ].map((p) => (
              <div
                key={p}
                className={cn(
                  '[display:flex]',
                  '[align-items:center]',
                  '[gap:10px]',
                  '[margin-bottom:8px]',
                )}
              >
                <CheckCircle
                  size={14}
                  color="#16a34a"
                  className={cn('[flex-shrink:0]')}
                />
                <span
                  className={cn(
                    '[font-size:13px]',
                    '[color:var(--text-secondary)]',
                  )}
                >
                  {p}
                </span>
              </div>
            ))}
          </div>

          {error && <Alert type="error" msg={error} />}

          {/* Disconnect */}
          {!confirm ? (
            <button
              onClick={() => setConfirm(true)}
              className={cn(
                '[display:inline-flex]',
                '[align-items:center]',
                '[gap:8px]',
                '[padding:11px_22px]',
                '[border-radius:12px]',
                '[border:1.5px_solid_#fca5a5]',
                'bg-[var(--danger-bg)]',
                'text-destructive',
                '[font-size:14px]',
                '[font-weight:700]',
                '[cursor:pointer]',
              )}
            >
              <LogOut size={15} />
              Disconnect from Agency
            </button>
          ) : (
            <div
              className={cn(
                '[display:flex]',
                '[gap:14px]',
                '[padding:18px_20px]',
                '[border-radius:16px]',
                '[background:#fffbeb]',
                '[border:1px_solid_#fde68a]',
              )}
            >
              <AlertTriangle size={20} color="#d97706" />
              <div className={cn('[flex:1]')}>
                <p
                  className={cn(
                    '[margin:0_0_4px]',
                    '[font-weight:700]',
                    '[font-size:14px]',
                    '[color:var(--text-primary)]',
                  )}
                >
                  Confirm Disconnect
                </p>
                <p
                  className={cn(
                    '[margin:0_0_14px]',
                    '[font-size:13px]',
                    '[color:var(--text-secondary)]',
                    '[line-height:1.5]',
                  )}
                >
                  Are you sure you want to disconnect from{' '}
                  <strong>{info.agency_name}</strong>? They will lose access to
                  your account and be notified by email.
                </p>
                <div className={cn('[display:flex]', '[gap:10px]')}>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className={cn(
                      '[display:inline-flex]',
                      '[align-items:center]',
                      '[gap:6px]',
                      '[padding:10px_20px]',
                      '[border-radius:10px]',
                      '[border:none]',
                      '[background:#dc2626]',
                      '[color:var(--surface-card)]',
                      '[font-size:13px]',
                      '[font-weight:700]',
                      '[cursor:pointer]',
                    )}
                  >
                    {disconnecting ? (
                      <Loader2
                        size={14}
                        className={cn('[animation:spin_1s_linear_infinite]')}
                      />
                    ) : (
                      <LogOut size={14} />
                    )}
                    {disconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
                  </button>
                  <button
                    onClick={() => setConfirm(false)}
                    className={cn(
                      '[padding:10px_20px]',
                      '[border-radius:10px]',
                      '[border:1px_solid_var(--border-default)]',
                      '[background:var(--surface-card)]',
                      '[color:var(--text-secondary)]',
                      '[font-size:13px]',
                      '[font-weight:600]',
                      '[cursor:pointer]',
                    )}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────────

function Field({ label, required, children }) {
  const id = useId();
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="ds-field-label">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </label>
      {isValidElement(children)
        ? cloneElement(children, { id, required })
        : children}
    </div>
  );
}
function PwdInput({ value, onChange, placeholder, id, required }) {
  return (
    <Input
      id={id}
      required={required}
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
function Alert({ type, msg }) {
  const isError = type === 'error';
  return (
    <div
      className={cn(
        '[display:flex]',
        '[align-items:center]',
        '[gap:10px]',
        '[padding:12px_14px]',
        '[border-radius:12px]',
        '[margin-bottom:16px]',
        isError ? 'bg-[var(--danger-bg)]' : 'bg-[var(--success-bg)]',
        isError ? '[border:1px_solid_#fecaca]' : '[border:1px_solid_#bbf7d0]',
        isError ? '[color:#b91c1c]' : '[color:#166534]',
        '[font-size:13px]',
      )}
    >
      {isError ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
      {msg}
    </div>
  );
}
function Spinner() {
  return (
    <div
      className={cn(
        '[display:flex]',
        '[justify-content:center]',
        '[padding:48px]',
      )}
    >
      <Loader2
        size={28}
        color={CYAN}
        className={cn('[animation:spin_1s_linear_infinite]')}
      />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
