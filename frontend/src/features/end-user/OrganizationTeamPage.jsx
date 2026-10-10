import { useCallback, useEffect, useState } from 'react';
import { AppLink as Link } from '../../core/navigation';
import { useSession } from '../../core/session';
import { organizationAPI } from '@/services/domains/identity';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const ROLE_LABELS = {
  'social-media-manager': 'مدیر شبکه‌های اجتماعی', 'senior-editor': 'ادمین محتوا / سردبیر',
  editor: 'ویراستار', analyst: 'تحلیلگر', 'brand-manager': 'مدیر برند',
  designer: 'طراح / تولیدکننده محتوا', 'workspace-admin': 'ادمین اجرایی',
};
const list = data => data.results || data;
const panel = { padding: 20, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)' };
const row = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' };
const select = { padding: 10, background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)' };

function Grants({ workspaces, value, onChange }) {
  return <fieldset style={{ border: 0, padding: 0 }}>
    <legend>برندهای مجاز و نقش در هر برند</legend>
    {workspaces.map(workspace => {
      const grant = value.find(item => item.workspace_id === workspace.id);
      return <div key={workspace.id} style={{ ...row, marginTop: 12 }}>
        <label><input type="checkbox" checked={Boolean(grant)} onChange={event => onChange(event.target.checked
          ? [...value, { workspace_id: workspace.id, preset: 'designer' }]
          : value.filter(item => item.workspace_id !== workspace.id))} /> {workspace.company || workspace.name}</label>
        {grant && <select style={select} aria-label={`نقش در ${workspace.company || workspace.name}`} value={grant.preset || 'designer'}
          onChange={event => onChange(value.map(item => item.workspace_id === workspace.id ? { ...item, preset: event.target.value } : item))}>
          {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>}
      </div>;
    })}
  </fieldset>;
}

function MemberEditor({ member, organization, workspaces, onSaved, onError }) {
  const [grants, setGrants] = useState(member.workspace_grants);
  const [role, setRole] = useState(member.role);
  const [busy, setBusy] = useState(false);
  const editable = organization.my_role === 'owner' || member.role !== 'admin';
  async function save(active) {
    setBusy(true);
    try {
      await organizationAPI.updateMember(organization.id, member.user_id, {
        is_active: active, organization_role: role, workspace_grants: grants,
      });
      await onSaved();
    } catch { onError('ذخیرهٔ دسترسی تأیید نشد. وضعیت فعلی، نقش‌ها و محدودیت اعضای مجموعه را بررسی کنید.'); }
    finally { setBusy(false); }
  }
  return <section style={{ ...panel, marginTop: 12 }}>
    <h3><bdi dir="ltr">{member.user__email}</bdi> — {member.is_active ? 'فعال' : 'غیرفعال'}</h3>
    {editable ? <>
      {organization.my_role === 'owner' && <label>نقش در مجموعه <select value={role} style={select} onChange={event => setRole(event.target.value)}>
        <option value="member">عضو مجموعه</option><option value="admin">ادمین مجموعه</option>
      </select></label>}
      <Grants workspaces={workspaces} value={grants} onChange={setGrants} />
      <div style={{ ...row, marginTop: 12 }}>
        <Button disabled={busy || !grants.length} onClick={() => save(true)}>ذخیرهٔ دسترسی</Button>
        {member.is_active && <Button variant="secondary" disabled={busy} onClick={() => save(false)}>لغو دسترسی به مجموعه و برندها</Button>}
      </div>
    </> : <p>تغییر دسترسی ادمین مجموعه فقط توسط مالک انجام می‌شود.</p>}
  </section>;
}

export default function OrganizationTeamPage() {
  const { user, refreshAuth } = useSession();
  const [organizations, setOrganizations] = useState([]);
  const [organizationId, setOrganizationId] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [email, setEmail] = useState('');
  const [orgRole, setOrgRole] = useState('member');
  const [grants, setGrants] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const organization = organizations.find(item => String(item.id) === organizationId);
  const manager = organization && ['owner', 'admin'].includes(organization.my_role);

  const reload = useCallback(async () => {
    const [orgs, invites] = await Promise.all([organizationAPI.list(), organizationAPI.myInvitations()]);
    setOrganizations(list(orgs.data)); setIncoming(invites.data);
    setOrganizationId(previous => list(orgs.data).some(item => String(item.id) === previous)
      ? previous : String(list(orgs.data)[0]?.id || ''));
    setReady(true);
  }, []);
  useEffect(() => { reload().catch(() => { setError('بارگذاری مجموعه‌ها انجام نشد. دوباره تلاش کنید.'); setReady(true); }); }, [reload]);
  const loadTeam = useCallback(async () => {
    if (!organizationId) return;
    const [spaces, team, invites] = await Promise.all([
      organizationAPI.workspaces(organizationId),
      manager ? organizationAPI.members(organizationId) : Promise.resolve({ data: [] }),
      manager ? organizationAPI.invitations(organizationId) : Promise.resolve({ data: [] }),
    ]);
    setWorkspaces(list(spaces.data)); setMembers(team.data); setInvitations(invites.data);
  }, [organizationId, manager]);
  useEffect(() => {
    let active = true;
    setWorkspaces([]); setMembers([]); setInvitations([]); setGrants([]); setOrgRole('member');
    if (organizationId) {
      Promise.all([
        organizationAPI.workspaces(organizationId),
        manager ? organizationAPI.members(organizationId) : Promise.resolve({ data: [] }),
        manager ? organizationAPI.invitations(organizationId) : Promise.resolve({ data: [] }),
      ]).then(([spaces, team, invites]) => {
        if (active) { setWorkspaces(list(spaces.data)); setMembers(team.data); setInvitations(invites.data); }
      }).catch(() => { if (active) setError('بارگذاری برندها و اعضا انجام نشد.'); });
    }
    return () => { active = false; };
  }, [organizationId, manager]);

  async function run(action, success) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); if (success) setNotice(success); }
    catch { setError('نتیجهٔ درخواست تأیید نشد. وضعیت فعلی، دسترسی و محدودیت طرح مجموعه را بررسی کنید.'); }
    finally { setBusy(false); }
  }
  async function createOrganization(event) {
    event.preventDefault();
    await run(async () => {
      const { data } = await organizationAPI.create({ name: name.trim(), requires_approval: true });
      setOrganizationId(String(data.id)); setName(''); await reload();
    }, 'مجموعه ساخته شد. اکنون برندها را اضافه کنید.');
  }
  async function createBrand(event) {
    event.preventDefault();
    await run(async () => {
      await organizationAPI.createWorkspace(organizationId, {
        company: brand.trim(), name: user.first_name || user.email, email: user.email, requires_approval: true,
      });
      setBrand(''); await loadTeam(); await refreshAuth();
    }, 'فضای کاری برند ساخته شد. حساب‌های اجتماعی را به همین برند متصل کنید.');
  }
  async function invite(event) {
    event.preventDefault();
    await run(async () => {
      const { data } = await organizationAPI.invite(organizationId, {
        email: email.trim(), organization_role: orgRole, workspace_grants: grants,
      });
      setNotice(data.email_sent ? 'دعوت ارسال شد.' : 'دعوت ثبت شد، اما ارسال ایمیل تأیید نشد. تنظیمات ایمیل را بررسی و دعوت را دوباره ارسال کنید.');
      if (data.email_sent) { setEmail(''); setGrants([]); }
      await loadTeam();
    });
  }
  return <div style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: 20 }}>
    <header><h1>مجموعه، برندها و تیم</h1><p>هر برند یک فضای کاری دارد. دسترسی افراد را برای هر برند جدا تعیین کنید.</p></header>
    {error && <p role="alert">{error} <Button variant="secondary" onClick={() => run(async () => { await reload(); await loadTeam(); })}>بررسی وضعیت</Button></p>}
    {notice && <p role="status">{notice}</p>}
    {!ready && <p role="status">در حال بارگذاری…</p>}
    {!!incoming.length && <section style={panel}><h2>دعوت‌های شما</h2>{incoming.map(item => <div key={item.id} style={{ ...row, marginBottom: 12 }}>
      <span>{item.organization_name} — {item.workspaces.map(workspace => workspace.company).join('، ')}</span>
      <Button disabled={busy} onClick={() => run(async () => {
        await organizationAPI.acceptInvitation(item.id); await refreshAuth(); await reload();
      }, 'به تیم پیوستید.')}>پذیرش دعوت</Button>
    </div>)}</section>}
    <form onSubmit={createOrganization} style={panel}><h2>ساخت مجموعه</h2>
      {!organizations.length && <p>اگر همکار دعوت‌شده هستید، دعوت بالا را بپذیرید. برای تیم خودتان یک مجموعه بسازید.</p>}
      <div style={row}><Input label="نام مجموعه" value={name} onChange={event => setName(event.target.value)} required maxLength={200} />
        <Button type="submit" disabled={busy || !name.trim()}>ساخت مجموعه</Button></div>
    </form>
    {!!organizations.length && <label>مجموعه <select style={select} value={organizationId} disabled={busy} onChange={event => setOrganizationId(event.target.value)}>
      {organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>}
    {organization && <>
      <section style={panel}><h2>برندهای {organization.name}</h2>
        {!workspaces.length && <p>هنوز فضای کاری مجازی برای شما در این مجموعه وجود ندارد.</p>}
        <div style={{ display: 'grid', gap: 12 }}>{workspaces.map(workspace => <div key={workspace.id} style={row}>
          <strong>{workspace.company}</strong>
          <Button variant="secondary" disabled={busy} onClick={() => run(async () => {
            await organizationAPI.selectWorkspace(organizationId, workspace.id); await refreshAuth();
          }, 'فضای کاری فعال تغییر کرد.')}>انتخاب فضای کاری</Button>
          <Link to={`/u/connections?workspace=${workspace.id}`}>اتصال شبکه‌های اجتماعی</Link>
        </div>)}</div>
        {manager && <form onSubmit={createBrand} style={{ ...row, marginTop: 20 }}>
          <Input label="نام برند یا واحد" value={brand} onChange={event => setBrand(event.target.value)} required maxLength={200} />
          <Button type="submit" disabled={busy || !brand.trim()}>افزودن برند</Button>
        </form>}
      </section>
      {organization.my_role === 'owner' && <section style={panel}>
        <label><input type="checkbox" checked={organization.requires_approval} disabled={busy} onChange={event => run(async () => {
          await organizationAPI.update(organizationId, { requires_approval: event.target.checked }); await reload();
        }, 'سیاست تأیید مجموعه ذخیره شد.')} /> انتشار در همهٔ برندها نیاز به تأیید داشته باشد</label>
      </section>}
      {manager && <>
        <form style={panel} onSubmit={invite}><h2>دعوت همکار</h2>
          <Input label="ایمیل همکار" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
          <label>نقش در مجموعه <select style={select} value={orgRole} onChange={event => setOrgRole(event.target.value)}>
            <option value="member">عضو مجموعه</option>{organization.my_role === 'owner' && <option value="admin">ادمین مجموعه</option>}
          </select></label>
          <Grants workspaces={workspaces} value={grants} onChange={setGrants} />
          <p>ادمین مجموعه تیم و برندها را مدیریت می‌کند. نقش هر برند، دسترسی به محتوای آن را تعیین می‌کند.</p>
          <Button type="submit" disabled={busy || !grants.length}>ارسال دعوت</Button>
        </form>
        <section style={panel}><h2>اعضای تیم</h2><p>مالک مجموعه: <bdi dir="ltr">{organization.my_role === 'owner' ? user.email : 'مالک ثبت‌شدهٔ مجموعه'}</bdi></p>
          {members.filter(member => member.user_id !== organization.owner_user).map(member => <MemberEditor
            key={`${organizationId}:${member.user_id}:${member.is_active}:${JSON.stringify(member.workspace_grants)}:${member.role}`}
            member={member} organization={organization} workspaces={workspaces} onSaved={loadTeam} onError={setError} />)}
        </section>
        <section style={panel}><h2>دعوت‌های در انتظار</h2>{invitations.filter(item => item.status === 'pending').map(item => <div key={item.id} style={{ ...row, marginBottom: 12 }}>
          <bdi dir="ltr">{item.email}</bdi>
          {(organization.my_role === 'owner' || item.organization_role !== 'admin') && <Button variant="secondary" disabled={busy} onClick={() => run(async () => {
            await organizationAPI.cancelInvitation(organizationId, item.id); await loadTeam();
          }, 'دعوت لغو شد.')}>لغو دعوت</Button>}
        </div>)}</section>
      </>}
    </>}
  </div>;
}
