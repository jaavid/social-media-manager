/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Modal from '../../components/ui/Modal';
import Textarea from '../../components/ui/Textarea';
import Input from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { managementAPI } from '../../services/api';
import WorkspaceTeamPolicy from '../../components/WorkspaceTeamPolicy';
import {
  Users,
  UserCog,
  Shield,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
  RefreshCw,
  Eye,
  ToggleLeft,
  ToggleRight,
  Save,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import SegmentedTabs from '../../components/ui/SegmentedTabs';

// ─── helpers ────────────────────────────────────────────────────────────────

function Loader() {
  return (
    <div
      className={cn(
        '[padding:40px]',
        '[text-align:center]',
        '[color:var(--text-tertiary)]',
        '[font-size:14px]',
      )}
    >
      Loading…
    </div>
  );
}
function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <div
      className={cn(
        '[padding:10px_14px]',
        'bg-[var(--danger-bg)]',
        'text-destructive',
        '[border-radius:10px]',
        '[margin-bottom:14px]',
        '[font-size:13px]',
      )}
    >
      {msg}
    </div>
  );
}
function Chip({ label, color = '#00d7ff', bg = '#e6fbff' }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
      {label}
    </span>
  );
}

// Convert dict response from get_permissions_grouped to array for rendering
function dictToGroupsArray(dictData) {
  return Object.entries(dictData).map(([page, group]) => ({
    page,
    page_label: group.label,
    permissions: group.permissions.map((p) => ({
      ...p,
      value: p.effective !== undefined ? p.effective : p.is_granted,
    })),
  }));
}

// ─── Permission toggle row ───────────────────────────────────────────────────

