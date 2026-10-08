/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { cn } from '../../lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sparkles,
  Wand2,
  Hash,
  RefreshCw,
  Languages,
  Clock,
  X,
  Copy,
  Check,
  Loader2,
  Send,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import toast from '../ui/toast';
import Button from '../ui/Button';
import { aiAPI } from '../../services/api';

/**
 * Floating AI Assistant — bottom-right launcher + Cmd/Ctrl+J keyboard shortcut.
 *
 * Tabs:
 *   Compose     → /ai/compose-post/      → 3 variants
 *   Hashtags    → /ai/suggest-hashtags/
 *   Rewrite     → /ai/rewrite/
 *   Translate   → /ai/translate/
 *   Best Time   → /ai/best-time-to-post/
 *   Image Caption → /ai/generate-image-caption/
 *
 * Each tab has its own small form. Output panel shows the result with a
 * "Copy" button and a "Use this" button (just copies for now).
 */
const TABS = [
  {
    id: 'compose',
    label: 'Compose',
    icon: Wand2,
  },
  {
    id: 'hashtags',
    label: 'Hashtags',
    icon: Hash,
  },
  {
    id: 'rewrite',
    label: 'Rewrite',
    icon: RefreshCw,
  },
  {
    id: 'translate',
    label: 'Translate',
    icon: Languages,
  },
  {
    id: 'besttime',
    label: 'Best Time',
    icon: Clock,
  },
  {
    id: 'imgcap',
    label: 'Image Caption',
    icon: ImageIcon,
  },
];
export default function AIAssistantPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('compose');

  // Cmd/Ctrl+J toggles
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <FloatingLauncher onClick={() => setOpen(true)} active={open} />
      {open && (
        <Panel tab={tab} setTab={setTab} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/* ── Launcher button (always visible, bottom-right) ──────────────────── */
function FloatingLauncher({ onClick, active }) {
  if (active) return null;
  const isMac =
    typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open AI Assistant (Cmd+J)"
      title={`AI Assistant · ${isMac ? '⌘J' : 'Ctrl+J'}`}
      className={cn(
        cn(
          '[position:fixed]',
          '[bottom:24px]',
          '[inset-inline-end:24px]',
          '[z-index:80]',
          '[width:52px]',
          '[height:52px]',
          '[border-radius:999px]',
          '[border:none]',
          '[cursor:pointer]',
          '[padding:0]',
          '[background:linear-gradient(135deg,_#00CCF5,_#00A8D8)]',
          '[color:var(--text-on-brand)]',
          '[box-shadow:0_6px_18px_rgba(0,_168,_216,_0.35),_0_2px_6px_rgba(0,0,0,0.1)]',
          '[display:flex]',
          '[align-items:center]',
          '[justify-content:center]',
          '[transition:transform_0.18s_cubic-bezier(0.4,0,0.2,1)]',
        ),
        'hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <Sparkles size={20} />
    </button>
  );
}

/* ── Panel (modal-ish) ───────────────────────────────────────────────── */
function Panel({ tab, setTab, onClose }) {
  return (
    <div
      role="dialog"
      aria-label="AI Assistant"
      onClick={onClose}
      className={cn(
        '[position:fixed]',
        '[inset:0]',
        '[z-index:200]',
        '[background:rgba(10,14,20,0.5)]',
        '[backdrop-filter:blur(4px)]',
        '[display:flex]',
        '[align-items:flex-end]',
        '[justify-content:flex-end]',
        '[padding:16px]',
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          '[width:min(560px,_100%)]',
          '[max-height:min(720px,_calc(100vh_-_32px))]',
          '[background:var(--surface-elevated)]',
          '[border:1px_solid_var(--border-default)]',
          '[border-radius:var(--radius-lg)]',
          '[box-shadow:var(--shadow-lg)]',
          '[display:flex]',
          '[flex-direction:column]',
          '[color:var(--text-primary)]',
          '[overflow:hidden]',
        )}
      >
        {/* Header */}
        <div
          className={cn(
            '[display:flex]',
            '[align-items:center]',
            '[justify-content:space-between]',
            '[padding:14px_16px]',
            '[border-bottom:1px_solid_var(--border-subtle)]',
          )}
        >
          <div
            className={cn(
              '[display:flex]',
              '[align-items:center]',
              '[gap:8px]',
            )}
          >
            <span
              className={cn(
                '[width:28px]',
                '[height:28px]',
                '[border-radius:var(--radius-sm)]',
                '[background:linear-gradient(135deg,_#00CCF5,_#00A8D8)]',
                '[color:var(--text-on-brand)]',
                '[display:inline-flex]',
                '[align-items:center]',
                '[justify-content:center]',
              )}
            >
              <Sparkles size={14} />
            </span>
            <div>
              <div className={cn('[font-size:14px]', '[font-weight:600]')}>
                Social Stats
              </div>
              <div
                className={cn(
                  '[font-size:11px]',
                  '[color:var(--text-tertiary)]',
                )}
              >
                Cmd/Ctrl + J
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              '[width:28px]',
              '[height:28px]',
              '[border-radius:var(--radius-sm)]',
              '[background:transparent]',
              '[border:none]',
              '[cursor:pointer]',
              '[color:var(--text-tertiary)]',
              '[display:inline-flex]',
              '[align-items:center]',
              '[justify-content:center]',
              '[min-height:unset]',
              '[min-width:unset]',
            )}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className={cn(
            '[display:flex]',
            '[overflow-x:auto]',
            '[border-bottom:1px_solid_var(--border-subtle)]',
            '[background:var(--surface-sunken)]',
          )}
        >
          {TABS.map((t) => {
            const active = t.id === tab;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  '[flex:0_0_auto]',
                  '[padding:10px_14px]',
                  '[background:transparent]',
                  '[border:none]',
                  active
                    ? '[border-bottom:2px_solid_var(--brand-primary)]'
                    : '[border-bottom:2px_solid_transparent]',
                  active
                    ? '[color:var(--text-primary)]'
                    : '[color:var(--text-tertiary)]',
                  '[font-size:13px]',
                  '[font-weight:600]',
                  '[cursor:pointer]',
                  '[display:inline-flex]',
                  '[align-items:center]',
                  '[gap:6px]',
                  '[white-space:nowrap]',
                  '[min-height:unset]',
                  '[min-width:unset]',
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className={cn('[flex:1]', '[overflow-y:auto]', '[padding:16px]')}>
          {tab === 'compose' && <ComposeTab />}
          {tab === 'hashtags' && <HashtagsTab />}
          {tab === 'rewrite' && <RewriteTab />}
          {tab === 'translate' && <TranslateTab />}
          {tab === 'besttime' && <BestTimeTab />}
          {tab === 'imgcap' && <ImageCaptionTab />}
        </div>
      </div>
    </div>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────────── */
function ComposeTab() {
  const [topic, setTopic] = useState('');
  const [platforms, setPlatforms] = useState(['instagram']);
  const [tone, setTone] = useState('friendly');
  const [variants, setVariants] = useState(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!topic.trim()) {
      toast.error('Topic is required');
      return;
    }
    setLoading(true);
    setVariants(null);
    try {
      const res = await aiAPI.composePost({
        topic,
        platforms,
        tone,
      });
      setVariants(res.data?.variants || {});
    } catch (e) {
      toast.error(e.response?.data?.error || 'Compose failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Field label="Topic">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What's the post about?"
          autoFocus
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        />
      </Field>
      <Field label="Platforms">
        <PlatformPills value={platforms} onChange={setPlatforms} />
      </Field>
      <Field label="Tone">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        >
          {[
            'friendly',
            'professional',
            'casual',
            'inspirational',
            'urgent',
          ].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <RunButton loading={loading} onClick={run} label="Compose 3 variants" />

      {variants &&
        Object.entries(variants).map(([p, list]) => (
          <div key={p} className={cn('[margin-top:12px]')}>
            <div
              className={cn(
                '[font-size:11px]',
                '[font-weight:600]',
                '[color:var(--text-tertiary)]',
                '[text-transform:uppercase]',
                '[letter-spacing:0.4px]',
                '[margin-bottom:6px]',
                '[margin-top:4px]',
              )}
            >
              {p}
            </div>
            {list.map((v, i) => (
              <ResultBlock key={i} text={v} />
            ))}
          </div>
        ))}
    </>
  );
}
function HashtagsTab() {
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [count, setCount] = useState(12);
  const [tags, setTags] = useState(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }
    setLoading(true);
    setTags(null);
    try {
      const res = await aiAPI.suggestHashtags({
        content,
        platform,
        count,
      });
      setTags(res.data?.hashtags || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Hashtags failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Field label="Post content">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="Paste your post text…"
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
            '[height:auto]',
            '[resize:vertical]',
          )}
        />
      </Field>
      <Field label="Platform">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        >
          {['instagram', 'facebook', 'linkedin', 'youtube'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <Field label="How many">
        <input
          type="number"
          min={3}
          max={30}
          value={count}
          onChange={(e) => setCount(Number(e.target.value || 12))}
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        />
      </Field>
      <RunButton loading={loading} onClick={run} label="Suggest hashtags" />

      {tags && (
        <ResultBlock
          text={tags.join(' ')}
          subText={`${tags.length} hashtag${tags.length === 1 ? '' : 's'}`}
        />
      )}
    </>
  );
}
function RewriteTab() {
  const [text, setText] = useState('');
  const [instr, setInstr] = useState('shorter');
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!text.trim()) {
      toast.error('Text is required');
      return;
    }
    setLoading(true);
    setOut(null);
    try {
      const res = await aiAPI.rewrite({
        text,
        instruction: instr,
      });
      setOut(res.data?.text || '');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Rewrite failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Field label="Original text">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Paste the text you want to rewrite…"
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
            '[height:auto]',
            '[resize:vertical]',
          )}
        />
      </Field>
      <Field label="Transformation">
        <select
          value={instr}
          onChange={(e) => setInstr(e.target.value)}
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        >
          <option value="shorter">Make shorter</option>
          <option value="longer">Make longer</option>
          <option value="more casual">More casual</option>
          <option value="more formal">More formal</option>
          <option value="more engaging">More engaging</option>
          <option value="rephrase">Rephrase</option>
        </select>
      </Field>
      <RunButton loading={loading} onClick={run} label="Rewrite" />
      {out && <ResultBlock text={out} />}
    </>
  );
}
function TranslateTab() {
  const [text, setText] = useState('');
  const [lang, setLang] = useState('Spanish');
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!text.trim()) {
      toast.error('Text is required');
      return;
    }
    setLoading(true);
    setOut(null);
    try {
      const res = await aiAPI.translate({
        text,
        target_language: lang,
      });
      setOut(res.data?.text || '');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Translate failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Field label="Source text">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Text to translate…"
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
            '[height:auto]',
            '[resize:vertical]',
          )}
        />
      </Field>
      <Field label="Target language">
        <input
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          placeholder="e.g. Spanish, French, Japanese"
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        />
      </Field>
      <RunButton loading={loading} onClick={run} label="Translate" />
      {out && <ResultBlock text={out} />}
    </>
  );
}
function BestTimeTab() {
  const [platform, setPlatform] = useState('instagram');
  const [slots, setSlots] = useState(null);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    setSlots(null);
    try {
      const res = await aiAPI.bestTimeToPost({
        platform,
      });
      setSlots(res.data?.slots || []);
      setSource(res.data?.source || '');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Best-time failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Field label="Platform">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        >
          {[
            'instagram',
            'facebook',
            'linkedin',
            'youtube',
            'google_my_business',
          ].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <RunButton loading={loading} onClick={run} label="Find best times" />
      {slots && (
        <div className={cn('[margin-top:12px]')}>
          <div
            className={cn(
              '[font-size:11px]',
              '[font-weight:600]',
              '[color:var(--text-tertiary)]',
              '[text-transform:uppercase]',
              '[letter-spacing:0.4px]',
              '[margin-bottom:6px]',
              '[margin-top:4px]',
            )}
          >
            Top 3 slots {source ? `· ${source.replace('_', ' ')}` : ''}
          </div>
          {slots.map((s, i) => (
            <div
              key={i}
              className={cn(
                '[padding:10px_12px]',
                '[background:var(--surface-sunken)]',
                '[border:1px_solid_var(--border-subtle)]',
                '[border-radius:var(--radius-md)]',
                '[margin-top:8px]',
              )}
            >
              <div
                className={cn(
                  '[display:flex]',
                  '[align-items:center]',
                  '[justify-content:space-between]',
                )}
              >
                <span className={cn('[font-weight:600]')}>{s.label}</span>
                {s.score != null && (
                  <span
                    className={cn(
                      '[font-size:11px]',
                      '[color:var(--text-tertiary)]',
                    )}
                  >
                    score {s.score} {s.samples ? `· ${s.samples} samples` : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function ImageCaptionTab() {
  const [imageUrl, setImageUrl] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!imageUrl.trim()) {
      toast.error('Image URL is required');
      return;
    }
    setLoading(true);
    setOut(null);
    try {
      const res = await aiAPI.generateImageCaption({
        image_url: imageUrl,
        platform,
      });
      setOut(res.data?.caption || '');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Caption failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Field label="Image URL">
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…/photo.jpg"
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        />
      </Field>
      <Field label="Platform">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className={cn(
            '[width:100%]',
            '[height:36px]',
            '[padding:0_12px]',
            '[background:var(--surface-card)]',
            '[border:1px_solid_var(--border-default)]',
            '[border-radius:var(--radius-md)]',
            '[font-size:13px]',
            '[color:var(--text-primary)]',
            '[outline:none]',
            '[box-sizing:border-box]',
            '[min-height:unset]',
          )}
        >
          {['instagram', 'facebook', 'linkedin', 'youtube'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>
      <RunButton loading={loading} onClick={run} label="Generate caption" />
      {out && <ResultBlock text={out} />}
    </>
  );
}

/* ── Shared bits ─────────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <label className={cn('[display:block]', '[margin-bottom:12px]')}>
      <span
        className={cn(
          '[display:block]',
          '[font-size:11px]',
          '[font-weight:600]',
          '[color:var(--text-tertiary)]',
          '[text-transform:uppercase]',
          '[letter-spacing:0.4px]',
          '[margin-bottom:6px]',
        )}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
function PlatformPills({ value, onChange }) {
  const all = [
    'facebook',
    'instagram',
    'youtube',
    'linkedin',
    'google_my_business',
  ];
  return (
    <div className={cn('[display:flex]', '[gap:6px]', '[flex-wrap:wrap]')}>
      {all.map((p) => {
        const on = value.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((x) => x !== p) : [...value, p])
            }
            className={cn(
              '[padding:6px_12px]',
              '[border-radius:var(--radius-pill)]',
              on
                ? '[border:1px_solid_transparent]'
                : '[border:1px_solid_var(--border-subtle)]',
              on
                ? '[background:var(--brand-primary-glow)]'
                : '[background:var(--surface-card)]',
              on
                ? '[color:var(--brand-primary-hover)]'
                : '[color:var(--text-secondary)]',
              '[font-size:12px]',
              '[font-weight:600]',
              '[cursor:pointer]',
              '[min-height:unset]',
              '[min-width:unset]',
              '[transition:var(--transition-fast)]',
            )}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
function RunButton({ loading, onClick, label }) {
  return (
    <Button
      onClick={onClick}
      loading={loading}
      icon={Send}
      fullWidth
      className={cn('[margin-top:4px]')}
    >
      {label}
    </Button>
  );
}
function ResultBlock({ text, subText }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div
      className={cn(
        '[padding:10px_12px]',
        '[background:var(--surface-sunken)]',
        '[border:1px_solid_var(--border-subtle)]',
        '[border-radius:var(--radius-md)]',
        '[margin-top:8px]',
      )}
    >
      <div
        className={cn(
          '[display:flex]',
          '[align-items:flex-start]',
          '[justify-content:space-between]',
          '[gap:8px]',
        )}
      >
        <div
          className={cn(
            '[white-space:pre-wrap]',
            '[word-break:break-word]',
            '[flex:1]',
            '[font-size:13px]',
            '[line-height:var(--line-height-body)]',
          )}
        >
          {text}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy"
          className={cn(
            '[flex-shrink:0]',
            '[width:28px]',
            '[height:28px]',
            '[border-radius:var(--radius-sm)]',
            '[background:transparent]',
            '[border:1px_solid_var(--border-subtle)]',
            '[color:var(--text-tertiary)]',
            '[display:inline-flex]',
            '[align-items:center]',
            '[justify-content:center]',
            '[cursor:pointer]',
            '[min-height:unset]',
            '[min-width:unset]',
          )}
        >
          {copied ? (
            <Check size={12} color="var(--success)" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>
      {subText && (
        <div
          className={cn(
            '[margin-top:6px]',
            '[font-size:11px]',
            '[color:var(--text-tertiary)]',
          )}
        >
          {subText}
        </div>
      )}
    </div>
  );
}
