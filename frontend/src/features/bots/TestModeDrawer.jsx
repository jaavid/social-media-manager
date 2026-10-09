/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */

/**
 * TestModeDrawer — slide-in panel that lets the editor fire a test run of
 * the current flow against a tester phone number.
 *
 * Flow:
 *   1. User enters a phone (E.164 ideally — backend normalises).
 *   2. POST /bot-flows/<id>/test/ — server creates a BotConversation, runs
 *      the engine synchronously to the first wait point.
 *   3. Drawer polls /bot-conversations/<conv_id>/ every 1.5s for the
 *      audit trail (steps[]) and renders them as WhatsApp-style bubbles.
 *   4. User can Stop the test (POST /bot-conversations/<id>/end/) or
 *      tap "Restart" to fire a fresh run.
 */
import { useEffect, useRef, useState } from 'react';
import { persistentStorage } from '@/lib/runtime/storage';
import { PlayCircle, RefreshCw, StopCircle, Sparkles, User, Bot, ArrowDown } from 'lucide-react';

import { botAPI, botConversationAPI } from '@/services/domains/bots';
import Drawer from '@/components/ui/Drawer';
import Input from '@/components/ui/Input';
import DataState from '@/components/ui/DataState';
import { useLanguage } from '@/i18n/index';
import { apiError } from '@/services/http/errors';

const POLL_INTERVAL_MS = 1500;
const ABANDON_AFTER_MS = 5 * 60 * 1000; // stop polling after 5min idle

export default function TestModeDrawer({ flow, onClose }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [failure, setFailure] = useState(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const failureRef = useRef(null);
  const conversationId = useRef(null);
  const stepCount = useRef(0);
  useEffect(() => {
    alive.current = true;
    persistentStorage.removeItem('bot_test_phone');
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (failure) failureRef.current?.focus();
  }, [failure]);
  const [conv, setConv] = useState(null);
  const [steps, setSteps] = useState([]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const pollTimer = useRef(null);
  const lastActivityAt = useRef(Date.now());

  // Auto-scroll on new steps
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps.length]);

  // Cleanup poll on unmount
  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function poll(convId, owner = generation.current) {
    botConversationAPI
      .get(convId)
      .then((r) => {
        if (!alive.current || owner !== generation.current) return;
        const c = r.data;
        if (
          !c ||
          c.id !== convId ||
          c.flow !== flow.id ||
          c.client !== flow.client ||
          !Array.isArray(c.steps) ||
          !['active', 'completed', 'abandoned', 'handed_off', 'failed', 'exited'].includes(c.status)
        )
          throw new Error('Invalid conversation');
        if (c.steps.length !== stepCount.current) lastActivityAt.current = Date.now();
        stepCount.current = c.steps.length;
        setFailure(null);
        setSteps(c.steps);
        setConv(c);
        setRunning(c.status === 'active');
        if (c.status === 'active' && Date.now() - lastActivityAt.current < ABANDON_AFTER_MS)
          pollTimer.current = setTimeout(() => poll(convId, owner), POLL_INTERVAL_MS);
      })
      .catch((error) => {
        if (!alive.current || owner !== generation.current) return;
        if ([401, 403, 404].includes(apiError(error).status)) {
          setConv(null);
          setSteps([]);
          setRunning(false);
        }
        setFailure(error); // Keep the valid snapshot; explicit retry reads only, never starts another test.
      });
  }
  async function start() {
    if (!phone.trim() || busyRef.current || ambiguous) return;
    busyRef.current = true;
    setBusy(true);
    setFailure(null);
    stopPolling();
    generation.current++;
    try {
      const r = await botAPI.test(flow.id, phone.trim());
      if (!Number.isSafeInteger(r.data?.conversation_id) || r.data.conversation_id <= 0)
        throw new Error('Invalid test acknowledgement');
      if (!alive.current) return;
      conversationId.current = r.data.conversation_id;
      setSteps([]);
      lastActivityAt.current = Date.now();
      setRunning(true);
      poll(r.data.conversation_id);
    } catch (error) {
      if (!alive.current) return;
      const normalized = apiError(error);
      if (!normalized.status || normalized.status >= 500) setAmbiguous(true);
      setFailure(error);
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function stop() {
    if (!conv?.id || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    stopPolling();
    setFailure(null);
    generation.current++;
    try {
      const r = await botConversationAPI.end(conv.id);
      if (!r.data || r.data.id !== conv.id || r.data.status !== 'exited')
        throw new Error('Invalid stop result');
      if (alive.current) {
        setRunning(false);
        setConv(r.data);
      }
    } catch (error) {
      if (alive.current) setFailure(error);
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <Drawer
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      title={t('editor.testTitle')}
      width={420}
    >
      {failure && (
        <DataState
          focusRef={failureRef}
          state={conv ? 'stale' : 'error'}
          compact
          title={t(ambiguous ? 'editor.testUnknown' : 'editor.testFailed')}
          referenceId={apiError(failure).referenceId}
          action={
            conversationId.current && (
              <button type="button" onClick={() => poll(conversationId.current)}>
                {t('analytics.report.retry')}
              </button>
            )
          }
        />
      )}
      {/* Phone + start */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Input
            label={t('editor.testPhone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          {!running ? (
            <button
              type="button"
              onClick={start}
              disabled={busy || ambiguous || !phone.trim()}
              style={btnPrimary}
            >
              {busy ? (
                '…'
              ) : (
                <>
                  {steps.length ? (
                    <>
                      <RefreshCw size={13} /> Restart
                    </>
                  ) : (
                    <>
                      <PlayCircle size={13} /> Run
                    </>
                  )}
                </>
              )}
            </button>
          ) : (
            <button type="button" onClick={stop} disabled={busy} style={btnDanger}>
              <StopCircle size={13} /> Stop
            </button>
          )}
        </div>
        {conv && (
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-tertiary)' }}>
            Conversation #{conv.id} · status:{' '}
            <strong
              style={{
                color: running
                  ? 'var(--success)'
                  : conv.status === 'completed'
                    ? 'var(--success)'
                    : conv.status === 'failed'
                      ? 'var(--danger)'
                      : 'var(--text-tertiary)',
              }}
            >
              {conv.status}
            </strong>
          </div>
        )}
      </div>

      {/* Audit trail */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: 14, background: 'var(--surface-sunken)' }}
      >
        {steps.length === 0 && !running && <Empty />}
        {steps.map((s, i) => (
          <StepRow key={s.id || i} step={s} />
        ))}
        {running && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '8px 12px',
              color: 'var(--text-tertiary)',
              fontSize: 12,
            }}
          >
            <Sparkles size={11} className="ai-loading-pulse" /> Bot is thinking…
            <style>{`@keyframes ai-loading-pulse{0%,100%{opacity:.6}50%{opacity:1}} .ai-loading-pulse{animation:ai-loading-pulse 1.4s ease-in-out infinite} @media(prefers-reduced-motion:reduce){.ai-loading-pulse{animation:none}}`}</style>
          </div>
        )}
      </div>

      {/* Variables panel */}
      {conv?.variables &&
        Object.keys(conv.variables).filter((k) => !k.startsWith('_')).length > 0 && (
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--surface-card)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                marginBottom: 4,
              }}
            >
              Variables collected
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {Object.entries(conv.variables)
                .filter(([k]) => !k.startsWith('_'))
                .map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      padding: '2px 7px',
                      background: 'var(--surface-sunken)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 11,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {k}=
                    <strong>
                      {typeof v === 'object'
                        ? JSON.stringify(v).slice(0, 40)
                        : String(v).slice(0, 40)}
                    </strong>
                  </span>
                ))}
            </div>
          </div>
        )}
    </Drawer>
  );
}

