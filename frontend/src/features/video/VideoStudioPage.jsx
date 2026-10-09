/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useRef, useState } from 'react';
import {
  Upload, Scissors, Crop, Camera, Captions,
  Loader2, Play, X, Link as LinkIcon, FileVideo, Wand2,
} from 'lucide-react';
import toast from '../../components/ui/toast';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { useWorkspaces } from '@/hooks/useData';
import { useAppNavigate } from '@/core/navigation';
import Page from '@/components/ui/Page';
import NativeSelect from '@/components/ui/NativeSelect';
import DataState from '@/components/ui/DataState';
import { apiError } from '@/services/http/errors';
import { composer, parseMedia } from '@/services/domains/composer';

import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { videoAPI } from '@/services/domains/publishing';

const ASPECTS = [
  { id: '16:9', label: '16:9 · Landscape',  hint: 'YouTube, Facebook, LinkedIn feed' },
  { id: '9:16', label: '9:16 · Vertical',   hint: 'Reels, Shorts, Stories' },
  { id: '1:1',  label: '1:1 · Square',      hint: 'Feed posts on Instagram' },
  { id: '4:5',  label: '4:5 · Portrait',    hint: 'Instagram feed (taller)' },
];

const TABS = [
  { id: 'trim',     label: 'Trim',       icon: Scissors },
  { id: 'resize',   label: 'Resize',     icon: Crop },
  { id: 'thumb',    label: 'Thumbnail',  icon: Camera },
  { id: 'captions', label: 'Captions',   icon: Captions },
  { id: 'publish',  label: 'Publish',    icon: Wand2 },
];

