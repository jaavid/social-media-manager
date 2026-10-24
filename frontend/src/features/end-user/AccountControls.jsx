import { useState } from 'react';
import { useLanguage } from '@/i18n';
import { useSession } from '@/core/session';
import { useAppNavigate, useAppSearchParams, useAppLocation } from '@/core/navigation';
import { useWorkspaces } from '@/hooks/useData';
import useWorkspaceScope from '@/hooks/useWorkspaceScope';
import { organizationAPI } from '@/services/domains/identity';
import NativeSelect from '@/components/ui/NativeSelect';
import Button from '@/components/ui/Button';

export default function AccountControls() {
  const { isPersian } = useLanguage();
  const { user, logout, refreshAuth } = useSession();
  const { workspaceId } = useWorkspaceScope();
  const { workspaces, loading, error, refetch } = useWorkspaces();
  const [search, setSearch] = useAppSearchParams();
  const navigate = useAppNavigate();
  const { pathname } = useAppLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const text = (fa, en) => isPersian ? fa : en;

  async function switchBrand(value) {
    const workspace = workspaces.find(item => String(item.id) === value);
    if (!workspace) return;
    setBusy(true);
    setMessage('');
    try {
      if (workspace.organization) {
        await organizationAPI.selectWorkspace(workspace.organization, workspace.id);
        await refreshAuth();
      }
      const next = new URLSearchParams(search);
      if (['/u/calendar', '/u/connections'].includes(pathname) || !workspace.organization) {
        next.set('workspace', String(workspace.id));
      } else {
        next.delete('workspace');
      }
      setSearch(next, { replace: true });
    } catch {
      setMessage(text('تغییر برند تأیید نشد؛ دوباره تلاش کنید.', 'Brand change could not be confirmed. Try again.'));
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true);
    setMessage('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      setMessage(text('خروج انجام نشد؛ دوباره تلاش کنید.', 'Sign out failed. Try again.'));
      setBusy(false);
    }
  }

  if (!user) return null;
  return <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
    <NativeSelect label={text('تغییر برند', 'Switch brand')} value={workspaceId ?? ''}
      disabled={busy || loading || !!error} onChange={event => switchBrand(event.target.value)}>
      <option value="">{text('انتخاب برند', 'Select a brand')}</option>
      {workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.company || workspace.name}</option>)}
    </NativeSelect>
    {error && <Button variant="secondary" onClick={() => refetch()}>{text('دریافت دوباره برندها', 'Reload brands')}</Button>}
    <Button variant="secondary" disabled={busy} onClick={signOut}>{text('خروج از حساب', 'Sign out')}</Button>
    {message && <p role="alert">{message}</p>}
  </div>;
}