function StepRow({ step }) {
  const isUser = step.direction === 'user_to_bot';
  const isSystem = step.direction === 'system';
  const text = stepText(step);

  if (isSystem) {
    return (
      <div style={{ display: 'flex', gap: 6, padding: '6px 0', justifyContent: 'center' }}>
        <span
          style={{
            padding: '3px 10px',
            fontSize: 10,
            fontWeight: 600,
            background: 'var(--surface-card)',
            color: 'var(--text-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {step.node_type} {text && `· ${text.slice(0, 50)}`}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        marginBottom: 8,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          flexShrink: 0,
          background: isUser ? 'var(--surface-card)' : 'var(--brand-gradient)',
          color: isUser ? 'var(--text-secondary)' : '#fff',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isUser ? <User size={11} /> : <Bot size={11} />}
      </span>
      <div
        style={{
          maxWidth: '75%',
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 'var(--line-height-body)',
          background: isUser ? 'var(--surface-card)' : '#dcf8c6',
          color: isUser ? 'var(--text-primary)' : '#1f2c34',
          border: `1px solid ${isUser ? 'var(--border-subtle)' : 'transparent'}`,
          borderRadius: isUser ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {text || <em style={{ color: 'var(--text-tertiary)' }}>({step.node_type})</em>}
      </div>
    </div>
  );
}

function stepText(s) {
  const p = s.payload || {};
  if (p.text) return p.text;
  if (p.body)
    return p.body + (p.buttons ? `\n${p.buttons.map((b) => `[${b.title}]`).join('  ')}` : '');
  if (p.caption) return p.caption + (p.link ? `\n${p.link}` : '');
  if (p.template_name) return `📨 ${p.template_name}`;
  return '';
}

function Empty() {
  return (
    <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      <ArrowDown size={20} style={{ opacity: 0.4, marginBottom: 8 }} />
      <div>Enter a phone number above and click Run.</div>
      <p style={{ margin: '8px 0 0', fontSize: 11 }}>
        Use a real WhatsApp number you control — the bot will message it via your Pinbot account.
      </p>
    </div>
  );
}

const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 14px',
  background: 'var(--brand-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
};
const btnDanger = {
  ...btnPrimary,
  background: 'var(--danger)',
};
