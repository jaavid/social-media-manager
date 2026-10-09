/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState, useEffect, useRef } from 'react';
import { Send, Check, CheckCheck, AlertCircle, Loader2, MessageCircle } from 'lucide-react';

import PageHeader from '../components/layout/PageHeader';
import { useWhatsAppInbox, useWhatsAppThread } from '../hooks/useWhatsApp';
import { whatsappAPI } from '@/services/domains/messaging';
import { useLanguage } from '../i18n';

const COLORS = {
  primary: '#00CCF5', primaryD: '#00A8D8',
  border: 'var(--border-default)', text: 'var(--text-primary)', muted: 'var(--text-secondary)',
  success: '#10b981', danger: '#dc2626',
  bubbleOut: 'var(--brand-primary-soft)', bubbleIn: 'var(--surface-card)',
};

export default function WhatsAppInboxPage() {
  const { t } = useLanguage();
  const { data: conversations, refetch: refetchInbox, loading } = useWhatsAppInbox();
  const [activeId, setActiveId] = useState(null);
  const { data: thread, refetch: refetchThread, loading: threadLoading } = useWhatsAppThread(activeId);

  return (
    <div className="app-page app-page--content app-page--xl">
      <PageHeader title="Inbox" subtitle="WhatsApp conversations" />

      <div className={`whatsapp-inbox ${activeId ? 'whatsapp-inbox-selected' : ''}`} style={{
        display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)',
        gap: 0, padding: '0 16px', height: 'calc(100vh - 130px)',
      }}>
        {/* Left: Conversations */}
        <aside className="whatsapp-conversations" style={{ ...card, borderRight: 'none', borderRadius: '12px 0 0 12px', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <header style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`, fontWeight: 700, color: COLORS.text }}>
            Conversations ({conversations.length})
          </header>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {loading && <div style={{ padding: 16, color: COLORS.muted }}><Loader2 size={14} className="spin" /> Loading…</div>}
            {!loading && conversations.length === 0 && (
              <div style={{ padding: 24, color: COLORS.muted, textAlign: 'center' }}>
                <MessageCircle size={28} style={{ opacity: 0.5 }} />
                <div style={{ marginTop: 8, fontSize: 13 }}>No conversations yet</div>
              </div>
            )}
            {conversations.map((c) => (
              <ConversationRow
                key={c.contact.id}
                conv={c}
                active={activeId === c.contact.id}
                onClick={() => setActiveId(c.contact.id)}
              />
            ))}
          </div>
        </aside>

        {/* Right: Thread */}
        <section className="whatsapp-thread" style={{ ...card, borderRadius: '0 12px 12px 0', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeId && <button type="button" className="whatsapp-back" onClick={() => setActiveId(null)} style={{ padding: 12, color: COLORS.text, background: 'var(--surface-card)', border: 'none', textAlign: 'start' }}>{t('whatsapp.inbox.back')}</button>}
          {!activeId && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted }}>
              Select a conversation
            </div>
          )}
          {activeId && (
            <Thread
              key={activeId}
              data={thread}
              loading={threadLoading}
              onSent={() => { refetchThread(); refetchInbox(); }}
            />
          )}
        </section>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .whatsapp-back { display: none; }
        @media (max-width: 767px) {
          .whatsapp-inbox { grid-template-columns: minmax(0, 1fr) !important; height: calc(100dvh - 240px) !important; min-height: 240px; }
          .whatsapp-inbox > .whatsapp-thread { display: none !important; }
          .whatsapp-inbox-selected > .whatsapp-conversations { display: none !important; }
          .whatsapp-inbox-selected > .whatsapp-thread { display: flex !important; }
          .whatsapp-inbox > aside, .whatsapp-inbox > section { border: 1px solid var(--border-default) !important; border-radius: 12px !important; }
          .whatsapp-back { display: block; flex-shrink: 0; }
        }
      `}</style>
    </div>
  );
}

