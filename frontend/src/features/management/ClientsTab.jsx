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

import { Users, Shield, Eye } from 'lucide-react';

import SegmentedTabs from '../../components/ui/SegmentedTabs';

import { Loader, ErrorMsg, Chip, PermissionsPanel, PortalConfigPanel } from './ManagementPanels';

export function ClientsTab() {
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
            className={cn('[font-size:13px]', '[font-weight:700]', '[color:var(--text-primary)]')}
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
              <Chip label="Inactive" color="var(--text-secondary)" bg="var(--surface-sunken)" />
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
            <p>Select a user to manage their permissions and portal configuration.</p>
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
