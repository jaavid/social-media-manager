import { useLanguage } from '../../i18n';
/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * NotificationPreferencesPage — per-channel-per-event opt-in matrix.
 *
 * Renders a table: rows = event types, columns = channels (in-app / email /
 * WhatsApp / browser push). Each cell is a checkbox that mutates the local
 * draft; "Save changes" PUTs the diff to the server.
 *
 * Channel availability:
 *   - in_app + email are live
 *   - whatsapp + browser push render as "Coming soon" — server still accepts
 *     the preference but doesn't deliver yet (logged TODO).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Save, Inbox, Mail, MessageCircle, Globe, Sparkles,
} from 'lucide-react';

import { notificationPrefsAPI } from '../../services/api';
import { AccountScope, useAccountRead, useCheckedAction, ReadState, WriteState } from '@/components/ui/accountRecovery';
import { parsePreferences, parsePreferenceWrite } from '@/lib/settingsRecovery';


const CHANNEL_META = [
  { key: 'in_app',   label: 'In-app',   icon: Inbox,         status: 'live' },
  { key: 'email',    label: 'Email',    icon: Mail,          status: 'live' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, status: 'soon' },
  { key: 'browser',  label: 'Push',     icon: Globe,         status: 'soon' },
];

// Group event types into sections so the matrix is readable.
const SECTIONS = [
  {
    title: 'Marketplace',
    events: [
      'manage_request_received',
      'agency_invite_received',
      'approval_requested',
      'approval_decided',
      'relation_terminated',
      'new_review_received',
      'review_response',
      'marketplace_inquiry',
    ],
  },
  {
    title: 'Engagement & alerts',
    events: [
      'inbox_message',
      'inbox_review',
      'mention',
      'viral_post',
      'engagement_drop',
      'negative_cluster',
      'follower_milestone',
    ],
  },
  {
    title: 'Posting',
    events: [
      'post_published',
      'publish_failed',
      'approval_pending',
      'best_time_window',
    ],
  },
  {
    title: 'Account',
    events: [
      'token_expiring',
    ],
  },
];


function normalizeMatrix(data) {
  const checked = parsePreferences(data);
  return checked.matrix.map(row => ({
    ...row,
    label: data.events?.find(event => event.id === row.event_type)?.label || row.event_type.replaceAll('_', ' '),
    channels: Object.fromEntries((data.channels || []).map(channel => [channel.id, !!row[channel.id]])),
  }));
}

