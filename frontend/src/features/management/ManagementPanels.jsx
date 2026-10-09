/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import Textarea from '../../components/ui/Textarea';

import Input from '../../components/ui/Input';

import { cn } from '../../lib/utils';

import { useState, useEffect, useCallback } from 'react';

import { managementAPI } from '@/services/domains/marketplace';

import {
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Save,
} from 'lucide-react';

export function Loader() {
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

export function ErrorMsg({ msg }) {
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

export function Chip({ label, color = '#00d7ff', bg = '#e6fbff' }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
      {label}
    </span>
  );
}

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

export function PermRow({ code, label, description, value, isOverride, onChange }) {
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
      <div className={cn('[flex:1]', '[min-width:0]', '[padding-inline-end:12px]')}>
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
        {isOverride && <Chip label="Custom override" color="#00d7ff" bg="#f3e8ff" />}
      </div>
      <button
        type="button"
        onClick={() => onChange(code, !value)}
        className={cn('[background:none]', '[border:none]', '[cursor:pointer]', '[padding:4px]')}
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

export function PermissionsPanel({ entityId, entityType }) {
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
      <div className={cn('[display:flex]', '[gap:8px]', '[margin-bottom:16px]')}>
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
            <span className={cn('[font-size:11px]', '[color:var(--text-secondary)]')}>
              {group.permissions.length} permissions
            </span>
            {open[group.page] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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

export function PortalConfigPanel({ clientId }) {
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
            <span className={cn('[font-size:14px]', '[color:var(--text-primary)]')}>{t.label}</span>
            <button
              type="button"
              onClick={() =>
                setCfg((prev) => ({
                  ...prev,
                  [t.key]: !prev[t.key],
                }))
              }
              className={cn('[background:none]', '[border:none]', '[cursor:pointer]')}
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
        <div className={cn('[display:flex]', '[align-items:center]', '[gap:10px]')}>
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

          <span className={cn('[font-size:13px]', '[color:var(--text-secondary)]')}>
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
        <Save size={14} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Config'}
      </button>
    </div>
  );
}

export function StaffClientsPanel({ staffId }) {
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
          <div className={cn('[font-size:13px]', '[color:var(--text-tertiary)]')}>
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
              className={cn('[font-size:13px]', '[font-weight:600]', '[color:var(--text-primary)]')}
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
