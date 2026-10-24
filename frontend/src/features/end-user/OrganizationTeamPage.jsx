import { useCallback, useEffect, useState } from 'react';
import { AppLink as Link } from '../../core/navigation';
import { useSession } from '../../core/session';
import { organizationAPI } from '@/services/domains/identity';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import NativeSelect from '../../components/ui/NativeSelect';
import Checkbox from '../../components/ui/Checkbox';
import styles from './OrganizationTeamPage.module.css';

const ROLE_LABELS = {
  'social-media-manager': 'مدیر شبکه‌های اجتماعی', 'senior-editor': 'ادمین محتوا / سردبیر',
  editor: 'ویراستار', analyst: 'تحلیلگر', 'brand-manager': 'مدیر برند',
  designer: 'طراح / تولیدکننده محتوا', 'workspace-admin': 'ادمین اجرایی',
};
const list = data => data.results || data;

function Grants({ workspaces, value, onChange, disabled = false }) {
  return <fieldset className={styles.grants}>
    <legend>برندهای مجاز و نقش در هر برند</legend>
    {!!workspaces.length && <p>برند را انتخاب کنید، سپس نقش همکار را در همان برند تعیین کنید.</p>}
    {!workspaces.length && <p>ابتدا یک برند اضافه کنید تا بتوانید دسترسی همکار را تعیین کنید.</p>}
    {workspaces.map(workspace => {
      const grant = value.find(item => item.workspace_id === workspace.id);
      return <div key={workspace.id} className={styles.grantRow}>
        <Checkbox disabled={disabled} label={workspace.company || workspace.name} checked={Boolean(grant)} onChange={event => onChange(event.target.checked
          ? [...value, { workspace_id: workspace.id, preset: 'designer' }]
          : value.filter(item => item.workspace_id !== workspace.id))} />
        {grant && <NativeSelect disabled={disabled} aria-label={`نقش در ${workspace.company || workspace.name}`} value={grant.preset || 'designer'}
          onChange={event => onChange(value.map(item => item.workspace_id === workspace.id ? { ...item, preset: event.target.value } : item))}>
          {Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </NativeSelect>}
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
  return <section className={styles.member}>
    <h3><bdi dir="auto">{member.user__email || [member.user__first_name, member.user__last_name].filter(Boolean).join(' ') || 'عضو تیم'}</bdi> — {member.is_active ? 'فعال' : 'غیرفعال'}</h3>
    {editable ? <>
      {organization.my_role === 'owner' && <NativeSelect disabled={busy} label="نقش در مجموعه" value={role} onChange={event => setRole(event.target.value)}>
        <option value="member">عضو مجموعه</option><option value="admin">ادمین مجموعه</option>
      </NativeSelect>}
      <Grants disabled={busy} workspaces={workspaces} value={grants} onChange={setGrants} />
      <div className={styles.grantRow}>
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
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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
  useEffect(() => {
    let active = true;
    // Fetch callbacks update state asynchronously, not in the effect's body.
    Promise.resolve().then(() => {
      if (active) return reload();
      return undefined;
    }).catch(() => {
      if (active) { setError('بارگذاری مجموعه‌ها انجام نشد. دوباره تلاش کنید.'); setReady(true); }
    });
    return () => { active = false; };
  }, [reload]);
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
    // Clear scoped data after the current render, then load the next selection.
    // The alive guard prevents an earlier selection from replacing newer data.
    Promise.resolve().then(() => {
      if (!active) return undefined;
      setWorkspaces([]); setMembers([]); setInvitations([]); setGrants([]); setOrgRole('member');
      if (!organizationId) return undefined;
      return Promise.all([
        organizationAPI.workspaces(organizationId),
        manager ? organizationAPI.members(organizationId) : Promise.resolve({ data: [] }),
        manager ? organizationAPI.invitations(organizationId) : Promise.resolve({ data: [] }),
      ]).then(([spaces, team, invites]) => {
        if (active) { setWorkspaces(list(spaces.data)); setMembers(team.data); setInvitations(invites.data); }
      });
    }).catch(() => { if (active) setError('بارگذاری برندها و اعضا انجام نشد.'); });
    return () => { active = false; };
  }, [organizationId, manager]);

  async function run(action, success) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); if (success) setNotice(success); }
    catch (error) {
      const data = error.response?.data;
      const labels = { name: 'نام مسئول تماس', email: 'ایمیل', company: 'نام برند' };
      const details = data && typeof data === 'object' ? Object.entries(data).flatMap(([field, messages]) => {
        const values = Array.isArray(messages) ? messages : [messages];
        return values.filter(message => typeof message === 'string').map(message => `${labels[field] || field}: ${message}`);
      }).join(' — ') : '';
      setError(details || 'نتیجهٔ درخواست تأیید نشد. وضعیت فعلی، دسترسی و محدودیت طرح مجموعه را بررسی کنید.');
    }
    finally { setBusy(false); }
  }
  async function createOrganization(event) {
    event.preventDefault();
    await run(async () => {
      const { data } = await organizationAPI.create({ name: name.trim(), requires_approval: true });
      setOrganizationId(String(data.id)); setName(''); setShowCreateOrganization(false); await reload();
    }, 'مجموعه ساخته شد. اکنون برندها را اضافه کنید.');
  }
  async function createBrand(event) {
    event.preventDefault();
    await run(async () => {
      await organizationAPI.createWorkspace(organizationId, {
        company: brand.trim(), requires_approval: true,
        ...(!user.email && contactEmail.trim() ? { email: contactEmail.trim() } : {}),
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
  return <div className={styles.page}>
    <header className={styles.header}><span className={styles.eyebrow}>مدیریت فضای کاری</span><h1>مجموعه، برندها و تیم</h1><p>هر برند یک فضای کاری دارد. دسترسی افراد را برای هر برند جدا تعیین کنید.</p></header>
    {error && <p className={styles.error} role="alert">{error} <Button variant="secondary" onClick={() => run(async () => { await reload(); await loadTeam(); })}>بررسی وضعیت</Button></p>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {!ready && <p role="status">در حال بارگذاری…</p>}
    {!!incoming.length && <section className={styles.panel}><h2>دعوت‌های شما</h2>{incoming.map(item => <div key={item.id} className={styles.listRow}>
      <span>{item.organization_name} — {item.workspaces.map(workspace => workspace.company).join('، ')}</span>
      <Button disabled={busy} onClick={() => run(async () => {
        await organizationAPI.acceptInvitation(item.id); await refreshAuth(); await reload();
      }, 'به تیم پیوستید.')}>پذیرش دعوت</Button>
    </div>)}</section>}
    {!!organizations.length && <div className={styles.organizationToolbar}>
      <NativeSelect label="مجموعهٔ انتخاب‌شده" value={organizationId} disabled={busy} onChange={event => setOrganizationId(event.target.value)}>
        {organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </NativeSelect>
      <Button variant="secondary" disabled={busy} aria-expanded={showCreateOrganization} aria-controls="create-organization-form" onClick={() => setShowCreateOrganization(value => !value)}>
        {showCreateOrganization ? 'بستن فرم مجموعهٔ جدید' : 'ساخت مجموعهٔ جدید'}
      </Button>
    </div>}
    {ready && (!organizations.length || showCreateOrganization) && <form id="create-organization-form" onSubmit={createOrganization} className={styles.panel}><h2>ساخت مجموعه</h2><p>مجموعه، تیم و برندهای شما را کنار هم نگه می‌دارد؛ هر برند فضای کاری جداگانه دارد.</p>
      {!organizations.length && <p>اگر همکار دعوت‌شده هستید، دعوت بالا را بپذیرید. برای تیم خودتان یک مجموعه بسازید.</p>}
      <div className={styles.row}><Input label="نام مجموعه" placeholder="مثلاً نگاتیو پنج" value={name} onChange={event => setName(event.target.value)} required maxLength={200} />
        <Button type="submit" disabled={busy || !name.trim()}>ساخت مجموعه</Button></div>
    </form>}
    {organization && <>
      <section className={styles.panel}><h2>برندهای {organization.name}</h2>
        {!workspaces.length && <p>هنوز برندی در دسترس شما نیست. پس از افزودن برند، حساب‌های اجتماعی را به آن متصل کنید.</p>}
        <div style={{ display: 'grid', gap: 12 }}>{workspaces.map(workspace => <div key={workspace.id} className={styles.workspaceRow}>
          <div className={styles.workspaceName}><strong><bdi>{workspace.company}</bdi></strong>
            {Number(user.workspace_id ?? user.client_id) === workspace.id && <span className={styles.activeBadge}>فضای کاری فعال</span>}
          </div>
          <Button variant="secondary" disabled={busy || Number(user.workspace_id ?? user.client_id) === workspace.id} onClick={() => run(async () => {
            await organizationAPI.selectWorkspace(organizationId, workspace.id); await refreshAuth();
          }, 'فضای کاری فعال تغییر کرد.')}>انتخاب فضای کاری</Button>
          <Link to={`/u/calendar?workspace=${workspace.id}`}>تقویم محتوا</Link>
          <Link to={`/u/connections?workspace=${workspace.id}`}>اتصال شبکه‌های اجتماعی</Link>
        </div>)}</div>
        {manager && <form onSubmit={createBrand} className={styles.brandForm}>
          <div className={styles.formIntro}><h3>افزودن برند</h3><p>نام برند یا واحدی را وارد کنید که می‌خواهید محتوایش را مدیریت کنید.</p></div>
          <Input disabled={busy} label="نام برند یا واحد" placeholder="مثلاً School" value={brand} onChange={event => setBrand(event.target.value)} required maxLength={200} />
          {!user.email && <Input label="ایمیل تماس برند" type="email" dir="ltr" placeholder="name@example.com" value={contactEmail} onChange={event => setContactEmail(event.target.value)} required />}
          <Button type="submit" disabled={busy || !brand.trim()}>افزودن برند</Button>
        </form>}
      </section>
      {organization.my_role === 'owner' && <section className={styles.panel}>
        <Checkbox label="انتشار در همهٔ برندها نیاز به تأیید داشته باشد" description="محتوا پیش از انتشار باید توسط فرد دارای دسترسی تأیید شود." checked={organization.requires_approval} disabled={busy} onChange={event => run(async () => {
          await organizationAPI.update(organizationId, { requires_approval: event.target.checked }); await reload();
        }, 'سیاست تأیید مجموعه ذخیره شد.')} />
      </section>}
      {manager && <>
        <form className={styles.panel} onSubmit={invite}><h2>دعوت همکار</h2><p>ایمیل همکار را وارد کنید، سپس برندهای مجاز و نقش او را انتخاب کنید.</p>
          <Input disabled={busy} label="ایمیل همکار" type="email" dir="ltr" placeholder="name@example.com" value={email} onChange={event => setEmail(event.target.value)} required />
          <NativeSelect disabled={busy} label="نقش در مجموعه" value={orgRole} onChange={event => setOrgRole(event.target.value)}>
            <option value="member">عضو مجموعه</option>{organization.my_role === 'owner' && <option value="admin">ادمین مجموعه</option>}
          </NativeSelect>
          <Grants disabled={busy} workspaces={workspaces} value={grants} onChange={setGrants} />
          <p>ادمین مجموعه تیم و برندها را مدیریت می‌کند. نقش هر برند، دسترسی به محتوای آن را تعیین می‌کند.</p>
          <Button type="submit" disabled={busy || !grants.length}>ارسال دعوت</Button>
        </form>
        <section className={styles.panel}><h2>اعضای تیم</h2><p>مالک مجموعه: <bdi dir="ltr">{organization.my_role === 'owner' ? (user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || user.username || 'شما') : 'مالک ثبت‌شدهٔ مجموعه'}</bdi></p>
          {!members.some(member => member.user_id !== organization.owner_user) && <p>هنوز همکاری به تیم اضافه نشده است. از فرم دعوت همکار استفاده کنید.</p>}
          {members.filter(member => member.user_id !== organization.owner_user).map(member => <MemberEditor
            key={`${organizationId}:${member.user_id}:${member.is_active}:${JSON.stringify(member.workspace_grants)}:${member.role}`}
            member={member} organization={organization} workspaces={workspaces} onSaved={loadTeam} onError={setError} />)}
        </section>
        <section className={styles.panel}><h2>دعوت‌های در انتظار</h2>{!invitations.some(item => item.status === 'pending') && <p>دعوتی در انتظار پذیرش نیست.</p>}{invitations.filter(item => item.status === 'pending').map(item => <div key={item.id} className={styles.listRow}>
          <bdi dir="ltr">{item.email}</bdi>
          {(organization.my_role === 'owner' || item.organization_role !== 'admin') && <Button variant="secondary" disabled={busy} onClick={() => run(async () => {
            await organizationAPI.cancelInvitation(organizationId, item.id); await loadTeam();
          }, 'دعوت لغو شد.')}>لغو دعوت</Button>}
        </div>)}</section>
      </>}
    </>}
  </div>;
}