export default function NotificationPreferencesPage() {
  return <AccountScope>{(identity, enabled, key) => <Preferences key={`${key}:${enabled}`} identity={identity} enabled={enabled} />}</AccountScope>;
}
function Preferences({ identity, enabled }) {
  const { tr, t } = useLanguage();
  const resource = useAccountRead('notification-preferences', identity, enabled, notificationPrefsAPI.get, parsePreferences);
  const action = useCheckedAction();
  const initialized = useRef(false);
  const [channels, setChannels] = useState([]);
  const [matrix,  setMatrix]  = useState([]);
  const [draft,   setDraft]   = useState({});  // { event_type: { channel: bool } }
  const saving = action.busy;

  useEffect(() => {
    if (!resource.data || initialized.current) return;
    initialized.current = true;
    const data = resource.data;
    queueMicrotask(() => {
      if (!action.alive.current) return;
      const m = normalizeMatrix(data);
      setMatrix(m);
      setChannels(data.channels.map(c => ({ ...CHANNEL_META.find(meta => meta.key === c.id), key: c.id, label: c.label })));
      setDraft(Object.fromEntries(m.map(row => [row.event_type, { ...row.channels }])));
    });
  }, [resource.data, action.alive]);

  const dirty = useMemo(() => {
    return matrix.some((row) =>
      Object.entries(row.channels || {}).some(([ch, val]) => draft[row.event_type]?.[ch] !== val)
    );
  }, [matrix, draft]);

  const matrixByEvent = useMemo(
    () => Object.fromEntries(matrix.map((m) => [m.event_type, m])),
    [matrix]
  );

  function toggle(eventType, channel) {
    setDraft((prev) => ({
      ...prev,
      [eventType]: { ...prev[eventType], [channel]: !prev[eventType]?.[channel] },
    }));
  }

  async function save() {
    const rows = [];
    matrix.forEach((row) => {
      Object.entries(row.channels || {}).forEach(([ch, val]) => {
        const next = draft[row.event_type]?.[ch];
        if (next !== val) {
          rows.push({ event_type: row.event_type, channel: ch, enabled: !!next });
        }
      });
    });
    if (rows.length === 0) return;
    if (resource.denied || action.denied) return;
    action.run(async () => parsePreferenceWrite((await notificationPrefsAPI.update(rows)).data, rows.length), async () => {
      const next = { ...resource.data, matrix: resource.data.matrix.map(row => ({ ...row, ...draft[row.event_type] })) };
      await resource.commit(next);
      if (action.alive.current) setMatrix(normalizeMatrix(next));
    });
  }

  const recover = async () => { const result = await resource.query.refetch(); if (action.alive.current && result.isSuccess) action.verified(); return result; };
  if (!resource.data || action.denied) return <><ReadState resource={resource} refresh={recover} /><WriteState action={action} recover={recover} /></>;
  const known = new Set(SECTIONS.flatMap(section => section.events));
  const sections = [...SECTIONS, { title: 'Other events', events: matrix.map(row => row.event_type).filter(event => !known.has(event)) }];
  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={iconWrap}><Bell size={20} strokeWidth={2.2} /></span>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{tr("Notifications")}</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{tr("Choose how you want to be told about each thing that happens.")}</p>
        </div>
        <button type="button" onClick={save} disabled={!dirty || action.locked || resource.query.isFetching} style={dirty && !saving ? btnPrimary : btnDisabled}>
          <Save size={13} /> {saving ? tr("Saving…") : (dirty ? tr("Save changes") : tr("No changes"))}
        </button>
      </header>

      <ReadState resource={resource} refresh={recover} busy={saving} />
      <WriteState action={action} recover={recover} />
      {action.success && <p role="status">{t('account.saved')}</p>}
      <p style={hint}>
        <Sparkles size={11} style={{ verticalAlign: '-1px', marginRight: 4, color: 'var(--brand-primary-hover)' }} />{tr("WhatsApp and Push are")} <strong>{tr("coming soon")}</strong> {tr("— your preferences are saved and will activate the moment those channels go live.")}</p>

      {sections.filter(section => section.events.some(event => matrixByEvent[event])).map((section) => (
        <section key={section.title} style={card}>
          <h2 style={sectionH}>{tr(section.title)}</h2>
          <div style={tableWrap}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '40%' }}>{tr("Event")}</th>
                  {channels.map((c) => (
                    <th key={c.key} style={{ ...th, textAlign: 'center', width: '15%' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        {c.icon && <c.icon size={12} />} {tr(c.label)}
                      </span>
                      {c.status === 'soon' && (
                        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>{tr("coming soon")}</div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.events.map((ev) => {
                  const row = matrixByEvent[ev];
                  if (!row) return null;
                  return (
                    <tr key={ev} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={td}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{tr(row.label)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{ev}</div>
                      </td>
                      {channels.map((c) => (
                        <td key={c.key} style={{ ...td, textAlign: 'center' }}>
                          <input
                            type="checkbox" disabled={saving}
                            checked={!!draft[ev]?.[c.key]}
                            onChange={() => toggle(ev, c.key)}
                            aria-label={`${tr(row.label)} · ${tr(c.label)}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}


const iconWrap = {
  width: 40, height: 40,
  background: 'var(--brand-primary-glow)',
  color: 'var(--brand-primary-hover)',
  borderRadius: 'var(--radius-md)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};

const card = {
  padding: 18,
  background: 'var(--surface-card)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
};

const sectionH = {
  margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
};

const tableWrap = { overflowX: 'auto' };

const th = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 11, fontWeight: 600,
  letterSpacing: '0.04em', textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
};

const td = {
  padding: '10px',
  verticalAlign: 'middle',
};

const hint = {
  margin: 0,
  padding: '10px 14px',
  fontSize: 12, color: 'var(--text-secondary)',
  background: 'var(--surface-sunken)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
};

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 16px',
  background: 'var(--brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
};
const btnDisabled = {
  ...btnPrimary,
  background: 'var(--border-default)', color: 'var(--text-tertiary)', cursor: 'default',
};
