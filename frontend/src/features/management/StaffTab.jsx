/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

import Modal from '../../components/ui/Modal';

import Input from '../../components/ui/Input';

import { cn } from '../../lib/utils';

import { useState, useEffect, useCallback } from 'react';

import { managementAPI } from '@/services/domains/marketplace';

import { Users, UserCog, Shield, Plus, Trash2 } from 'lucide-react';

import SegmentedTabs from '../../components/ui/SegmentedTabs';

import { Loader, ErrorMsg, Chip, PermissionsPanel, StaffClientsPanel } from './ManagementPanels';

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
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
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
          (typeof data === 'object' ? JSON.stringify(data) : 'Failed to create staff.'),
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

export function StaffTab() {
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
            className={cn('[font-size:13px]', '[font-weight:700]', '[color:var(--text-primary)]')}
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
                  <bdi dir="auto">{s.name || s.email}</bdi>
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
                  <bdi dir="ltr">{s.email}</bdi>
                </div>
              </div>
              {!s.is_active && (
                <Chip label="Inactive" color="var(--text-secondary)" bg="var(--surface-sunken)" />
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
                  <bdi dir="auto">{selected.name || selected.email}</bdi>
                </div>
                <div
                  className={cn(
                    '[font-size:12px]',
                    '[color:var(--text-secondary)]',
                    '[margin-top:2px]',
                  )}
                >
                  <bdi dir="ltr">{selected.email}</bdi>
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