export default function VideoStudioPage() {
  const { user } = useSession(); const { t } = useLanguage(); const [chosen, setChosen] = useState('');
  const { workspaces, error, refetch } = useWorkspaces();
  const workspace = Number(user?.workspace_id || user?.client_id || chosen) || null;
  return <Page maxWidth="full">
    {!user?.workspace_id && !user?.client_id && <NativeSelect label={t('analytics.report.workspace')} value={chosen} onChange={e => setChosen(e.target.value)}><option value="">{t('analytics.report.workspace')}</option>{workspaces.map(w => <option key={w.id} value={w.id}>{w.company || w.name}</option>)}</NativeSelect>}
    {error && <DataState state="error" title={t('analytics.report.error')} action={<Button onClick={refetch}>{t('analytics.report.retry')}</Button>} />}
    {workspace && <WorkspaceVideo key={`${user?.id}:${workspace}`} workspace={workspace} />}
  </Page>;
}
function WorkspaceVideo({ workspace }) {
  const { t } = useLanguage();
  const [active, setActive] = useState(null);   // currently-loaded MediaAsset (video)
  const [derived, setDerived] = useState([]);   // list of derived assets (trims/resizes/thumbs)
  const [tab, setTab] = useState('trim');

  return (
    <div className="app-page app-page--content app-page--xl">
      <PageHeader
        title="Video Studio"
        subtitle={t('editor.videoDescription')}
      />

      <div className="vs-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 380px',
        gap: 16,
        padding: 0,
      }}>
        {/* ── Player + derived assets ─────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!active && <UploadCard workspace={workspace} onUploaded={(a) => setActive(a)} />}
          {active && (
            <PlayerCard
              asset={active}
              onClear={() => { setActive(null); setDerived([]); }}
            />
          )}

          {derived.length > 0 && (
            <Card padding="md">
              <Card.Header title="Derived clips" subtitle="Click any clip to make it the active asset" />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}>
                {derived.map((d) => (
                  <DerivedTile
                    key={d.id}
                    asset={d}
                    onPick={() => setActive(d)}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Tools panel ─────────────────────────────────────────── */}
        <Card padding="none" style={{ overflow: 'hidden', alignSelf: 'flex-start',
                                        position: 'sticky', top: 'calc(var(--topbar-height) + 16px)' }}>
          <div style={{ display: 'flex', overflowX: 'auto',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'var(--surface-sunken)' }}>
            {TABS.map((t) => {
              const isActive = t.id === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: '0 0 auto',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--brand-primary)' : '2px solid transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    whiteSpace: 'nowrap',
                    minHeight: 'unset', minWidth: 'unset',
                  }}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div style={{ padding: 16 }}>
            {!active ? (
              <EmptyState
                icon={FileVideo}
                title="Load a video first"
                description="Upload a file or paste a URL to start editing."
                compact
              />
            ) : (
              <>
                {tab === 'trim'     && <TrimTool key={`${active.id}:${tab}`} workspace={workspace}     asset={active} onResult={(a) => { setActive(a); setDerived((d) => [a, ...d]); }} />}
                {tab === 'resize'   && <ResizeTool key={`${active.id}:${tab}`} workspace={workspace}   asset={active} onResult={(a) => { setActive(a); setDerived((d) => [a, ...d]); }} />}
                {tab === 'thumb'    && <ThumbnailTool key={`${active.id}:${tab}`} workspace={workspace} asset={active} onResult={(a) => setDerived((d) => [a, ...d])} />}
                {tab === 'captions' && <CaptionsTool key={`${active.id}:${tab}`} workspace={workspace} asset={active} />}
                {tab === 'publish'  && <PublishTool key={`${active.id}:${tab}`} workspace={workspace}  asset={active} />}
              </>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .vs-grid { grid-template-columns: 1fr !important; }
          .vs-grid > div:last-child { position: static !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Upload ────────────────────────────────────────────────────────────── */
function UploadCard({ onUploaded, workspace }) {
  const fileRef = useRef();
  const [url, setUrl] = useState('');
  const operation = useMediaOperation(workspace);
  const busy = operation.pending;
  const [drag, setDrag] = useState(false);

  async function uploadFile(file) {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file); fd.append('workspace_id', String(workspace));
    await operation.run(() => videoAPI.upload(fd), onUploaded);
  }
  async function importUrl() {
    if (!url.trim()) return;
    await operation.run(() => videoAPI.importFromUrl({ workspace_id: workspace, url: url.trim() }), asset => { onUploaded(asset); setUrl(''); });
  }

  return (
    <Card padding="none" style={{ overflow: 'hidden' }}>
      {operation.notice}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          uploadFile(e.dataTransfer.files?.[0]);
        }}
        style={{
          padding: 40,
          textAlign: 'center',
          border: drag ? '2px dashed var(--brand-primary)' : '2px dashed transparent',
          background: drag ? 'var(--brand-primary-glow)' : 'transparent',
          transition: 'var(--transition-fast)',
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', marginBottom: 12,
        }}>
          <FileVideo size={24} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Drop a video here, or
        </div>
        <input ref={fileRef} type="file" accept="video/*" hidden
                onChange={(e) => uploadFile(e.target.files?.[0])} />
        <Button icon={Upload} onClick={() => fileRef.current?.click()} loading={busy}>
          Choose file
        </Button>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)',
                      maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
            …or import from a URL
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <LinkIcon size={14} color="var(--text-tertiary)"
                        style={{ position: 'absolute', top: 11, left: 10 }} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
            <Button onClick={importUrl} loading={busy} disabled={!url.trim()}>
              Import
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Player ────────────────────────────────────────────────────────────── */
function PlayerCard({ asset, onClear }) {
  return (
    <Card padding="none" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {asset.file_url ? asset.file_url.split('/').pop().split('?')[0] : 'video.mp4'}
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant="default">{(asset.mime_type || '').split('/')[1] || 'video'}</Badge>
            {asset.duration_seconds > 0 && (
              <Badge>{fmtDuration(asset.duration_seconds)}</Badge>
            )}
            {asset.width > 0 && (
              <Badge>{asset.width}×{asset.height}</Badge>
            )}
            {asset.file_size > 0 && (
              <Badge>{fmtBytes(asset.file_size)}</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" icon={X} iconOnly onClick={onClear} aria-label="Close" />
      </div>
      <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 320 }}>
        {asset.file_url ? (
          <video
            src={asset.file_url}
            controls
            style={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }}
          />
        ) : (
          <div style={{ color: 'var(--text-tertiary)', padding: 32 }}>No preview URL</div>
        )}
      </div>
    </Card>
  );
}

