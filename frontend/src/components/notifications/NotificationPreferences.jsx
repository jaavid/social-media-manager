/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useRef, useState } from 'react';
import { useLanguage } from '@/i18n';
import { notificationsAPI } from '@/services/domains/reporting';
import { parsePreferences, parsePreferenceWrite } from '@/lib/settingsRecovery';
import { AccountScope, useAccountRead, useCheckedAction, ReadState, WriteState } from '@/components/ui/accountRecovery';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
export default function NotificationPreferencesPage() {
  return <AccountScope>{(identity, enabled, key) => <Preferences key={`${key}:${enabled}`} identity={identity} enabled={enabled} />}</AccountScope>;
}
function Preferences({ identity, enabled }) {
  const { t } = useLanguage();
  const resource = useAccountRead('notification-preferences', identity, enabled, notificationsAPI.getPreferences, parsePreferences);
  const heading = useRef(null);
  return <Card padding="md"><section aria-label={t('preferences.title')} className="space-y-4">
    <h3 ref={heading} tabIndex={-1}>{t('preferences.title')}</h3>
    <ReadState resource={resource} refresh={() => resource.query.refetch()} returnFocusRef={heading} />
    {resource.data && <Draft resource={resource} heading={heading} />}
  </section></Card>;
}
function Draft({ resource, heading }) {
  const { t, tr } = useLanguage();
  const [draft, setDraft] = useState(resource.data), [observed, setObserved] = useState(false);
  const action = useCheckedAction();
  const flat = () => draft.matrix.flatMap(row => draft.channels.map(c => ({ event_type: row.event_type, channel: c.id, enabled: row[c.id] })));
  const refresh = async () => {
    const result = await resource.query.refetch();
    if (action.alive.current && result.isSuccess && action.uncertain) { action.verified(); setObserved(true); }
    return result;
  };
  const save = () => {
    if (action.denied || resource.denied) return;
    const rows = flat(); setObserved(false);
    action.run(async () => parsePreferenceWrite((await notificationsAPI.putPreferences(rows)).data, rows.length), async () => { await resource.commit(draft); heading.current?.focus(); });
  };
  return <div className="space-y-4">
    {!action.denied && <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-start">{t('preferences.event')}</th>{draft.channels.map(c => <th className="p-2" key={c.id}>{tr(c.label)}</th>)}</tr></thead>
      <tbody>{draft.matrix.map(row => { const label = draft.events.find(e => e.id === row.event_type).label;
        return <tr key={row.event_type}><th scope="row" className="p-2 text-start">{tr(label)}</th>{draft.channels.map(c => <td className="p-2 text-center" key={c.id}><input type="checkbox" aria-label={`${tr(label)} · ${tr(c.label)}`} checked={row[c.id]} disabled={action.busy} onChange={() => setDraft(old => ({ ...old, matrix: old.matrix.map(r => r.event_type === row.event_type ? { ...r, [c.id]: !r[c.id] } : r) }))} /></td>)}</tr>;
      })}</tbody></table></div>}
    <WriteState action={action} recover={refresh} />
    {observed && <p role="status">{t('preferences.observed')}</p>}{action.success && <p role="status">{t('account.saved')}</p>}
    <Button onClick={save} disabled={action.locked || action.denied || resource.query.isFetching}>{t('preferences.save')}</Button>
    <Button variant="ghost" onClick={refresh} disabled={action.busy || resource.query.isFetching}>{t('recovery.refresh')}</Button>
  </div>;
}
