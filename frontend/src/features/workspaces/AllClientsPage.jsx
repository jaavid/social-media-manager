/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Input from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { useAppNavigate as useNavigate } from '../../core/navigation';
import { useWorkspaces } from '../../hooks/useData';
import { invitationAPI, workspacesAPI } from '../../services/api';
import {
  Search,
  ChevronRight,
  Settings,
  Mail,
  X,
  Loader2,
  Users,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Building2,
  UserCheck,
  Zap,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
const STATUS_COLOR = {
  pending: {
    text: '#d97706',
    bg: '#fef3c7',
    label: 'Pending',
  },
  accepted: {
    text: '#16a34a',
    bg: '#dcfce7',
    label: 'Accepted',
  },
  rejected: {
    text: '#dc2626',
    bg: '#fee2e2',
    label: 'Rejected',
  },
  expired: {
    text: 'var(--text-tertiary)',
    bg: 'var(--surface-sunken)',
    label: 'Expired',
  },
  cancelled: {
    text: 'var(--text-tertiary)',
    bg: 'var(--surface-sunken)',
    label: 'Canceled',
  },
};
export default function AllClientsPage({ onSelectClient }) {
  const navigate = useNavigate();
  const { workspaces: clients } = useWorkspaces();
  const [search, setSearch] = useState('');

  // ── Sync state ───────────────────────────────────────────────────────────────
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null); // per-client sync
  const [syncMsg, setSyncMsg] = useState('');
  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncMsg('');
    try {
      const res = await workspacesAPI.syncAll();
      setSyncMsg(`Queued sync for ${res.data.queued_clients} workspace(s).`);
      setTimeout(() => setSyncMsg(''), 5000);
    } catch {
      setSyncMsg('Sync failed. Please try again.');
    } finally {
      setSyncingAll(false);
    }
  };
  const handleSyncOne = async (clientId) => {
    setSyncingId(clientId);
    try {
      await workspacesAPI.triggerSync(clientId);
    } catch {
      /* ignore */
    } finally {
      setSyncingId(null);
    }
  };

  // ── Invite form ─────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(''); // '' | 'success' | 'error:…'

  // ── Invitations list ─────────────────────────────────────────────────────────
  const [invitations, setInvitations] = useState([]);
  const [loadingInvList, setLoadingInvList] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);
  const fetchInvitations = useCallback(async () => {
    setLoadingInvList(true);
    try {
      const res = await invitationAPI.mine();
      setInvitations(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoadingInvList(false);
    }
  }, []);
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult('');
    try {
      await invitationAPI.send({
        client_email: inviteEmail.trim().toLowerCase(),
        message: inviteMsg.trim(),
      });
      setInviteResult('success');
      setInviteEmail('');
      setInviteMsg('');
      fetchInvitations();
    } catch (err) {
      setInviteResult(
        'error:' + (err?.response?.data?.error || 'Failed to send invitation.'),
      );
    } finally {
      setInviting(false);
    }
  };
  const handleCancelInv = async (id) => {
    setCancelingId(id);
    try {
      await invitationAPI.cancel(id);
      fetchInvitations();
    } catch {
      /* ignore */
    } finally {
      setCancelingId(null);
    }
  };

  // ── Derived stats ────────────────────────────────────────────────────────────
  const pendingCount = invitations.filter(
    (i) => i.status === 'pending' && !i.is_expired,
  ).length;
  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.company?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });
  return (
    <div
      className={cn(
        '[padding:28px_32px]',
        '[max-width:1400px]',
        '[margin:0_auto]',
      )}
    >
      <PageHeader
        title="Workspaces"
        subtitle={`${clients.length} connected workspace${clients.length !== 1 ? 's' : ''}`}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          '[display:flex]',
          '[gap:14px]',
          '[margin-bottom:24px]',
          '[flex-wrap:wrap]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[gap:12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_#e8edf2]',
            '[border-radius:12px]',
            '[padding:14px_20px]',
            '[flex:1_1_160px]',
          )}
        >
          <UserCheck size={18} className={cn('[color:#16a34a]')} />
          <div>
            <div
              className={cn(
                '[font-size:22px]',
                '[font-weight:800]',
                '[color:var(--text-primary)]',
                '[line-height:1.1]',
              )}
            >
              {clients.length}
            </div>
            <div
              className={cn(
                '[font-size:11px]',
                '[color:var(--text-tertiary)]',
                '[font-weight:600]',
                '[margin-top:2px]',
                '[text-transform:uppercase]',
                '[letter-spacing:0.05em]',
              )}
            >
              Connected Workspaces
            </div>
          </div>
        </div>
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[gap:12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_#e8edf2]',
            '[border-radius:12px]',
            '[padding:14px_20px]',
            '[flex:1_1_160px]',
          )}
        >
          <Clock size={18} className={cn('[color:#d97706]')} />
          <div>
            <div
              className={cn(
                '[font-size:22px]',
                '[font-weight:800]',
                '[color:var(--text-primary)]',
                '[line-height:1.1]',
              )}
            >
              {pendingCount}
            </div>
            <div
              className={cn(
                '[font-size:11px]',
                '[color:var(--text-tertiary)]',
                '[font-weight:600]',
                '[margin-top:2px]',
                '[text-transform:uppercase]',
                '[letter-spacing:0.05em]',
              )}
            >
              Pending Invitations
            </div>
          </div>
        </div>
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[gap:12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_#e8edf2]',
            '[border-radius:12px]',
            '[padding:14px_20px]',
            '[flex:1_1_160px]',
          )}
        >
          <Mail size={18} className={cn('[color:#7c3aed]')} />
          <div>
            <div
              className={cn(
                '[font-size:22px]',
                '[font-weight:800]',
                '[color:var(--text-primary)]',
                '[line-height:1.1]',
              )}
            >
              {invitations.length}
            </div>
            <div
              className={cn(
                '[font-size:11px]',
                '[color:var(--text-tertiary)]',
                '[font-weight:600]',
                '[margin-top:2px]',
                '[text-transform:uppercase]',
                '[letter-spacing:0.05em]',
              )}
            >
              Total Invitations Sent
            </div>
          </div>
        </div>
      </div>

      {/* ── Invite panel ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          '[background:linear-gradient(135deg,#faf5ff,#f5f0ff)]',
          '[border:1.5px_solid_rgba(124,58,237,0.2)]',
          '[border-radius:16px]',
          '[padding:24px]',
          '[margin-bottom:24px]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[gap:14px]',
            '[align-items:flex-start]',
            '[margin-bottom:18px]',
          )}
        >
          <div
            className={cn(
              '[width:36px]',
              '[height:36px]',
              '[border-radius:10px]',
              '[background:rgba(124,58,237,0.12)]',
              '[display:flex]',
              '[align-items:center]',
              '[justify-content:center]',
              '[flex-shrink:0]',
            )}
          >
            <Send size={16} className={cn('[color:#7c3aed]')} />
          </div>
          <div>
            <h3
              className={cn(
                '[margin:0_0_4px]',
                '[font-size:15px]',
                '[font-weight:700]',
                '[color:#4c1d95]',
              )}
            >
              Invite a Workspace Owner
            </h3>
            <p
              className={cn(
                '[margin:0]',
                '[font-size:13px]',
                '[color:#7c3aed]',
                '[line-height:1.5]',
              )}
            >
              Send an invitation link. Once they sign up and verify their email,
              you'll receive a notification to send a dashboard access request.
            </p>
          </div>
        </div>

        {inviteResult === 'success' ? (
          <div
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[gap:10px]',
              '[background:#dcfce7]',
              '[color:#15803d]',
              '[border-radius:10px]',
              '[padding:12px_16px]',
              '[font-size:13px]',
              '[font-weight:500]',
            )}
          >
            <CheckCircle size={16} />
            Invitation sent! The workspace owner will receive an email with the
            invite link. You'll be notified when they join.
            <button
              onClick={() => setInviteResult('')}
              className={cn(
                '[margin-inline-start:auto]',
                '[background:none]',
                '[border:1.5px_solid_#16a34a]',
                '[color:#16a34a]',
                '[border-radius:8px]',
                '[padding:5px_14px]',
                '[cursor:pointer]',
                '[font-size:12px]',
                '[font-weight:700]',
              )}
            >
              Send another
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleInvite}
            className={cn(
              '[display:flex]',
              '[flex-wrap:wrap]',
              '[gap:12px]',
              '[align-items:flex-start]',
            )}
          >
            <div className={cn('[flex:1_1_220px]')}>
              <Input
                type="email"
                required
                placeholder="workspace@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                label={
                  <>
                    Owner Email{' '}
                    <span
                      className={cn(
                        'text-destructive',
                        '[margin-inline-start:2px]',
                      )}
                    >
                      *
                    </span>
                  </>
                }
              />
            </div>
            <div className={cn('[flex:2_1_300px]')}>
              <Input
                placeholder="We'd love to manage your social analytics…"
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                label={<>Personal Message (optional)</>}
              />
            </div>
            <div className={cn('[align-self:flex-end]')}>
              <button
                type="submit"
                disabled={inviting}
                className={cn(
                  '[display:flex]',
                  '[align-items:center]',
                  '[gap:7px]',
                  '[padding:10px_22px]',
                  '[border-radius:10px]',
                  '[border:none]',
                  '[background:linear-gradient(135deg,#7c3aed,#6d28d9)]',
                  '[color:var(--surface-card)]',
                  '[cursor:pointer]',
                  '[font-weight:700]',
                  '[font-size:13px]',
                  '[white-space:nowrap]',
                )}
              >
                {inviting ? (
                  <>
                    <Loader2
                      size={13}
                      className={cn('[animation:spin_.8s_linear_infinite]')}
                    />{' '}
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={13} /> Send Invitation
                  </>
                )}
              </button>
            </div>
            {inviteResult.startsWith('error:') && (
              <div
                className={cn(
                  '[display:flex]',
                  '[align-items:center]',
                  '[gap:8px]',
                  '[background:#fee2e2]',
                  'text-destructive',
                  '[border-radius:10px]',
                  '[padding:10px_14px]',
                  '[font-size:13px]',
                  '[width:100%]',
                )}
              >
                <XCircle size={14} /> {inviteResult.slice(6)}
              </div>
            )}
          </form>
        )}
      </div>

      {/* ── Sent Invitations ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          '[background:var(--surface-card)]',
          '[border-radius:16px]',
          '[border:1px_solid_#e8edf2]',
          '[margin-bottom:24px]',
          '[overflow:hidden]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:space-between]',
            '[padding:16px_20px]',
            '[border-bottom:1px_solid_var(--surface-sunken)]',
          )}
        >
          <h3
            className={cn(
              '[margin:0]',
              '[font-size:14px]',
              '[font-weight:700]',
              '[color:var(--text-primary)]',
            )}
          >
            Sent Invitations
          </h3>
          <button
            onClick={fetchInvitations}
            title="Refresh"
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[padding:5px_8px]',
              '[border-radius:7px]',
              '[border:1px_solid_var(--border-default)]',
              '[background:var(--surface-sunken)]',
              '[cursor:pointer]',
              '[color:var(--text-secondary)]',
            )}
          >
            <RefreshCw
              size={13}
              className={
                loadingInvList ? 'motion-safe:animate-spin' : undefined
              }
            />
          </button>
        </div>

        {loadingInvList ? (
          <div
            className={cn(
              '[display:flex]',
              '[justify-content:center]',
              '[padding:32px]',
            )}
          >
            <Loader2
              size={20}
              className={cn(
                '[animation:spin_.8s_linear_infinite]',
                '[color:var(--text-tertiary)]',
              )}
            />
          </div>
        ) : invitations.length === 0 ? (
          <div
            className={cn(
              '[display:flex]',
              '[flex-direction:column]',
              '[align-items:center]',
              '[padding:40px_20px]',
              '[text-align:center]',
            )}
          >
            <Mail
              size={28}
              className={cn(
                '[color:var(--text-quaternary)]',
                '[margin-bottom:8px]',
              )}
            />
            <p
              className={cn(
                '[margin:0]',
                '[color:var(--text-tertiary)]',
                '[font-size:13px]',
              )}
            >
              No invitations sent yet. Use the form above to invite your first
              workspace.
            </p>
          </div>
        ) : (
          <div className={cn('[overflow-x:auto]')}>
            <table
              className={cn(
                '[width:100%]',
                '[border-collapse:collapse]',
                '[font-size:13px]',
              )}
            >
              <thead>
                <tr>
                  {['Owner Email', 'Status', 'Sent', 'Message', 'Action'].map(
                    (h) => (
                      <th
                        key={h}
                        className={cn(
                          '[text-align:start]',
                          '[padding:10px_16px]',
                          '[background:var(--surface-sunken)]',
                          '[color:var(--text-secondary)]',
                          '[font-weight:600]',
                          '[font-size:11px]',
                          '[text-transform:uppercase]',
                          '[letter-spacing:0.05em]',
                          '[border-bottom:1px_solid_var(--surface-sunken)]',
                          '[white-space:nowrap]',
                        )}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => {
                  const st =
                    STATUS_COLOR[
                      inv.is_expired && inv.status === 'pending'
                        ? 'expired'
                        : inv.status
                    ] || STATUS_COLOR.expired;
                  const displayStatus =
                    inv.is_expired && inv.status === 'pending'
                      ? 'expired'
                      : inv.status;
                  return (
                    <tr
                      key={inv.id}
                      className={cn(
                        '[border-bottom:1px_solid_var(--surface-sunken)]',
                      )}
                    >
                      <td
                        className={cn(
                          '[padding:12px_16px]',
                          '[color:var(--text-secondary)]',
                          '[vertical-align:middle]',
                          '[font-weight:500]',
                        )}
                      >
                        {inv.client_email}
                      </td>
                      <td
                        className={cn(
                          '[padding:12px_16px]',
                          '[color:var(--text-secondary)]',
                          '[vertical-align:middle]',
                        )}
                      >
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                          {st.label}
                        </span>
                      </td>
                      <td
                        className={cn(
                          '[padding:12px_16px]',
                          '[color:var(--text-secondary)]',
                          '[vertical-align:middle]',
                          '[color:var(--text-tertiary)]',
                          '[font-size:12px]',
                        )}
                      >
                        {inv.invited_at
                          ? new Date(inv.invited_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td
                        className={cn(
                          '[padding:12px_16px]',
                          '[color:var(--text-secondary)]',
                          '[vertical-align:middle]',
                          '[max-width:200px]',
                          '[overflow:hidden]',
                          '[text-overflow:ellipsis]',
                          '[white-space:nowrap]',
                          '[color:var(--text-secondary)]',
                        )}
                      >
                        {inv.message || (
                          <span
                            className={cn('[color:var(--text-quaternary)]')}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          '[padding:12px_16px]',
                          '[color:var(--text-secondary)]',
                          '[vertical-align:middle]',
                        )}
                      >
                        {displayStatus === 'pending' ? (
                          <button
                            disabled={cancelingId === inv.id}
                            onClick={() => handleCancelInv(inv.id)}
                            className={cn(
                              '[display:flex]',
                              '[align-items:center]',
                              '[gap:4px]',
                              '[background:#fff5f5]',
                              'text-destructive',
                              '[border:1px_solid_#fca5a5]',
                              '[border-radius:7px]',
                              '[padding:4px_10px]',
                              '[font-size:11px]',
                              '[font-weight:700]',
                              '[cursor:pointer]',
                            )}
                          >
                            {cancelingId === inv.id ? (
                              <Loader2
                                size={11}
                                className={cn(
                                  '[animation:spin_.8s_linear_infinite]',
                                )}
                              />
                            ) : (
                              <X size={11} />
                            )}
                            Cancel
                          </button>
                        ) : (
                          <span
                            className={cn(
                              '[color:var(--text-quaternary)]',
                              '[font-size:12px]',
                            )}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Connected Clients ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          '[background:var(--surface-card)]',
          '[border-radius:16px]',
          '[border:1px_solid_#e8edf2]',
          '[margin-bottom:24px]',
          '[overflow:hidden]',
        )}
      >
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:space-between]',
            '[padding:16px_20px]',
            '[border-bottom:1px_solid_var(--surface-sunken)]',
          )}
        >
          <h3
            className={cn(
              '[margin:0]',
              '[font-size:14px]',
              '[font-weight:700]',
              '[color:var(--text-primary)]',
            )}
          >
            Connected Workspaces
          </h3>
          <div
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[gap:10px]',
            )}
          >
            {syncMsg && (
              <span
                className={cn(
                  '[font-size:12px]',
                  syncMsg.includes('failed')
                    ? 'text-destructive'
                    : '[color:#16a34a]',
                  '[font-weight:600]',
                )}
              >
                {syncMsg}
              </span>
            )}
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              title="Sync all workspaces"
              className={cn(
                '[display:flex]',
                '[align-items:center]',
                '[gap:6px]',
                '[padding:6px_14px]',
                '[border-radius:8px]',
                '[border:none]',
                '[background:linear-gradient(135deg,#7c3aed,#6d28d9)]',
                '[color:var(--surface-card)]',
                '[cursor:pointer]',
                '[font-weight:700]',
                '[font-size:12px]',
                '[white-space:nowrap]',
              )}
            >
              {syncingAll ? (
                <>
                  <Loader2
                    size={13}
                    className={cn('[animation:spin_.8s_linear_infinite]')}
                  />{' '}
                  Syncing…
                </>
              ) : (
                <>
                  <Zap size={13} /> Sync All
                </>
              )}
            </button>
            <div
              className={cn(
                '[position:relative]',
                '[display:flex]',
                '[align-items:center]',
              )}
            >
              <Search
                size={14}
                className={cn(
                  '[position:absolute]',
                  '[inset-inline-start:9px]',
                  '[color:var(--text-tertiary)]',
                  '[pointer-events:none]',
                )}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workspaces…"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            className={cn(
              '[display:flex]',
              '[flex-direction:column]',
              '[align-items:center]',
              '[padding:40px_20px]',
              '[text-align:center]',
            )}
          >
            <Users
              size={28}
              className={cn(
                '[color:var(--text-quaternary)]',
                '[margin-bottom:8px]',
              )}
            />
            <p
              className={cn(
                '[margin:0]',
                '[color:var(--text-tertiary)]',
                '[font-size:13px]',
              )}
            >
              {clients.length === 0
                ? "No workspaces connected yet. Invite a workspace owner above — once they accept your access request they'll appear here."
                : 'No workspaces match your search.'}
            </p>
          </div>
        ) : (
          <div className={cn('[overflow-x:auto]')}>
            <table
              className={cn(
                '[width:100%]',
                '[border-collapse:collapse]',
                '[font-size:13px]',
              )}
            >
              <thead>
                <tr>
                  {['Company', 'Contact', 'Email', 'Website', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className={cn(
                          '[text-align:start]',
                          '[padding:10px_16px]',
                          '[background:var(--surface-sunken)]',
                          '[color:var(--text-secondary)]',
                          '[font-weight:600]',
                          '[font-size:11px]',
                          '[text-transform:uppercase]',
                          '[letter-spacing:0.05em]',
                          '[border-bottom:1px_solid_var(--surface-sunken)]',
                          '[white-space:nowrap]',
                        )}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className={cn(
                      '[border-bottom:1px_solid_var(--surface-sunken)]',
                    )}
                  >
                    <td
                      className={cn(
                        '[padding:12px_16px]',
                        '[color:var(--text-secondary)]',
                        '[vertical-align:middle]',
                        '[font-weight:600]',
                      )}
                    >
                      <div
                        className={cn(
                          '[display:flex]',
                          '[align-items:center]',
                          '[gap:8px]',
                        )}
                      >
                        <div
                          className={cn(
                            '[width:30px]',
                            '[height:30px]',
                            '[border-radius:8px]',
                            '[flex-shrink:0]',
                            '[background:linear-gradient(135deg,#00d7ff22,#7c3aed22)]',
                            '[color:var(--text-primary)]',
                            '[font-weight:800]',
                            '[font-size:13px]',
                            '[display:flex]',
                            '[align-items:center]',
                            '[justify-content:center]',
                            '[border:1.5px_solid_var(--border-default)]',
                          )}
                        >
                          {(c.company || c.name || '?')[0].toUpperCase()}
                        </div>
                        {c.company}
                      </div>
                    </td>
                    <td
                      className={cn(
                        '[padding:12px_16px]',
                        '[color:var(--text-secondary)]',
                        '[vertical-align:middle]',
                      )}
                    >
                      {c.name}
                    </td>
                    <td
                      className={cn(
                        '[padding:12px_16px]',
                        '[color:var(--text-secondary)]',
                        '[vertical-align:middle]',
                        '[color:var(--text-secondary)]',
                      )}
                    >
                      {c.email}
                    </td>
                    <td
                      className={cn(
                        '[padding:12px_16px]',
                        '[color:var(--text-secondary)]',
                        '[vertical-align:middle]',
                      )}
                    >
                      {c.website ? (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            '[color:#7c3aed]',
                            '[text-decoration:none]',
                            '[font-size:12px]',
                          )}
                        >
                          {c.website}
                        </a>
                      ) : (
                        <span className={cn('[color:var(--text-quaternary)]')}>
                          —
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        '[padding:12px_16px]',
                        '[color:var(--text-secondary)]',
                        '[vertical-align:middle]',
                      )}
                    >
                      <div className={cn('[display:flex]', '[gap:8px]')}>
                        <button
                          onClick={() => {
                            onSelectClient?.(c);
                            navigate(`/admin/workspace/${c.id}`);
                          }}
                          className={cn(
                            '[padding:6px_14px]',
                            '[border-radius:8px]',
                            '[border:1.5px_solid_#00d7ff]',
                            '[background:transparent]',
                            '[color:#0099bb]',
                            '[cursor:pointer]',
                            '[font-weight:600]',
                            '[font-size:12px]',
                          )}
                        >
                          <span
                            className={cn(
                              '[display:flex]',
                              '[align-items:center]',
                              '[gap:5px]',
                            )}
                          >
                            Dashboard <ChevronRight size={12} />
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            onSelectClient?.(c);
                            navigate(`/admin/workspace/${c.id}/settings`);
                          }}
                          className={cn(
                            '[padding:6px_12px]',
                            '[border-radius:8px]',
                            '[border:1.5px_solid_var(--border-default)]',
                            '[background:transparent]',
                            '[color:var(--text-secondary)]',
                            '[cursor:pointer]',
                            '[font-weight:600]',
                            '[font-size:12px]',
                          )}
                        >
                          <span
                            className={cn(
                              '[display:flex]',
                              '[align-items:center]',
                              '[gap:5px]',
                            )}
                          >
                            <Settings size={12} /> Account
                          </span>
                        </button>
                        <button
                          onClick={() => handleSyncOne(c.id)}
                          disabled={syncingId === c.id}
                          title="Sync this workspace"
                          className={cn(
                            '[padding:6px_8px]',
                            '[border-radius:8px]',
                            '[border:1.5px_solid_var(--border-default)]',
                            '[background:transparent]',
                            '[color:#7c3aed]',
                            '[cursor:pointer]',
                            '[display:flex]',
                            '[align-items:center]',
                          )}
                        >
                          {syncingId === c.id ? (
                            <Loader2
                              size={12}
                              className={cn(
                                '[animation:spin_.8s_linear_infinite]',
                              )}
                            />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      {clients.length === 0 && invitations.length === 0 && (
        <div
          className={cn(
            '[background:linear-gradient(135deg,#f0f9ff,var(--surface-page))]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:16px]',
            '[padding:28px_32px]',
            '[margin-bottom:24px]',
          )}
        >
          <h4
            className={cn(
              '[margin:0_0_20px]',
              '[font-size:14px]',
              '[font-weight:700]',
              '[color:var(--text-primary)]',
            )}
          >
            How workspace onboarding works
          </h4>
          <div
            className={cn('[display:flex]', '[gap:20px]', '[flex-wrap:wrap]')}
          >
            {[
              {
                icon: <Send size={16} />,
                color: '#7c3aed',
                label: '1. Send Invitation',
                desc: "Enter the workspace owner's email above and send an invitation.",
              },
              {
                icon: <Mail size={16} />,
                color: '#0369a1',
                label: '2. Workspace Owner Signs Up',
                desc: 'The workspace owner receives an email, signs up on Social Stats, and verifies their account.',
              },
              {
                icon: <Building2 size={16} />,
                color: '#d97706',
                label: '3. You Get Notified',
                desc: "You'll receive an email when the workspace joins. Then send a dashboard access request.",
              },
              {
                icon: <CheckCircle size={16} />,
                color: '#16a34a',
                label: '4. Workspace Owner Accepts',
                desc: 'Once they accept the access request, they appear in your workspaces list.',
              },
            ].map((s) => (
              <div
                key={s.label}
                className={cn(
                  '[flex:1_1_180px]',
                  '[display:flex]',
                  '[flex-direction:column]',
                  '[gap:8px]',
                )}
              >
                <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  {s.icon}
                </div>
                <div
                  className={cn(
                    '[font-size:13px]',
                    '[font-weight:700]',
                    '[color:var(--text-primary)]',
                  )}
                >
                  {s.label}
                </div>
                <div
                  className={cn(
                    '[font-size:12px]',
                    '[color:var(--text-secondary)]',
                    '[line-height:1.5]',
                  )}
                >
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