function PermRow({ code, label, description, value, isOverride, onChange }) {
  return (
    <div
      className={cn(
        '[display:flex]',
        '[align-items:center]',
        '[justify-content:space-between]',
        '[padding:10px_0]',
        '[border-bottom:1px_solid_var(--surface-sunken)]',
      )}
    >
      <div
        className={cn('[flex:1]', '[min-width:0]', '[padding-inline-end:12px]')}
      >
        <div
          className={cn(
            '[font-size:13px]',
            '[font-weight:600]',
            '[color:var(--text-primary)]',
            '[margin-bottom:2px]',
          )}
        >
          {label}
        </div>
        {description && (
          <div
            className={cn(
              '[font-size:12px]',
              '[color:var(--text-secondary)]',
              '[margin-bottom:4px]',
            )}
          >
            {description}
          </div>
        )}
        {isOverride && (
          <Chip label="Custom override" color="#00d7ff" bg="#f3e8ff" />
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(code, !value)}
        className={cn(
          '[background:none]',
          '[border:none]',
          '[cursor:pointer]',
          '[padding:4px]',
        )}
      >
        {value ? (
          <ToggleRight size={28} color="#00d7ff" />
        ) : (
          <ToggleLeft size={28} color="var(--text-tertiary)" />
        )}
      </button>
    </div>
  );
}
// ─── Permission panel (shared by staff + client) ─────────────────────────────

function PermissionsPanel({ entityId, entityType }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [changed, setChanged] = useState({});
  const [open, setOpen] = useState({});
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fn =
        entityType === 'staff'
          ? managementAPI.getStaffPermissions
          : managementAPI.getWorkspacePermissions;
      const res = await fn(entityId);
      const arr = dictToGroupsArray(res.data);
      setGroups(arr);
      setChanged({});
      if (arr.length > 0) {
        setOpen({
          [arr[0].page]: true,
        });
      }
    } catch {
      setError('Failed to load permissions.');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);
  useEffect(() => {
    load();
  }, [load]);
  const handleToggle = (code, val) => {
    setChanged((prev) => ({
      ...prev,
      [code]: val,
    }));
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        permissions: g.permissions.map((p) =>
          p.code === code
            ? {
                ...p,
                value: val,
              }
            : p,
        ),
      })),
    );
  };
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const grants = Object.entries(changed)
        .filter(([, v]) => v)
        .map(([c]) => c);
      const revokes = Object.entries(changed)
        .filter(([, v]) => !v)
        .map(([c]) => c);
      const fn =
        entityType === 'staff'
          ? managementAPI.setStaffPermissions
          : managementAPI.setWorkspacePermissions;
      await fn(entityId, {
        grants,
        revokes,
      });
      await load();
    } catch {
      setError('Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };
  const handleReset = async () => {
    setSaving(true);
    setError('');
    try {
      const fn =
        entityType === 'staff'
          ? managementAPI.setStaffPermissions
          : managementAPI.setWorkspacePermissions;
      await fn(entityId, {
        reset_all: true,
      });
      await load();
    } catch {
      setError('Failed to reset permissions.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loader />;
  const hasChanges = Object.keys(changed).length > 0;
  return (
    <div>
      <ErrorMsg msg={error} />
      <div
        className={cn('[display:flex]', '[gap:8px]', '[margin-bottom:16px]')}
      >
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={cn(
            '[display:inline-flex]',
            '[align-items:center]',
            '[gap:6px]',
            '[padding:9px_16px]',
            '[border-radius:10px]',
            '[border:none]',
            '[background:var(--brand-primary)]',
            '[color:var(--text-primary)]',
            '[font-size:13px]',
            '[font-weight:700]',
            '[cursor:pointer]',
            !hasChanges ? '[opacity:0.5]' : '[opacity:1]',
          )}
        >
          <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className={cn(
            '[display:inline-flex]',
            '[align-items:center]',
            '[gap:6px]',
            '[padding:9px_16px]',
            '[border-radius:10px]',
            '[border:1px_solid_var(--border-default)]',
            '[background:var(--surface-card)]',
            '[color:var(--text-secondary)]',
            '[font-size:13px]',
            '[font-weight:700]',
            '[cursor:pointer]',
          )}
        >
          <RefreshCw size={14} /> Reset to Defaults
        </button>
      </div>
      {groups.map((group) => (
        <div
          key={group.page}
          className={cn(
            '[margin-bottom:10px]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:14px]',
            '[overflow:hidden]',
          )}
        >
          <button
            type="button"
            onClick={() =>
              setOpen((o) => ({
                ...o,
                [group.page]: !o[group.page],
              }))
            }
            className={cn(
              '[width:100%]',
              '[display:flex]',
              '[align-items:center]',
              '[gap:10px]',
              '[padding:12px_16px]',
              '[background:var(--surface-page)]',
              '[border:none]',
              '[cursor:pointer]',
              '[text-align:start]',
            )}
          >
            <span
              className={cn(
                '[flex:1]',
                '[font-size:13px]',
                '[font-weight:700]',
                '[color:var(--text-primary)]',
              )}
            >
              {group.page_label}
            </span>
            <span
              className={cn(
                '[font-size:11px]',
                '[color:var(--text-secondary)]',
              )}
            >
              {group.permissions.length} permissions
            </span>
            {open[group.page] ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
          {open[group.page] && (
            <div className={cn('[padding:0_16px_8px]')}>
              {group.permissions.map((p) => (
                <PermRow
                  key={p.code}
                  code={p.code}
                  label={p.label}
                  description={p.description}
                  value={p.value}
                  isOverride={p.is_override}
                  onChange={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
// ─── Portal Config panel (client only) ──────────────────────────────────────

function PortalConfigPanel({ clientId }) {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    managementAPI
      .getWorkspacePortalConfig(clientId)
      .then((res) => setCfg(res.data))
      .catch(() => setError('Failed to load portal config.'))
      .finally(() => setLoading(false));
  }, [clientId]);
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await managementAPI.saveWorkspacePortalConfig(clientId, cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loader />;
  if (!cfg) return <ErrorMsg msg={error || 'No config found.'} />;
  const toggles = [
    {
      key: 'show_posts_section',
      label: 'Posts Section',
    },
    {
      key: 'show_roi_section',
      label: 'ROI Section',
    },
    {
      key: 'show_calendar',
      label: 'Content Calendar',
    },
    {
      key: 'show_reviews_section',
      label: 'Reviews Section',
    },
    {
      key: 'show_export_button',
      label: 'Export Button',
    },
    {
      key: 'show_sync_button',
      label: 'Sync Button',
    },
  ];
  return (
    <div>
      <ErrorMsg msg={error} />
      <div className={cn('[margin-bottom:20px]')}>
        <div
          className={cn(
            '[font-size:13px]',
            '[font-weight:700]',
            '[color:var(--text-secondary)]',
            '[margin-bottom:12px]',
          )}
        >
          Visible Sections
        </div>
        {toggles.map((t) => (
          <div
            key={t.key}
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[justify-content:space-between]',
              '[margin-bottom:10px]',
            )}
          >
            <span
              className={cn('[font-size:14px]', '[color:var(--text-primary)]')}
            >
              {t.label}
            </span>
            <button
              type="button"
              onClick={() =>
                setCfg((prev) => ({
                  ...prev,
                  [t.key]: !prev[t.key],
                }))
              }
              className={cn(
                '[background:none]',
                '[border:none]',
                '[cursor:pointer]',
              )}
            >
              {cfg[t.key] ? (
                <ToggleRight size={28} color="#00d7ff" />
              ) : (
                <ToggleLeft size={28} color="var(--text-tertiary)" />
              )}
            </button>
          </div>
        ))}
      </div>
      <div className={cn('[margin-bottom:20px]')}>
        <Input
          type="text"
          value={cfg.portal_title || ''}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              portal_title: e.target.value,
            }))
          }
          placeholder="Custom portal title…"
          label={<>Portal Title</>}
        />
      </div>
      <div className={cn('[margin-bottom:20px]')}>
        <label
          className={cn(
            '[display:block]',
            '[font-size:12px]',
            '[font-weight:700]',
            '[color:var(--text-secondary)]',
            '[margin-bottom:6px]',
            '[text-transform:uppercase]',
            '[letter-spacing:0.06em]',
          )}
        >
          Accent Color
        </label>
        <div
          className={cn('[display:flex]', '[align-items:center]', '[gap:10px]')}
        >
          <Input
            type="color"
            value={cfg.custom_accent_color || '#00d7ff'}
            onChange={(e) =>
              setCfg((prev) => ({
                ...prev,
                custom_accent_color: e.target.value,
              }))
            }
          />

          <span
            className={cn('[font-size:13px]', '[color:var(--text-secondary)]')}
          >
            {cfg.custom_accent_color || '#00d7ff'}
          </span>
        </div>
      </div>
      <div className={cn('[margin-bottom:20px]')}>
        <Textarea
          value={cfg.welcome_message || ''}
          onChange={(e) =>
            setCfg((prev) => ({
              ...prev,
              welcome_message: e.target.value,
            }))
          }
          placeholder="Optional message shown on user dashboard…"
          rows={3}
          label={<>Welcome Message</>}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          '[display:inline-flex]',
          '[align-items:center]',
          '[gap:6px]',
          '[padding:9px_16px]',
          '[border-radius:10px]',
          '[border:none]',
          '[background:var(--brand-primary)]',
          '[color:var(--text-primary)]',
          '[font-size:13px]',
          '[font-weight:700]',
          '[cursor:pointer]',
        )}
      >
        <Save size={14} />{' '}
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Config'}
      </button>
    </div>
  );
}
// ─── Staff Client Assignments panel ─────────────────────────────────────────

function StaffClientsPanel({ staffId }) {
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignedRes, allRes] = await Promise.all([
        managementAPI.getStaffWorkspaces(staffId),
        managementAPI.listWorkspaces(),
      ]);
      const assignedList = assignedRes.data;
      const assignedIds = new Set(assignedList.map((c) => c.id));
      setAssigned(assignedList);
      setAvailable(allRes.data.filter((c) => !assignedIds.has(c.id)));
    } catch {
      setError('Failed to load workspace assignments.');
    } finally {
      setLoading(false);
    }
  }, [staffId]);
  useEffect(() => {
    load();
  }, [load]);
  const handleAdd = async (clientId) => {
    setSaving(true);
    try {
      await managementAPI.setStaffWorkspaces(staffId, {
        add: [
          {
            client_id: clientId,
          },
        ],
        remove: [],
      });
      await load();
    } catch {
      setError('Failed to add workspace.');
    } finally {
      setSaving(false);
    }
  };
  const handleRemove = async (clientId) => {
    setSaving(true);
    try {
      await managementAPI.setStaffWorkspaces(staffId, {
        add: [],
        remove: [clientId],
      });
      await load();
    } catch {
      setError('Failed to remove workspace.');
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <Loader />;
  return (
    <div>
      <ErrorMsg msg={error} />
      <div className={cn('[margin-bottom:16px]')}>
        <div
          className={cn(
            '[font-size:12px]',
            '[font-weight:700]',
            '[color:var(--text-tertiary)]',
            '[text-transform:uppercase]',
            '[letter-spacing:0.1em]',
            '[margin-bottom:8px]',
          )}
        >
          Assigned Users ({assigned.length})
        </div>
        {assigned.length === 0 && (
          <div
            className={cn('[font-size:13px]', '[color:var(--text-tertiary)]')}
          >
            No users assigned yet.
          </div>
        )}
        {assigned.map((c) => (
          <div
            key={c.id}
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[justify-content:space-between]',
              '[padding:8px_12px]',
              '[border-radius:10px]',
              '[background:var(--surface-page)]',
              '[margin-bottom:6px]',
            )}
          >
            <span
              className={cn(
                '[font-size:13px]',
                '[font-weight:600]',
                '[color:var(--text-primary)]',
              )}
            >
              {c.company}
            </span>
            <button
              onClick={() => handleRemove(c.id)}
              disabled={saving}
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[gap:4px]',
                '[padding:4px_10px]',
                '[border:1px_solid_#fca5a5]',
                '[border-radius:8px]',
                '[background:var(--surface-card)]',
                'text-destructive',
                '[font-size:12px]',
                '[font-weight:600]',
                '[cursor:pointer]',
              )}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {available.length > 0 && (
        <div>
          <div
            className={cn(
              '[font-size:12px]',
              '[font-weight:700]',
              '[color:var(--text-tertiary)]',
              '[text-transform:uppercase]',
              '[letter-spacing:0.1em]',
              '[margin-bottom:8px]',
            )}
          >
            Add User
          </div>
          {available.map((c) => (
            <div
              key={c.id}
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:space-between]',
                '[padding:8px_12px]',
                '[border-radius:10px]',
                '[background:var(--surface-page)]',
                '[margin-bottom:6px]',
              )}
            >
              <span
                className={cn(
                  '[font-size:13px]',
                  '[font-weight:600]',
                  '[color:var(--text-primary)]',
                )}
              >
                {c.company}
              </span>
              <button
                onClick={() => handleAdd(c.id)}
                disabled={saving}
                className={cn(
                  '[display:flex]',
                  '[align-items:center]',
                  '[gap:4px]',
                  '[padding:4px_10px]',
                  '[border:1px_solid_#99eeff]',
                  '[border-radius:8px]',
                  '[background:var(--surface-card)]',
                  '[color:var(--brand-primary)]',
                  '[font-size:12px]',
                  '[font-weight:600]',
                  '[cursor:pointer]',
                )}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── Create Staff Modal ──────────────────────────────────────────────────────

function CreateStaffModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = {
        ...prev,
      };
      delete next[field];
      return next;
    });
  };
  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Full name is required.';
    if (!form.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email))
      nextErrors.email = 'Enter a valid email address.';
    if (!form.password.trim()) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await managementAPI.createStaff(form);
      onCreated(res.data);
      onClose();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.error ||
          (typeof data === 'object'
            ? JSON.stringify(data)
            : 'Failed to create staff.'),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Add Staff Member" size="sm">
      <form onSubmit={handleSubmit}>
        <ErrorMsg msg={error} />
        {[
          {
            key: 'name',
            label: 'Full Name',
            placeholder: 'Jane Smith',
          },
          {
            key: 'email',
            label: 'Email',
            placeholder: 'jane@agency.com',
            type: 'email',
          },
          {
            key: 'password',
            label: 'Password',
            placeholder: '••••••••',
            type: 'password',
          },
        ].map((f) => (
          <div key={f.key} className={cn('[margin-bottom:14px]')}>
            <Input
              type={f.type || 'text'}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              required
              error={errors[f.key]}
              label={
                <>
                  {f.label}{' '}
                  <span
                    className={cn(
                      'text-destructive',
                      '[margin-inline-start:2px]',
                      '[font-weight:800]',
                      '[text-transform:none]',
                      '[letter-spacing:normal]',
                    )}
                  >
                    *
                  </span>
                </>
              }
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={saving}
          className={cn(
            '[display:inline-flex]',
            '[align-items:center]',
            '[gap:6px]',
            '[padding:9px_16px]',
            '[border-radius:10px]',
            '[border:none]',
            '[background:var(--brand-primary)]',
            '[color:var(--text-primary)]',
            '[font-size:13px]',
            '[font-weight:700]',
            '[cursor:pointer]',
            '[width:100%]',
            '[justify-content:center]',
          )}
        >
          {saving ? 'Creating…' : 'Create Staff Member'}
        </button>
      </form>
    </Modal>
  );
}
// ─── Staff Tab ───────────────────────────────────────────────────────────────

function StaffTab() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [activePanel, setPanel] = useState('permissions');
  const [createOpen, setCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await managementAPI.listStaff();
      setStaff(res.data);
    } catch {
      setError('Failed to load staff.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this staff member?')) return;
    setDeleting(id);
    try {
      await managementAPI.deleteStaff(id);
      setStaff((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                is_active: false,
              }
            : s,
        ),
      );
      if (selected?.id === id) setSelected(null);
    } catch {
      setError('Failed to deactivate.');
    } finally {
      setDeleting(null);
    }
  };
  if (loading) return <Loader />;
  return (
    <div
      className={cn(
        'management-split',
        '[display:flex]',
        '[gap:0]',
        '[min-height:500px]',
        '[border:1px_solid_var(--border-default)]',
        '[border-radius:16px]',
        '[overflow:hidden]',
      )}
    >
      <div
        className={cn(
          'management-list',
          '[width:280px]',
          '[flex-shrink:0]',
          '[border-inline-end:1px_solid_var(--border-default)]',
          '[display:flex]',
          '[flex-direction:column]',
          '[overflow-y:auto]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:space-between]',
            '[padding:14px_16px]',
            '[border-bottom:1px_solid_var(--surface-sunken)]',
            '[flex-shrink:0]',
          )}
        >
          <span
            className={cn(
              '[font-size:13px]',
              '[font-weight:700]',
              '[color:var(--text-primary)]',
            )}
          >
            Staff Members ({staff.length})
          </span>
          <button
            onClick={() => setCreate(true)}
            className={cn(
              '[display:inline-flex]',
              '[align-items:center]',
              '[gap:6px]',
              '[padding:9px_16px]',
              '[border-radius:10px]',
              '[border:none]',
              '[background:var(--brand-primary)]',
              '[color:var(--text-primary)]',
              '[font-size:13px]',
              '[font-weight:700]',
              '[cursor:pointer]',
            )}
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <ErrorMsg msg={error} />
        {staff.length === 0 && (
          <div
            className={cn(
              '[font-size:13px]',
              '[color:var(--text-tertiary)]',
              '[padding:12px_16px]',
            )}
          >
            No staff yet.
          </div>
        )}
        {staff.map((s) => {
          const initials = (s.name || s.email || '?')
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          return (
            <div
              key={s.id}
              onClick={() => setSelected(s)}
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[gap:10px]',
                '[padding:10px_14px]',
                '[cursor:pointer]',
                '[border-bottom:1px_solid_var(--surface-sunken)]',
                '[transition:background_0.15s]',
                selected?.id === s.id ? cn('[background:#e6fbff]') : cn(),
              )}
            >
              <div
                className={cn(
                  '[width:34px]',
                  '[height:34px]',
                  '[border-radius:10px]',
                  '[background:linear-gradient(180deg,_#e6fbff_0%,_#e6fbff_100%)]',
                  '[color:var(--brand-primary)]',
                  '[display:flex]',
                  '[align-items:center]',
                  '[justify-content:center]',
                  '[font-size:13px]',
                  '[font-weight:800]',
                  '[flex-shrink:0]',
                )}
              >
                {initials}
              </div>
              <div className={cn('[flex:1]', '[min-width:0]')}>
                <div
                  className={cn(
                    '[font-size:13px]',
                    '[font-weight:700]',
                    '[color:var(--text-primary)]',
                    '[white-space:nowrap]',
                    '[overflow:hidden]',
                    '[text-overflow:ellipsis]',
                  )}
                >
                  {s.name || s.email}
                </div>
                <div
                  className={cn(
                    '[font-size:11px]',
                    '[color:var(--text-secondary)]',
                    '[white-space:nowrap]',
                    '[overflow:hidden]',
                    '[text-overflow:ellipsis]',
                  )}
                >
                  {s.email}
                </div>
              </div>
              {!s.is_active && (
                <Chip
                  label="Inactive"
                  color="var(--text-secondary)"
                  bg="var(--surface-sunken)"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(s.id);
                }}
                disabled={deleting === s.id}
                className={cn(
                  '[background:none]',
                  '[border:none]',
                  '[cursor:pointer]',
                  '[color:var(--text-tertiary)]',
                  '[padding:4px]',
                  '[flex-shrink:0]',
                )}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className={cn('[flex:1]', '[padding:24px]', '[overflow-y:auto]')}>
        {!selected ? (
          <div
            className={cn(
              '[display:flex]',
              '[flex-direction:column]',
              '[align-items:center]',
              '[justify-content:center]',
              '[height:100%]',
              '[color:var(--text-tertiary)]',
              '[font-size:13px]',
              '[gap:12px]',
              '[text-align:center]',
            )}
          >
            <UserCog size={36} color="var(--text-quaternary)" />
            <p>Select a staff member to manage permissions and user access.</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:space-between]',
                '[margin-bottom:20px]',
                '[padding-bottom:16px]',
                '[border-bottom:1px_solid_var(--surface-sunken)]',
              )}
            >
              <div>
                <div
                  className={cn(
                    '[font-size:16px]',
                    '[font-weight:800]',
                    '[color:var(--text-primary)]',
                  )}
                >
                  {selected.name || selected.email}
                </div>
                <div
                  className={cn(
                    '[font-size:12px]',
                    '[color:var(--text-secondary)]',
                    '[margin-top:2px]',
                  )}
                >
                  {selected.email}
                </div>
              </div>
              <SegmentedTabs
                items={[
                  {
                    id: 'permissions',
                    label: 'Permissions',
                    icon: <Shield size={13} />,
                  },
                  {
                    id: 'clients',
                    label: 'Users',
                    icon: <Users size={13} />,
                  },
                ]}
                active={activePanel}
                onChange={setPanel}
                compact
              />
            </div>
            {activePanel === 'permissions' ? (
              <PermissionsPanel entityId={selected.id} entityType="staff" />
            ) : (
              <StaffClientsPanel staffId={selected.id} />
            )}
          </>
        )}
      </div>

      {createOpen && (
        <CreateStaffModal
          onClose={() => setCreate(false)}
          onCreated={(s) => {
            setStaff((prev) => [...prev, s]);
            setSelected(s);
          }}
        />
      )}
    </div>
  );
}

// ─── Clients Tab ────────────────────────────────────────────────────────────

function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [activePanel, setPanel] = useState('permissions');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await managementAPI.listWorkspaces();
      setClients(res.data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (loading) return <Loader />;
  return (
    <div
      className={cn(
        'management-split',
        '[display:flex]',
        '[gap:0]',
        '[min-height:500px]',
        '[border:1px_solid_var(--border-default)]',
        '[border-radius:16px]',
        '[overflow:hidden]',
      )}
    >
      <div
        className={cn(
          'management-list',
          '[width:280px]',
          '[flex-shrink:0]',
          '[border-inline-end:1px_solid_var(--border-default)]',
          '[display:flex]',
          '[flex-direction:column]',
          '[overflow-y:auto]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:space-between]',
            '[padding:14px_16px]',
            '[border-bottom:1px_solid_var(--surface-sunken)]',
            '[flex-shrink:0]',
          )}
        >
          <span
            className={cn(
              '[font-size:13px]',
              '[font-weight:700]',
              '[color:var(--text-primary)]',
            )}
          >
            Users ({clients.length})
          </span>
        </div>
        <ErrorMsg msg={error} />
        {clients.length === 0 && (
          <div
            className={cn(
              '[font-size:13px]',
              '[color:var(--text-tertiary)]',
              '[padding:12px_16px]',
            )}
          >
            No users found.
          </div>
        )}
        {clients.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[gap:10px]',
              '[padding:10px_14px]',
              '[cursor:pointer]',
              '[border-bottom:1px_solid_var(--surface-sunken)]',
              '[transition:background_0.15s]',
              selected?.id === c.id ? cn('[background:#e6fbff]') : cn(),
            )}
          >
            <div
              className={cn(
                '[width:34px]',
                '[height:34px]',
                '[border-radius:10px]',
                '[background:linear-gradient(180deg,_#e6fbff_0%,_#e6fbff_100%)]',
                '[color:var(--brand-primary)]',
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:center]',
                '[font-size:13px]',
                '[font-weight:800]',
                '[flex-shrink:0]',
              )}
            >
              {(c.company?.[0] || '?').toUpperCase()}
            </div>
            <div className={cn('[flex:1]', '[min-width:0]')}>
              <div
                className={cn(
                  '[font-size:13px]',
                  '[font-weight:700]',
                  '[color:var(--text-primary)]',
                  '[white-space:nowrap]',
                  '[overflow:hidden]',
                  '[text-overflow:ellipsis]',
                )}
              >
                {c.company}
              </div>
              <div
                className={cn(
                  '[font-size:11px]',
                  '[color:var(--text-secondary)]',
                  '[white-space:nowrap]',
                  '[overflow:hidden]',
                  '[text-overflow:ellipsis]',
                )}
              >
                {c.email || '—'}
              </div>
            </div>
            {c.is_active ? (
              <Chip label="Active" color="#15803d" bg="#dcfce7" />
            ) : (
              <Chip
                label="Inactive"
                color="var(--text-secondary)"
                bg="var(--surface-sunken)"
              />
            )}
          </div>
        ))}
      </div>

      <div className={cn('[flex:1]', '[padding:24px]', '[overflow-y:auto]')}>
        {!selected ? (
          <div
            className={cn(
              '[display:flex]',
              '[flex-direction:column]',
              '[align-items:center]',
              '[justify-content:center]',
              '[height:100%]',
              '[color:var(--text-tertiary)]',
              '[font-size:13px]',
              '[gap:12px]',
              '[text-align:center]',
            )}
          >
            <Users size={36} color="var(--text-quaternary)" />
            <p>
              Select a user to manage their permissions and portal
              configuration.
            </p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[justify-content:space-between]',
                '[margin-bottom:20px]',
                '[padding-bottom:16px]',
                '[border-bottom:1px_solid_var(--surface-sunken)]',
              )}
            >
              <div>
                <div
                  className={cn(
                    '[font-size:16px]',
                    '[font-weight:800]',
                    '[color:var(--text-primary)]',
                  )}
                >
                  {selected.company}
                </div>
                <div
                  className={cn(
                    '[font-size:12px]',
                    '[color:var(--text-secondary)]',
                    '[margin-top:2px]',
                  )}
                >
                  {selected.email || 'No email'}
                </div>
              </div>
              <SegmentedTabs
                items={[
                  {
                    id: 'permissions',
                    label: 'Permissions',
                    icon: <Shield size={13} />,
                  },
                  {
                    id: 'portal',
                    label: 'Portal Config',
                    icon: <Eye size={13} />,
                  },
                ]}
                active={activePanel}
                onChange={setPanel}
                compact
              />
            </div>
            {activePanel === 'permissions' ? (
              <PermissionsPanel entityId={selected.id} entityType="client" />
            ) : (
              <PortalConfigPanel clientId={selected.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Role Defaults Tab ───────────────────────────────────────────────────────

function RoleDefaultsTab() {
  const [role, setRole] = useState('staff');
  const [groups, setGroups] = useState([]);
  const [origValues, setOrig] = useState({}); // { code: bool } — snapshot for diffing
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({});
  const [saved, setSaved] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await managementAPI.getRoleDefaults(role);
      // res.data = { role, groups: { page_key: { label, permissions: [{code, label, is_granted}] } } }
      const arr = Object.entries(res.data.groups || {}).map(([page, g]) => ({
        page,
        page_label: g.label,
        permissions: g.permissions.map((p) => ({
          ...p,
          value: p.is_granted,
        })),
      }));
      setGroups(arr);
      // Build original snapshot for diffing
      const snap = {};
      arr.forEach((g) =>
        g.permissions.forEach((p) => {
          snap[p.code] = p.is_granted;
        }),
      );
      setOrig(snap);
      if (arr.length > 0)
        setOpen({
          [arr[0].page]: true,
        });
    } catch {
      setError('Failed to load role defaults.');
    } finally {
      setLoading(false);
    }
  }, [role]);
  useEffect(() => {
    load();
  }, [load]);
  const handleToggle = (code, val) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        permissions: g.permissions.map((p) =>
          p.code === code
            ? {
                ...p,
                value: val,
              }
            : p,
        ),
      })),
    );
  };
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    // Diff current vs original to build grants/revokes
    const grants = [];
    const revokes = [];
    groups.forEach((g) =>
      g.permissions.forEach((p) => {
        if (p.value !== origValues[p.code]) {
          (p.value ? grants : revokes).push(p.code);
        }
      }),
    );
    try {
      await managementAPI.setRoleDefaults(role, {
        grants,
        revokes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await load();
    } catch {
      setError('Failed to save role defaults.');
    } finally {
      setSaving(false);
    }
  };

  // Detect any changes from original
  const hasChanges = groups.some((g) =>
    g.permissions.some((p) => p.value !== origValues[p.code]),
  );
  return (
    <div>
      <div
        className={cn(
          '[display:flex]',
          '[align-items:center]',
          '[gap:12px]',
          '[margin-bottom:20px]',
        )}
      >
        <span
          className={cn(
            '[font-size:14px]',
            '[font-weight:700]',
            '[color:var(--text-secondary)]',
          )}
        >
          Role:
        </span>
        <SegmentedTabs
          items={[
            {
              id: 'staff',
              label: 'Staff',
            },
            {
              id: 'client',
              label: 'Workspace member',
            },
          ]}
          active={role}
          onChange={setRole}
          compact
        />
      </div>
      <ErrorMsg msg={error} />
      {loading ? (
        <Loader />
      ) : (
        <>
          <div
            className={cn(
              '[display:flex]',
              '[gap:8px]',
              '[margin-bottom:16px]',
            )}
          >
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={cn(
                '[display:inline-flex]',
                '[align-items:center]',
                '[gap:6px]',
                '[padding:9px_16px]',
                '[border-radius:10px]',
                '[border:none]',
                '[background:var(--brand-primary)]',
                '[color:var(--text-primary)]',
                '[font-size:13px]',
                '[font-weight:700]',
                '[cursor:pointer]',
                !hasChanges ? '[opacity:0.5]' : '[opacity:1]',
              )}
            >
              <Save size={14} />{' '}
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Defaults'}
            </button>
          </div>
          {groups.map((group) => (
            <div
              key={group.page}
              className={cn(
                '[margin-bottom:10px]',
                '[border:1px_solid_var(--border-default)]',
                '[border-radius:14px]',
                '[overflow:hidden]',
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setOpen((o) => ({
                    ...o,
                    [group.page]: !o[group.page],
                  }))
                }
                className={cn(
                  '[width:100%]',
                  '[display:flex]',
                  '[align-items:center]',
                  '[gap:10px]',
                  '[padding:12px_16px]',
                  '[background:var(--surface-page)]',
                  '[border:none]',
                  '[cursor:pointer]',
                  '[text-align:start]',
                )}
              >
                <span
                  className={cn(
                    '[flex:1]',
                    '[font-size:13px]',
                    '[font-weight:700]',
                    '[color:var(--text-primary)]',
                  )}
                >
                  {group.page_label}
                </span>
                <span
                  className={cn(
                    '[font-size:11px]',
                    '[color:var(--text-secondary)]',
                  )}
                >
                  {group.permissions.length} permissions
                </span>
                {open[group.page] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
              {open[group.page] && (
                <div className={cn('[padding:0_16px_8px]')}>
                  {group.permissions.map((p) => (
                    <PermRow
                      key={p.code}
                      code={p.code}
                      label={p.label}
                      description={p.description}
                      value={p.value}
                      isOverride={false}
                      onChange={handleToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Shared styles ───────────────────────────────────────────────────────────

// ─── Main ManagementPage ─────────────────────────────────────────────────────

const TABS = [
  {
    id: 'team-policy',
    label: 'Workspace Team',
    icon: Users,
  },
  {
    id: 'staff',
    label: 'Staff Members',
    icon: UserCog,
  },
  {
    id: 'clients',
    label: 'User Access',
    icon: Users,
  },
  {
    id: 'defaults',
    label: 'Role Defaults',
    icon: Shield,
  },
];
export default function ManagementPage() {
  const [activeTab, setTab] = useState('staff');
  return (
    <div className="app-page app-page--md">
      <PageHeader
        title="Access Management"
        subtitle="Manage staff permissions, user access, and role defaults"
      />

      <SegmentedTabs
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          icon: <t.icon size={15} />,
        }))}
        active={activeTab}
        onChange={setTab}
        compact
        className={cn('[margin-bottom:24px]')}
      />

      <div className={cn('[padding-top:8px]')}>
        {activeTab === 'team-policy' && <WorkspaceTeamPolicy />}
        {activeTab === 'staff' && <StaffTab />}
        {activeTab === 'clients' && <ClientsTab />}
        {activeTab === 'defaults' && <RoleDefaultsTab />}
      </div>
    </div>
  );
}