/* ── Tools ─────────────────────────────────────────────────────────────── */
function TrimTool({ asset, onResult, workspace }) {
  const max = Math.max(0.1, asset.duration_seconds || 60);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(Math.min(10, max));
  const operation = useMediaOperation(workspace);
  const busy = operation.pending;

  async function run() {
    if (end <= start) return;
    await operation.run(() => videoAPI.trim({ workspace_id: workspace, asset_id: asset.id, start_seconds: start, end_seconds: end }), onResult);
  }

  return (
    <>
      {operation.notice}
      <ToolHeader title="Trim" desc="Cut a section from this video" />
      <Field label={`Start (${fmtDuration(start)})`}>
        <input type="range" min={0} max={max} step={0.1}
                value={start}
                onChange={(e) => setStart(Math.min(parseFloat(e.target.value), end - 0.1))}
                style={rangeStyle} />
      </Field>
      <Field label={`End (${fmtDuration(end)})`}>
        <input type="range" min={0} max={max} step={0.1}
                value={end}
                onChange={(e) => setEnd(Math.max(parseFloat(e.target.value), start + 0.1))}
                style={rangeStyle} />
      </Field>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
        New duration: <strong>{fmtDuration(end - start)}</strong>
      </div>
      <Button onClick={run} loading={busy} icon={Scissors} fullWidth>
        Trim & save as new clip
      </Button>
    </>
  );
}

