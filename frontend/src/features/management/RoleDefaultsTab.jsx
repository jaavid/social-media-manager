/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import { cn } from '../../lib/utils';

import { useState, useEffect, useCallback } from 'react';

import { managementAPI } from '@/services/domains/marketplace';

import { ChevronDown, ChevronRight, Save } from 'lucide-react';

import SegmentedTabs from '../../components/ui/SegmentedTabs';

import { Loader, ErrorMsg, PermRow } from './ManagementPanels';

export function RoleDefaultsTab() {
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
  const hasChanges = groups.some((g) => g.permissions.some((p) => p.value !== origValues[p.code]));
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
          className={cn('[font-size:14px]', '[font-weight:700]', '[color:var(--text-secondary)]')}
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
              <Save size={14} /> {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Defaults'}
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
