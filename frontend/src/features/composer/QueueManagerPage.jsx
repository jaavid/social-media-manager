/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import {
  Plus, Layers, Pause, Play, Trash2, Clock, Edit2, X, GripVertical,
} from 'lucide-react';
import toast from '../../components/ui/toast';

import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import DataState from '../../components/ui/DataState';
import Badge from '../../components/ui/Badge';
import { usePostQueues } from '../../hooks/useComposer';
import { composerAPI } from '../../services/api';
import { getPlatformRegistry, platformHasCapability } from '../../services/platforms';
import { useLanguage } from '../../i18n';

const STRATEGIES = [
  { id: 'sequential',  label: 'Sequential' },
  { id: 'random',      label: 'Random' },
  { id: 'round_robin', label: 'Round-robin' },
];

export default function QueueManagerPage() {
  const { data: queues, refetch, loading, error } = usePostQueues();
  const { tr } = useLanguage();
  const [activeId, setActiveId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Auto-select first queue once available
  useEffect(() => {
    if (!activeId && queues.length > 0) setActiveId(queues[0].id);
  }, [queues, activeId]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <PageHeader
        title="Queues"
        subtitle="Recurring auto-post slots that drain pre-written content"
        action={<Button icon={Plus} onClick={() => setShowCreate(true)}>New Queue</Button>}
      />

      <div style={{
        display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)',
        gap: 16, padding: '0 24px',
      }} className="queue-grid">
        {/* Left: queue list */}
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {loading && <DataState state="loading" compact title={tr('Loading queues')} />}
          {!loading && error && (
            <DataState state="error" compact title={tr('Queues could not be loaded')}
                       action={<Button size="sm" onClick={refetch}>{tr('Retry')}</Button>} />
          )}
          {!loading && !error && queues.length === 0 && (
            <DataState
              state="empty"
              icon={Layers}
              title="No queues yet"
              description="Queues schedule recurring posts. Create one with a cron rule like '0 10 * * 1-5' for weekday mornings."
              action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Create queue</Button>}
            />
          )}
          {!error && queues.map((q) => (
            <QueueRow key={q.id} queue={q} active={activeId === q.id}
                      onClick={() => setActiveId(q.id)} onChange={refetch} />
          ))}
        </Card>

        {/* Right: queue items */}
        <Card padding="none" style={{ overflow: 'hidden' }}>
          {activeId
            ? <QueueDetail key={activeId} queueId={activeId} onChanged={refetch} />
            : <DataState state="empty" icon={Layers} title="Select a queue" />}
        </Card>
      </div>

      {showCreate && (
        <CreateQueueModal
          onClose={() => setShowCreate(false)}
          onCreated={(q) => { setShowCreate(false); refetch(); setActiveId(q.id); }}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .queue-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Queue list row ───────────────────────────────────────────────────── */
function QueueRow({ queue, active, onClick, onChange }) {
  async function toggle() {
    try {
      if (queue.is_active) await composerAPI.queues.pause(queue.id);
      else                  await composerAPI.queues.resume(queue.id);
      onChange();
    } catch { toast.error('Failed'); }
  }
  async function destroy(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete queue "${queue.name}"?`)) return;
    try { await composerAPI.queues.delete(queue.id); onChange(); }
    catch { toast.error('Delete failed'); }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '12px 14px',
        background: active ? 'var(--brand-primary-glow)' : 'transparent',
        border: 'none', borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
        transition: 'var(--transition-fast)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {queue.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {queue.schedule_rule || '— no rule —'}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <Badge variant={queue.is_active ? 'success' : 'default'} dot>
              {queue.is_active ? 'Active' : 'Paused'}
            </Badge>
            <Badge>{queue.waiting_count} waiting</Badge>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            aria-label={queue.is_active ? 'Pause' : 'Resume'}
            style={iconBtnStyle}
          >
            {queue.is_active ? <Pause size={12} /> : <Play size={12} />}
          </span>
          <span
            role="button"
            onClick={destroy}
            aria-label="Delete queue"
            style={{ ...iconBtnStyle, color: 'var(--danger)' }}
          >
            <Trash2 size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

/* ── Queue detail (items list) ────────────────────────────────────────── */
function QueueDetail({ queueId, onChanged }) {
  const [queue, setQueue] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(false);
  const [reordering, setReordering] = useState(false);
  const { tr } = useLanguage();

  async function load() {
    setLoading(true);
    try {
      const res = await composerAPI.queues.get(queueId);
      setQueue(res.data);
      setItems(res.data.items_list || []);
      setError(false);
    } catch (e) {
      setError(true);
      toast.error(tr('Failed to load queue'));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [queueId]);

  async function addItem(content) {
    await composerAPI.queues.addItems(queueId, [{ content }]);
    toast.success('Added to queue');
    setShowAdd(false);
    load(); onChanged?.();
  }

  if (!loading && error) return (
    <DataState state="error" title={tr('Failed to load queue')}
               action={<Button onClick={load}>{tr('Retry')}</Button>} />
  );

  async function move(index, direction) {
    const waiting = items.filter(item => item.status === 'waiting');
    const next = [...waiting];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setReordering(true);
    try {
      await composerAPI.queues.reorder(queueId, next.map(item => item.id));
      await load();
      onChanged?.();
    } catch { toast.error(tr('Could not reorder queue')); }
    finally { setReordering(false); }
  }

  if (loading || !queue) {
    return <DataState state="loading" compact title={tr('Loading queue')} />;
  }

  return (
    <div>
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
            {queue.name}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4,
          }}>
            <Clock size={12} />
            <span style={{ fontFamily: 'var(--font-mono)' }}>{queue.schedule_rule || '—'}</span>
            <span>·</span>
            <span>{queue.queue_strategy}</span>
            <span>·</span>
            <span>{(queue.platforms || []).join(', ') || 'no platforms'}</span>
          </div>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>Add item</Button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{
          display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)',
          marginBottom: 16,
        }}>
          <span><strong>{queue.items_count}</strong> total items</span>
          <span><strong>{queue.waiting_count}</strong> waiting</span>
          {queue.last_dispatched_at && (
            <span>last fired {new Date(queue.last_dispatched_at).toLocaleString()}</span>
          )}
        </div>

        {items.filter(item => item.status === 'waiting').length === 0
          ? <p>{tr('No waiting items')}</p>
          : <ol aria-label={tr('Waiting posts')} style={{ paddingInlineStart: 24 }}>
            {items.filter(item => item.status === 'waiting').map((item, index, waiting) => <li key={item.id} style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.content || tr('Media post')}</p>
              <Button size="sm" variant="secondary" disabled={reordering || index === 0} onClick={() => move(index, -1)} aria-label={`${tr('Move up')} · ${item.content}`}>{tr('Move up')}</Button>
              <Button size="sm" variant="secondary" disabled={reordering || index === waiting.length - 1} onClick={() => move(index, 1)} aria-label={`${tr('Move down')} · ${item.content}`}>{tr('Move down')}</Button>
            </li>)}
          </ol>}

      </div>

      {showAdd && (
        <AddItemModal onClose={() => setShowAdd(false)}
                      onSave={addItem} />
      )}
    </div>
  );
}

/* ── Modals ───────────────────────────────────────────────────────────── */
function CreateQueueModal({ onClose, onCreated }) {
  const { tr } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    schedule_rule: '0 10 * * 1-5',
    queue_strategy: 'sequential',
    platforms: ['facebook', 'instagram'],
  });
  const [saving, setSaving] = useState(false);
  const platforms = getPlatformRegistry().filter(platform => platformHasCapability(platform, 'publish'));

  function togglePlatform(key) {
    setForm(current => ({
      ...current,
      platforms: current.platforms.includes(key)
        ? current.platforms.filter(platform => platform !== key)
        : [...current.platforms, key],
    }));
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const res = await composerAPI.queues.create(form);
      onCreated(res.data);
      toast.success('Queue created');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={tr('New queue')} showClose={false}>
      <Card padding="none" style={{ width: '100%' }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16 }}>New queue</h3>
          <button onClick={onClose} style={iconBtnStyle} aria-label="Close"><X size={14} /></button>
        </div>
        <div style={{ padding: 16 }}>
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                   placeholder="Weekday mornings" style={inputStyle} />
          </Field>
          <Field label="Schedule (cron)">
            <input value={form.schedule_rule}
                   onChange={(e) => setForm({ ...form, schedule_rule: e.target.value })}
                   placeholder="0 10 * * 1-5"
                   style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
            <span style={helpStyle}>e.g. <code style={code}>0 10 * * 1-5</code> = 10am Mon–Fri</span>
          </Field>
          <Field label="Strategy">
            <select value={form.queue_strategy}
                    onChange={(e) => setForm({ ...form, queue_strategy: e.target.value })}
                    style={inputStyle}>
              {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Platforms">
            <span className="grid gap-2 sm:grid-cols-2">
              {platforms.map(platform => (
                <label key={platform.key} className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <input type="checkbox" checked={form.platforms.includes(platform.key)}
                         onChange={() => togglePlatform(platform.key)} />
                  <span>{platform.labels?.default || platform.label || platform.key}</span>
                </label>
              ))}
            </span>
          </Field>
        </div>
        <div style={modalFooter}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Create</Button>
        </div>
      </Card>
    </Modal>
  );
}

function AddItemModal({ onClose, onSave }) {
  const { t, tr } = useLanguage();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (saving || !content.trim()) return;
    setSaving(true);
    setError('');
    try { await onSave(content); }
    catch { setError(t('composer.queue.failed')); }
    finally { setSaving(false); }
  }
  function close() { if (!saving) onClose(); }
  return (
    <Modal open onClose={close} title={tr('Add to queue')} showClose={false}>
      <Card padding="none" style={{ width: '100%' }}>
        <div style={modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Add to queue</h3>
          <button onClick={close} disabled={saving} style={iconBtnStyle} aria-label="Close"><X size={14} /></button>
        </div>
        <div style={{ padding: 16 }}>
          <Field label="Post content">
            <textarea value={content} disabled={saving} onChange={(e) => setContent(e.target.value)}
                      rows={6} placeholder="Write the post that'll fire next time this queue runs…"
                      style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical' }} />
          </Field>
          {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
        <div style={modalFooter}>
          <Button variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!content.trim()}>Add</Button>
        </div>
      </Card>
    </Modal>
  );
}

/* ── Layout helpers ───────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', height: 36, padding: '0 12px',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box', minHeight: 'unset',
};

const fieldLabel = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--text-tertiary)', textTransform: 'uppercase',
  letterSpacing: 0.4, marginBottom: 6,
};

const helpStyle = {
  display: 'block', marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)',
};

const code = {
  background: 'var(--surface-sunken)', padding: '0 6px', borderRadius: 4,
  fontFamily: 'var(--font-mono)', fontSize: 11,
};

const iconBtnStyle = {
  width: 28, height: 28, borderRadius: 'var(--radius-sm)',
  background: 'transparent', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-tertiary)',
  minHeight: 'unset', minWidth: 'unset',
};

const modalHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)',
};

const modalFooter = {
  display: 'flex', justifyContent: 'flex-end', gap: 8,
  padding: '12px 16px', borderTop: '1px solid var(--border-subtle)',
};