function ResizeTool({ asset, onResult, workspace }) {
  const [aspect, setAspect] = useState('9:16');
  const operation = useMediaOperation(workspace);
  const busy = operation.pending;

  async function run() {
    await operation.run(() => videoAPI.resize({ workspace_id: workspace, asset_id: asset.id, target_aspect: aspect }), onResult);
  }

  return (
    <>
      {operation.notice}
      <ToolHeader title="Resize" desc="Center-crop into a different aspect ratio" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {ASPECTS.map((a) => {
          const on = aspect === a.id;
          return (
            <button
              key={a.id} type="button"
              onClick={() => setAspect(a.id)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${on ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                background: on ? 'var(--brand-primary-glow)' : 'var(--surface-card)',
                cursor: 'pointer', minHeight: 'unset', minWidth: 'unset',
                transition: 'var(--transition-fast)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{a.hint}</div>
            </button>
          );
        })}
      </div>
      <Button onClick={run} loading={busy} icon={Crop} fullWidth>
        Resize to {aspect}
      </Button>
    </>
  );
}

function ThumbnailTool({ asset, onResult, workspace }) {
  const max = Math.max(0.5, (asset.duration_seconds || 1) - 0.1);
  const [t, setT] = useState(Math.min(2, max));
  const operation = useMediaOperation(workspace, true, 'image');
  const busy = operation.pending;

  async function run() {
    await operation.run(() => videoAPI.extractThumbnail({ workspace_id: workspace, asset_id: asset.id, time_seconds: t }), onResult);
  }

  return (
    <>
      {operation.notice}
      <ToolHeader title="Extract thumbnail" desc="Capture a still frame as an image asset" />
      <Field label={`Time: ${fmtDuration(t)}`}>
        <input type="range" min={0} max={max} step={0.1}
                value={t} onChange={(e) => setT(parseFloat(e.target.value))}
                style={rangeStyle} />
      </Field>
      <Button onClick={run} loading={busy} icon={Camera} fullWidth>
        Capture frame
      </Button>
    </>
  );
}

function CaptionsTool() {
  const { t } = useLanguage();
  // The current backend returns 501 even with configuration; never claim a queued job.
  return <DataState state="unavailable" title={t('editor.captionsUnavailable')} />;
}
function PublishTool({ asset, workspace }) {
  const { user } = useSession(); const { t } = useLanguage(); const navigate = useAppNavigate();
  const [intent] = useState(() => globalThis.crypto.randomUUID()); const operation = useMediaOperation(workspace, false);
  async function openComposer() {
    await operation.run(() => composer.save(workspace, null, { title: '', content: '', media_type: 'video',
      media_urls: [`asset:${asset.id}`], target_platforms: [], platform_overrides: {} }, intent), result => {
      navigate(`${user?.role === 'client' ? '/dashboard/analytics' : '/admin/analytics'}/composer/${result.post.id}?workspace=${workspace}`);
    });
  }
  return <>{operation.notice}<p className="my-3">{t('editor.composerHandoff')}</p><Button disabled={operation.pending} onClick={openComposer}>{t('editor.openComposer')}</Button></>;
}
function useMediaOperation(workspace, media = true, kind = 'video') {
  const { user } = useSession(); const { t } = useLanguage(); const busy = useRef(false); const current = useRef(true); const focus = useRef(null);
  const mutation = useMutation({ mutationKey: ['video.operation', user?.id, workspace], mutationFn: operation => operation(), retry: 0, networkMode: 'always' });
  useEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
  useEffect(() => { if (mutation.error) focus.current?.focus(); }, [mutation.error]);
  async function run(operation, success) {
    if (busy.current) return; busy.current = true;
    try {
      await mutation.mutateAsync(async () => {
        const response = await operation();
        if (media && response.status !== 201) throw new Error('Invalid media operation response');
        const data = media ? parseMedia(response.data, workspace) : response;
        if (media && !data.mime_type.startsWith(`${kind}/`)) throw new Error('Invalid media kind');
        if (current.current) success(data);
      });
    } catch { /* Inline recovery retains all editor inputs and selected assets. */ }
    finally { busy.current = false; }
  }
  return { run, pending: mutation.isPending, notice: mutation.error && <DataState focusRef={focus} state="error" compact title={t('editor.mediaFailed')} referenceId={apiError(mutation.error).referenceId} /> };
}

/* ── Derived tile ──────────────────────────────────────────────────────── */
function DerivedTile({ asset, onPick }) {
  const isVideo = (asset.mime_type || '').startsWith('video/');
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        position: 'relative',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 0, cursor: 'pointer',
        overflow: 'hidden',
        textAlign: 'left',
        minHeight: 'unset', minWidth: 'unset',
      }}
    >
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: 'var(--surface-sunken)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {asset.thumbnail_url ? (
          <img src={asset.thumbnail_url} alt=""
               style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isVideo ? (
          <Play size={28} color="var(--text-tertiary)" />
        ) : (
          <Camera size={28} color="var(--text-tertiary)" />
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {asset.alt_text || asset.file_url?.split('/').pop()?.split('?')[0]}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {isVideo
            ? `${fmtDuration(asset.duration_seconds)} · ${asset.width}×${asset.height}`
            : `${asset.width}×${asset.height} · ${fmtBytes(asset.file_size)}`}
        </div>
      </div>
    </button>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function ToolHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{desc}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: 'var(--text-tertiary)', textTransform: 'uppercase',
        letterSpacing: 0.4, marginBottom: 6,
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function fmtDuration(sec) {
  if (!sec || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function fmtBytes(n) {
  if (!n) return '—';
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

const inputStyle = {
  width: '100%', height: 36, padding: '0 12px',
  background: 'var(--surface-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: 13, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box', minHeight: 'unset',
};

const rangeStyle = {
  width: '100%', accentColor: 'var(--brand-primary)',
};

const code = {
  background: 'var(--surface-sunken)',
  padding: '0 6px', borderRadius: 4,
  fontFamily: 'var(--font-mono)', fontSize: 11,
};
