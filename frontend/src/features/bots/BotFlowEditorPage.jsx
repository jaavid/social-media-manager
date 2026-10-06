/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * BotFlowEditorPage — visual flow builder.
 *
 * Layout: top bar + 3-column body (palette | canvas | inspector).
 * - Drag a palette item onto the canvas → creates a new node at drop position.
 * - Click a node → loads it in the inspector.
 * - Connect nodes by dragging from a source handle to a target handle.
 * - Auto-save: every 5 seconds while dirty, plus on explicit Save click.
 */
import { onlineManager } from '@tanstack/react-query';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import DataState from '@/components/ui/DataState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Drawer from '@/components/ui/Drawer';
import { apiError } from '@/services/http/errors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppNavigate as useNavigate, useAppParams as useParams } from '../../core/navigation';
import ReactFlow, {
  ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { nanoid } from 'nanoid';
import {
  ArrowLeft, Save, PlayCircle, CheckCircle2, AlertTriangle,
  Undo2, Redo2, LayoutGrid, FlaskConical,
} from 'lucide-react';

import { botAPI } from '../../services/api';
import toast from '../../components/ui/toast';
import CanvasNode from '../../components/bot/CanvasNode';
import NodeInspector from '../../components/bot/NodeInspector';
import TestModeDrawer from '../../components/bot/TestModeDrawer';
import TriggerConfigModal from '../../components/bot/TriggerConfigModal';
import { NODE_CATALOG, CATEGORIES, getNodeMeta } from '../../components/bot/nodeCatalog';

// ─────────────────────────────────────────────────────────
// Auto-layout via Dagre
// ─────────────────────────────────────────────────────────
const NODE_W = 220;
const NODE_H = 92;

function autoLayout(nodes, edges, direction = 'LR') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 80 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } };
  });
}

const nodeTypes = { custom: CanvasNode };

export default function BotFlowEditorPage() {
  const { id } = useParams();
  const { user } = useSession();
  return (
    <ReactFlowProvider>
      <Editor key={`${user?.id}:${user?.workspace_id || user?.client_id}:${id}`} />
    </ReactFlowProvider>
  );
}