function ConversationRow({ conv, active, onClick }) {
  const c = conv.contact;
  const lm = conv.last_message;
  return (
    <button onClick={onClick} style={{
      ...convRow,
      background: active ? 'var(--brand-primary-soft)' : 'transparent',
    }}>
      <div style={{ ...avatar, background: stringHueGrad(c.name || c.phone) }}>
        {(c.name || c.phone || '?')[0].toUpperCase()}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name || c.phone}
          </span>
          {conv.within_24h ? (
            <span style={{ fontSize: 10, color: COLORS.success, fontWeight: 700 }}>● 24h</span>
          ) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
          <span style={{
            fontSize: 12, color: COLORS.muted, whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
          }}>
            {lm?.preview || ''}
          </span>
          {conv.unread_count > 0 && (
            <span style={unreadBadge}>{conv.unread_count}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function Thread({ data, loading, onSent }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages?.length]);

  if (loading || !data) return <div style={{ padding: 24 }}><Loader2 size={14} className="spin" /></div>;

  const within24h = data.contact?.within_24h_window;

  async function send() {
    if (!text.trim() || sending) return;
    if (!within24h) {
      setError('24h window closed — only template messages allowed.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await whatsappAPI.inbox.sendDirect({
        contact_id: data.contact.id,
        type: 'text',
        payload: { body: text },
      });
      setText('');
      onSent();
    } catch (e) {
      setError(e.response?.data?.detail || e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }

  // Reverse for bottom-up display (API returns newest first)
  const messages = [...(data.messages || [])].reverse();

  return (
    <>
      <header style={{
        padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0,
      }}>
        <div style={{ ...avatar, background: stringHueGrad(data.contact?.name || data.contact?.phone) }}>
          {(data.contact?.name || data.contact?.phone || '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: COLORS.text }}>
            {data.contact?.name || data.contact?.phone}
          </div>
          <div style={{ fontSize: 11, color: COLORS.muted, fontFamily: 'monospace' }}>
            <bdi dir="ltr">{data.contact?.phone}</bdi>
          </div>
        </div>
        <span style={{
          ...badge,
          background: within24h ? '#dcfce7' : 'var(--surface-sunken)',
          color: within24h ? '#15803d' : 'var(--text-secondary)',
        }}>
          {within24h ? '24h window open' : '24h window closed'}
        </span>
      </header>

      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflow: 'auto', padding: 16,
        background: 'var(--surface-sunken)', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {messages.map((m) => <Bubble key={m.id} msg={m} />)}
      </div>

      <footer style={{
        padding: 12, flexShrink: 0, borderTop: `1px solid ${COLORS.border}`, background: 'var(--surface-card)',
      }}>
        {!within24h && (
          <div style={{ ...errorBox, marginBottom: 8 }}>
            <AlertCircle size={14} /> 24h window closed. Send an approved template message instead.
          </div>
        )}
        {error && (
          <div style={{ ...errorBox, marginBottom: 8 }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            aria-label={t('whatsapp.inbox.reply')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={within24h ? 'Type a message…' : 'Free-form replies disabled (24h window closed)'}
            disabled={!within24h || sending}
            style={input}
          />
          <button aria-label={t('whatsapp.inbox.send')} onClick={send} disabled={!within24h || sending || !text.trim()} style={btnPrimary}>
            {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
          </button>
        </div>
      </footer>
    </>
  );
}

function Bubble({ msg }) {
  const isOut = msg.direction === 'outbound';
  const body =
    msg.payload?.body ||
    msg.payload?.text?.body ||
    (msg.message_type === 'template'
      ? `[Template] ${msg.payload?.template?.name || ''}`
      : `[${msg.message_type}]`);

  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      alignSelf: isOut ? 'flex-end' : 'flex-start',
      maxWidth: '70%',
      background: isOut ? COLORS.bubbleOut : COLORS.bubbleIn,
      borderRadius: 12,
      padding: '8px 12px 6px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      fontSize: 13, color: 'var(--text-primary)',
    }}>
      <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{body}</div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 4, marginTop: 4, fontSize: 10, color: COLORS.muted,
      }}>
        <span>{time}</span>
        {isOut && <Ticks status={msg.status} />}
      </div>
    </div>
  );
}

function Ticks({ status }) {
  if (status === 'failed') return <AlertCircle size={12} color={COLORS.danger} />;
  if (status === 'read')      return <CheckCheck size={12} color="#3b82f6" />;
  if (status === 'delivered') return <CheckCheck size={12} color="#667781" />;
  if (status === 'sent')      return <Check       size={12} color="#667781" />;
  return null; // queued
}

function stringHueGrad(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue+40)%360},65%,45%))`;
}

const card = { background: 'var(--surface-card)', border: `1px solid ${COLORS.border}` };
const convRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '12px 14px', width: '100%',
  background: 'transparent', border: 'none', borderBottom: '1px solid var(--surface-sunken)',
  cursor: 'pointer', textAlign: 'left',
};
const avatar = {
  width: 36, height: 36, borderRadius: 999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
};
const unreadBadge = {
  background: COLORS.primary, color: '#fff', borderRadius: 999,
  padding: '1px 7px', fontSize: 10, fontWeight: 700, marginLeft: 6,
};
const badge = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
};
const input = {
  flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 8,
  background: 'var(--surface-card)', color: COLORS.text,
  border: `1px solid ${COLORS.border}`, fontSize: 13, outline: 'none',
};
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 40, height: 40, borderRadius: 8, border: 'none',
  flexShrink: 0,
  background: 'linear-gradient(135deg, #00CCF5, #00A8D8)', color: '#fff',
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
};
const errorBox = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 10px', borderRadius: 8,
  background: '#fef3c7', color: '#a16207',
  border: '1px solid #fde68a', fontSize: 12,
};
