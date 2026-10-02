import { useEffect, useState } from 'react';
import api, { managementAPI } from '../services/api';

const boolMap = (values) => Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '').map(([k, v]) => [k, v === 'true']));

export default function WorkspaceTeamPolicy() {
  const [workspaces, setWorkspaces] = useState([]);
  const [presets, setPresets] = useState([]);
  const [workspace, setWorkspace] = useState('');
  const [team, setTeam] = useState(null);
  const [user, setUser] = useState('');
  const [account, setAccount] = useState('');
  const [preset, setPreset] = useState('');
  const [organizationPreset, setOrganizationPreset] = useState('');
  const [permissions, setPermissions] = useState({});
  const [approvals, setApprovals] = useState({});
  const [effective, setEffective] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const base = `/management/workspaces/${workspace}`;
  const path = account ? `${base}/accounts/${account}/policy/${user}/` : `${base}/team-policy/${user}/`;

  useEffect(() => {
    let cancelled = false;
    Promise.all([managementAPI.listWorkspaces(), api.get('/management/role-presets/')])
      .then(([w, p]) => { if (!cancelled) { setWorkspaces(w.data.results || w.data); setPresets(p.data); } })
      .catch(() => { if (!cancelled) setError('Could not load workspace policies.'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTeam(null); setUser(''); setAccount(''); setError('');
    if (workspace) api.get(`${base}/team-policy/`)
      .then(r => { if (!cancelled) setTeam(r.data); })
      .catch(() => { if (!cancelled) setError('Could not load team. Workspace owner access is required.'); });
    return () => { cancelled = true; };
  }, [workspace, base]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false); setError('');
    if (user && team) api.get(path).then(r => {
      if (cancelled) return;
      setPreset(r.data.preset || '');
      setOrganizationPreset(r.data.organization_preset || '');
      setPermissions(Object.fromEntries(Object.entries(r.data.permissions || {}).map(([k, v]) => [k, String(v)])));
      setApprovals(Object.fromEntries(Object.entries(r.data.approval_overrides || {}).map(([k, v]) => [k, String(v)])));
      setEffective(r.data.effective || team.members.find(m => String(m.user_id) === user)?.effective || {});
      setLoaded(true);
    }).catch(() => { if (!cancelled) setError('Could not load member policy.'); });
    return () => { cancelled = true; };
  }, [user, account, path, team]);

  const save = async () => {
    setBusy(true); setError('');
    try {
      await api.put(path, { preset: preset || null, permissions: boolMap(permissions), approval_overrides: boolMap(approvals) });
      const r = await api.get(`${base}/team-policy/`);
      setTeam(r.data);
    } catch { setError('Could not save policy.'); }
    finally { setBusy(false); }
  };

  const choice = (values, setValues, key, label, options) => (
    <select aria-label={`${label}: ${team.actions[key]}`} value={values[key] || ''} disabled={busy}
      onChange={e => setValues({ ...values, [key]: e.target.value })}>
      <option value="">Inherit default</option>
      <option value="true">{options[0]}</option><option value="false">{options[1]}</option>
    </select>
  );
  const selectedPreset = presets.find(p => p.key === (preset || organizationPreset));
  return <section aria-label="Workspace team policy">
    <p>Choose a workspace and member to manage role defaults and exceptions. Account permissions stay within workspace access.</p>
    {error && <p role="alert">{error}</p>}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      <label>Workspace <select value={workspace} disabled={busy} onChange={e => setWorkspace(e.target.value)}>
        <option value="">Select workspace</option>{workspaces.map(w => <option key={w.id} value={w.id}>{w.company || w.name}</option>)}
      </select></label>
      {team && <label>Member <select value={user} disabled={busy} onChange={e => { setUser(e.target.value); setAccount(''); }}>
        <option value="">Select member</option>{team.members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
      </select></label>}
      {user && <label>Scope <select value={account} disabled={busy} onChange={e => setAccount(e.target.value)}>
        <option value="">Entire workspace</option>{team?.accounts.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select></label>}
    </div>
    {user && loaded && <>
      {!account && <label>Role preset <select value={preset} disabled={busy} onChange={e => setPreset(e.target.value)}>
        <option value="">Inherit organization / compatibility defaults</option>{presets.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select></label>}
      <p>Effective values show the saved policy. Save changes to refresh them. Required workspace and agency approvals always apply.</p>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%' }}>
        <thead><tr><th>Action</th><th>Permission exception</th><th>Approval exception</th><th>Preset default</th><th>Effective</th></tr></thead>
        <tbody>{Object.entries(team.actions).map(([key, label]) => <tr key={key}>
          <th scope="row" style={{ textAlign: 'left' }}>{label}</th>
          <td>{choice(permissions, setPermissions, key, 'Permission', ['Allow', 'Deny'])}</td>
          <td>{choice(approvals, setApprovals, key, 'Approval', ['Require review', 'No role review'])}</td>
          <td>{selectedPreset ? `${selectedPreset.permissions[key] ? 'Allowed' : 'Denied'} · ${selectedPreset.approval_defaults[key] ? 'Review required' : 'No role review'}` : 'Compatibility / workspace default'}</td>
          <td>{effective[key]?.allowed ? (effective[key]?.requires_approval ? 'Allowed with review' : 'Allowed') : 'Denied'}</td>
        </tr>)}</tbody>
      </table></div>
      <button type="button" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save policy'}</button>
    </>}
  </section>;
}
