import { useEffect, useState } from 'react';
import { AppLink as Link, useAppNavigate, useAppSearchParams } from '../core/navigation';
import { useSession } from '../core/session';
import { organizationAPI } from '@/services/domains/identity';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';

export default function JoinTeamPage() {
  const [params] = useAppSearchParams();
  const token = params.get('token');
  const { user, loading, refreshAuth } = useSession();
  const navigate = useAppNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!token) { setError('پیوند دعوت معتبر نیست.'); return undefined; }
    organizationAPI.invitation(token).then(({ data }) => { if (active) setInvite(data); })
      .catch(() => { if (active) setError('دعوت منقضی یا لغو شده است. از مدیر مجموعه دعوت تازه بخواهید.'); });
    return () => { active = false; };
  }, [token]);
  async function accept() {
    setBusy(true); setError('');
    try {
      await organizationAPI.acceptToken(token);
      await refreshAuth();
      navigate('/u/organizations', { replace: true });
    } catch { setError('پذیرش دعوت انجام نشد. ایمیل حساب و اعتبار دعوت را بررسی کنید.'); }
    finally { setBusy(false); }
  }
  const mismatch = user && invite && user.email?.toLowerCase() !== invite.email.toLowerCase();
  return <AuthLayout heroTitle="پیوستن به تیم" heroSub="با حساب شخصی خود وارد مجموعه شوید.">
    <section style={{ padding: 24, background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)' }}>
      <h1>دعوت به تیم</h1>
      {error && <p role="alert">{error}</p>}
      {invite && <>
        <p>شما به مجموعهٔ <strong>{invite.organization_name}</strong> دعوت شده‌اید.</p>
        <p>ایمیل دعوت: <bdi dir="ltr">{invite.email}</bdi></p>
        <ul>{invite.workspaces.map(workspace => <li key={workspace.id}>{workspace.company}</li>)}</ul>
        {mismatch && <p role="alert">این دعوت برای ایمیل دیگری است. با ایمیل دعوت‌شده وارد شوید.</p>}
        {!loading && !user && <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button as={Link} to={`/signup?team_invite=${encodeURIComponent(token)}`}>ساخت حساب و پیوستن به تیم</Button>
          <Button as={Link} variant="secondary" to={`/login?next=${encodeURIComponent(`/join-team?token=${token}`)}`}>ورود با حساب موجود</Button>
        </div>}
        {user && <Button onClick={accept} disabled={busy || mismatch}>{busy ? 'در حال پذیرش…' : 'پذیرش دعوت'}</Button>}
      </>}
    </section>
  </AuthLayout>;
}