function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reactFlow = useReactFlow();
  const { t } = useLanguage();
  const [loadError, setLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const cancelDelete = useRef(null);
  const [saveError, setSaveError] = useState(null);
  const [actionError, setActionError] = useState(null); const actionBusy = useRef(false);
  const revision = useRef(0);
  const busy = useRef(false);
  const alive = useRef(true);
  const errorRef = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (saveError || actionError) errorRef.current?.focus(); }, [saveError, actionError]);
  function markDirty() { revision.current++; setDirty(true); }

  const [flow, setFlow] = useState(null);
  const [online, setOnline] = useState(() => onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(value => { setOnline(value); if (value && !flow) setLoadAttempt(n => n + 1); }), [flow]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [validation, setValidation] = useState(null);
  const [testOpen,  setTestOpen]  = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Undo/redo history — stack of {nodes, edges} snapshots
  const historyRef = useRef({ past: [], future: [] });
  const skipNextSnapshot = useRef(false);

  // Snapshot the current state (called before mutating + on user-driven moves)
  function snapshot() {
    historyRef.current.past.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    historyRef.current.future = [];
  }

  function undo() {
    const past = historyRef.current.past;
    if (past.length === 0) return;
    const prev = past.pop();
    historyRef.current.future.push({ nodes, edges });
    skipNextSnapshot.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    markDirty();
  }
  function redo() {
    const future = historyRef.current.future;
    if (future.length === 0) return;
    const next = future.pop();
    historyRef.current.past.push({ nodes, edges });
    skipNextSnapshot.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    markDirty();
  }

  // Keyboard shortcuts — Cmd/Ctrl-Z + Cmd/Ctrl-Shift-Z
  useEffect(() => {
    function onKey(e) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      // Ignore when typing in inputs
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 'y') { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nodes, edges]); // eslint-disable-line

  // ── Load ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    botAPI.get(id).then((r) => {
      if (cancelled) return;
      const f = r.data;
      if (!f || String(f.id) !== String(id) || !Array.isArray(f.nodes) || !Array.isArray(f.edges)) throw new Error('Invalid flow');
      setLoadError(null);
      setFlow(f);
      setNodes((f.nodes || []).map((n) => ({
        id: n.id,
        type: 'custom',
        position: n.position || { x: 100, y: 100 },
        data: { type: n.type, data: n.data || {} },
      })));
      setEdges((f.edges || []).map((e) => ({
        id: e.id || nanoid(8),
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        label: e.label,
        markerEnd: { type: MarkerType.ArrowClosed },
      })));
    }).catch(error => { if (!cancelled) setLoadError(error); });
    return () => { cancelled = true; };
  }, [id, loadAttempt]);

  // ── Autosave loop ────────────────────────────────────
  useEffect(() => {
    if (!flow || !dirty || saveError || saving || !online) return;
    const t = setTimeout(save, 5000);
    return () => clearTimeout(t);
  }, [dirty, nodes, edges, flow, saveError, saving, online]); // eslint-disable-line

  async function save() {
    if (!flow || busy.current) return false;
    const savedRevision = revision.current;
    busy.current = true; setSaving(true); setSaveError(null);
    const payload = {
      ...flow,
      nodes: nodes.map((n) => ({
        id: n.id, type: n.data.type, position: n.position, data: n.data.data,
      })),
      edges: edges.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        sourceHandle: e.sourceHandle, label: e.label,
      })),
      starting_node_id: flow.starting_node_id || (nodes.find((n) => n.data.type === 'start')?.id || ''),
    };
    try {
      const response = await botAPI.update(id, payload);
      if (!response.data || String(response.data.id) !== String(id) || !Array.isArray(response.data.nodes) || !Array.isArray(response.data.edges)) throw new Error('Invalid save response');
      if (!alive.current) return false;
      setSavedAt(new Date());
      if (revision.current === savedRevision) { setFlow(response.data); setDirty(false); }
      return revision.current === savedRevision;
    } catch (error) {
      if (alive.current) setSaveError(error);
      return false;
    } finally { busy.current = false; if (alive.current) setSaving(false); }
  }

  // ── Mutations ────────────────────────────────────────
  function patchSelected(nextDataPayload) {
    if (!selectedId) return;
    snapshot();
    setNodes((ns) => ns.map((n) => n.id === selectedId
      ? { ...n, data: { ...n.data, data: nextDataPayload } }
      : n));
    markDirty();
  }
  function deleteSelected() { if (selectedId) setDeleteOpen(true); }
  function deleteConfirmed() {
    if (!selectedId) return;
    setDeleteOpen(false);
    snapshot();
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
    markDirty();
  }

  const onNodesChange = useCallback((c) => {
    // Only snapshot on "user finished" actions, not every drag tick
    const significant = c.some((ch) => ch.type === 'remove' || (ch.type === 'position' && ch.dragging === false));
    if (significant && !skipNextSnapshot.current) snapshot();
    skipNextSnapshot.current = false;
    setNodes((ns) => applyNodeChanges(c, ns));
    markDirty();
  }, [nodes, edges]); // eslint-disable-line
  const onEdgesChange = useCallback((c) => {
    if (c.some((ch) => ch.type === 'remove') && !skipNextSnapshot.current) snapshot();
    skipNextSnapshot.current = false;
    setEdges((es) => applyEdgeChanges(c, es));
    markDirty();
  }, [nodes, edges]); // eslint-disable-line
  const onConnect = useCallback((c) => {
    snapshot();
    setEdges((es) => addEdge({ ...c, id: nanoid(8), markerEnd: { type: MarkerType.ArrowClosed } }, es));
    markDirty();
  }, [nodes, edges]); // eslint-disable-line

  function applyAutoLayout() {
    if (nodes.length === 0) return;
    snapshot();
    setNodes(autoLayout(nodes, edges, 'LR'));
    markDirty();
    setTimeout(() => reactFlow.fitView({ duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 }), 50);
  }

  // ── Drag from palette → drop on canvas ───────────────
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);
  function onDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/x-bot-node');
    const bounds = wrapperRef.current.getBoundingClientRect();
    addNode(type, reactFlow.project({ x: e.clientX - bounds.left, y: e.clientY - bounds.top }));
  }
  function addNode(type, position = { x: 100, y: 100 }) {
    if (!NODE_CATALOG[type]) return;
    snapshot();
    const meta = NODE_CATALOG[type];
    const newNode = {
      id: type === 'start' ? 'start' : `n_${nanoid(6)}`,
      type: 'custom', position,
      data: { type, data: JSON.parse(JSON.stringify(meta.defaultData || {})) },
    };
    // Only one start node per flow
    if (type === 'start' && nodes.some((n) => n.data.type === 'start')) {
      toast.error('Only one Start node per flow');
      return;
    }
    setNodes((ns) => [...ns, newNode]);
    setSelectedId(newNode.id);
    markDirty();
  }

  // ── Validation + publish ─────────────────────────────
  async function validateNow() {
    if (actionBusy.current) return;
    actionBusy.current = true; setActionError(null);
    try {
      if (dirty && !await save()) return;
      const r = await botAPI.validate(id);
      if (!r.data || typeof r.data.ok !== 'boolean' || !Array.isArray(r.data.issues)) throw new Error('Invalid validation');
      if (alive.current) setValidation(r.data);
    } catch (error) { if (alive.current) setActionError(error); }
    finally { actionBusy.current = false; }
  }
  async function openPublishModal() {
    if (dirty && !await save()) return;
    setPublishOpen(true);
  }
  async function unpublish() {
    if (!flow || actionBusy.current) return;
    actionBusy.current = true; setActionError(null);
    try {
      const r = await botAPI.unpublish(id);
      if (r.status === 202 && r.data?.requires_approval === true) { if (alive.current) toast.info(t('editor.approvalQueued')); return; }
      if (!r.data || r.data.id !== flow.id || r.data.is_active !== false) throw new Error('Invalid unpublished flow');
      if (alive.current) { setFlow(previous => ({...previous, is_active:false})); toast.success('Flow unpublished'); }
    } catch (error) { if (alive.current) setActionError(error); }
    finally { actionBusy.current = false; }
  }

  // ── Variable list (for inserter) ─────────────────────
  const variables = useMemo(() => {
    const seen = new Set();
    nodes.forEach((n) => {
      const d = n.data?.data || {};
      const v = d.store_var || d.variable || d.name;
      if (v && typeof v === 'string') seen.add(v);
    });
    return Array.from(seen);
  }, [nodes]);

  const selected = nodes.find((n) => n.id === selectedId);
  if (!online && !flow) return <DataState state="offline" title={t('catalog.state.offline.title')} />;
  if (loadError) return <DataState state={apiError(loadError).status === 404 ? 'not-found' : apiError(loadError).status === 403 ? 'forbidden' : 'error'} title={t('analytics.report.error')} referenceId={apiError(loadError).referenceId} action={<Button onClick={() => setLoadAttempt(n => n + 1)}>{t('analytics.report.retry')}</Button>} />;
  if (!flow) return <DataState state="loading" title={t('engagement.loading')} />;


  return (
    <div className="flex min-w-0 flex-col bg-background" style={{ height: 'calc(100dvh - var(--topbar-height, 64px))' }}>
      <Modal open={deleteOpen} role="alertdialog" initialFocusRef={cancelDelete} title={t('editor.deleteNode')} description={t('editor.deleteConfirm')} onClose={() => setDeleteOpen(false)} footer={<><Button ref={cancelDelete} onClick={() => setDeleteOpen(false)}>{t('reports.cancel')}</Button><Button variant="danger" onClick={deleteConfirmed}>{t('editor.deleteNode')}</Button></>} />
      {!online && <DataState state="offline" compact title={t('catalog.state.offline.title')} />}
      {actionError && <DataState focusRef={errorRef} state="error" compact title={t('editor.actionFailed')} referenceId={apiError(actionError).referenceId} />}
      {saveError && <DataState focusRef={errorRef} state="error" compact title={t('editor.saveFailed')} referenceId={apiError(saveError).referenceId} action={<Button onClick={save}>{t('analytics.report.retry')}</Button>} />}
      {/* Top bar */}
      <header style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <button type="button" onClick={() => navigate('/admin/bot-flows')} aria-label="Back" style={iconBtn}>
          <ArrowLeft size={14} />
        </button>
        {flow && (
          <input
            aria-label={t('editor.flowName')}
            value={flow.name || ''}
            onChange={(e) => { setFlow({ ...flow, name: e.target.value }); markDirty(); }}
            style={{
              flex: 1, minWidth: 0, padding: '6px 10px', maxWidth: 360,
              fontSize: 14, fontWeight: 600,
              background: 'transparent', color: 'var(--text-primary)',
              border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
              outline: 'none',
            }}
            onFocus={(e) => e.target.style.background = 'var(--surface-sunken)'}
            onBlur={(e) => e.target.style.background = 'transparent'}
          />
        )}

        <div className="ms-auto flex min-w-0 flex-wrap items-center gap-2">
          <button type="button" onClick={undo} aria-label="Undo (Cmd+Z)"
                  disabled={historyRef.current.past.length === 0}
                  style={iconBtn} title="Undo (Cmd/Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button type="button" onClick={redo} aria-label="Redo (Cmd+Shift+Z)"
                  disabled={historyRef.current.future.length === 0}
                  style={iconBtn} title="Redo (Cmd/Ctrl+Shift+Z)">
            <Redo2 size={14} />
          </button>
          <button type="button" onClick={applyAutoLayout} aria-label="Auto-layout"
                  style={iconBtn} title="Auto-layout (Dagre)">
            <LayoutGrid size={14} />
          </button>
          <span style={{ fontSize: 12, color: dirty ? 'var(--warning)' : 'var(--text-tertiary)' }}>
            {saving ? 'Saving…' :
             dirty ? 'Unsaved' :
             savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : ''}
          </span>
          <button type="button" onClick={save} disabled={!dirty || saving} style={btnGhost}>
            <Save size={13} /> Save
          </button>
          <button type="button" onClick={validateNow} style={btnGhost}>Validate</button>
          <button type="button" onClick={() => setTestOpen(true)} style={btnGhost}>
            <FlaskConical size={13} /> Test
          </button>
          {flow?.is_active && (
            <button type="button" onClick={unpublish} style={btnGhost}>Unpublish</button>
          )}
          <button type="button" onClick={openPublishModal} style={btnPrimary} disabled={saving}>
            <PlayCircle size={13} /> {flow?.is_active ? 'Re-publish' : 'Publish'}
          </button>
        </div>
      </header>

      {validation && (
        <ValidationBanner result={validation} onClose={() => setValidation(null)} />
      )}

      <div className="flex gap-2 p-2 xl:hidden"><Button onClick={() => setPanel('palette')}>{t('editor.nodes')}</Button><Button onClick={() => setPanel('inspector')}>{t('editor.inspector')}</Button></div>
      <Drawer open={panel !== null} onClose={() => setPanel(null)} title={t(panel === 'palette' ? 'editor.nodes' : 'editor.inspector')} width={320}>
        {panel === 'palette' ? <Palette compact onAdd={(...args) => { addNode(...args); setPanel(null); }} /> : <NodeInspector node={selected} onChange={patchSelected} onDelete={deleteSelected} variables={variables} />}
      </Drawer>
      {/* Desktop panels use the same components as the narrow-screen drawer. */}
      <div className="flex min-h-0 min-w-0 flex-1 overflow-auto">
        <div className="hidden shrink-0 xl:block"><Palette onAdd={addNode} /></div>

        <div ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}
             style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <ReactFlow
              deleteKeyCode={null}
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelectedId(n.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            minZoom={0.4} maxZoom={1.4}
          >
            <Background gap={16} size={1} color="var(--border-subtle)" />
            <Controls position="bottom-right" />
            <MiniMap pannable zoomable
                     style={{ background: 'var(--surface-card)' }}
                     nodeStrokeWidth={3}
                     nodeColor={(n) => getNodeMeta(n.data?.type).color} />
          </ReactFlow>
        </div>

        <aside className="hidden shrink-0 xl:block" style={{
          width: 320, borderLeft: '1px solid var(--border-subtle)',
          background: 'var(--surface-card)',
        }}>
          <NodeInspector
            node={selected}
            onChange={patchSelected}
            onDelete={deleteSelected}
            variables={variables}
          />
        </aside>
      </div>

      {testOpen && flow && (
        <TestModeDrawer flow={flow} onClose={() => setTestOpen(false)} />
      )}
      {publishOpen && flow && (
        <TriggerConfigModal
          flow={flow}
          onClose={() => setPublishOpen(false)}
          onPublished={(updated) => { setFlow(updated); setPublishOpen(false); }}
        />
      )}

      <style>{`
        @keyframes bot-test-slide {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────
function Palette({ onAdd, compact = false }) {
  const { t, tr } = useLanguage();
  function onDragStart(e, type) {
    e.dataTransfer.setData('application/x-bot-node', type);
    e.dataTransfer.effectAllowed = 'move';
  }
  return (
    <aside style={{
      width: compact ? '100%' : 220, borderRight: '1px solid var(--border-subtle)',
      background: 'var(--surface-card)',
      overflowY: 'auto', padding: 12,
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {t('editor.palette')}
      </h3>
      {CATEGORIES.map((cat) => (
        <div key={cat} style={{ marginBottom: 12 }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '2px 6px', marginBottom: 4,
          }}>{cat}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(NODE_CATALOG)
              .filter(([, m]) => m.category === cat)
              .map(([type, m]) => {
                const Icon = m.icon;
                return (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onAdd(type)}
                    key={type}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 8px', cursor: 'grab',
                      background: 'var(--surface-sunken)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12, color: 'var(--text-primary)',
                    }}
                    title={t('editor.addNode', undefined, { name: tr(m.label) })}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                      background: `${m.color}22`, color: m.color,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={12} strokeWidth={2.2} />
                    </span>
                    {tr(m.label)}
                  </Button>
                );
              })}
          </div>
        </div>
      ))}
    </aside>
  );
}

function ValidationBanner({ result, onClose }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: result.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
      borderBottom: '1px solid ' + (result.ok ? 'var(--success)' : 'var(--danger)'),
      color: result.ok ? 'var(--success)' : 'var(--danger)',
      fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {result.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      {result.ok
        ? `Flow looks good — ${result.node_count} nodes, ${result.edge_count} edges.`
        : <>Issues: <strong>{result.issues?.[0]}</strong>{result.issues?.length > 1 && ` (+${result.issues.length - 1} more)`}</>
      }
      <button type="button" onClick={onClose} style={{
        marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'inherit', fontSize: 14,
      }}>×</button>
    </div>
  );
}

const iconBtn = {
  width: 30, height: 30, padding: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};
const btnGhost = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 12px',
  background: 'var(--surface-card)', color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '7px 14px',
  background: 'var(--brand-primary)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-sm)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
