/* ============================================================================
 * Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 * Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Send, Upload, X } from 'lucide-react';
import { useAppLocation, useAppNavigate, useAppParams, useAppSearchParams } from '@/core/navigation';
import { useSession } from '@/core/session';
import { useLanguage } from '@/i18n';
import { transientStorage } from '@/lib/runtime/storage';
import { enabled, publishingModes, incompatibilities, localInput, scheduledInstant } from '@/lib/composer';
import { composer } from '@/services/domains/composer';
import { connectionsAPI } from '@/services/domains/connections';
import { apiError } from '@/services/http/errors';
import { QK } from '@/services/queryClient';
import AIWriteButton from '@/components/ai/AIWriteButton';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Checkbox from '@/components/ui/Checkbox';
import NativeSelect from '@/components/ui/NativeSelect';
import Card from '@/components/ui/Card';
import Page from '@/components/ui/Page';
import DataState from '@/components/ui/DataState';
import { composerExtensions } from '@/components/connections/composerExtensions';

const empty = { title: '', content: '', mediaType: 'text', mediaAssets: [], targetPlatforms: [],
  platformOverrides: {}, scheduleMode: 'now', scheduledAt: '', queueId: '' };
export default function ComposerPage() {
  const { user } = useSession();
  const { id } = useAppParams();
  const [search] = useAppSearchParams();
  const requested = Number(search.get('workspace'));
  const workspaceId = Number.isSafeInteger(requested) && requested > 0 ? requested : user?.workspace_id || user?.client_id;
  const scope = `${user?.id}:${workspaceId}:${id || 'new'}`;
  return <ComposerEditor key={scope} workspaceId={workspaceId} id={id} draftKey={`composer-draft:${scope}`} />;
}

function ComposerEditor({ workspaceId, id, draftKey }) {
  const { t, language } = useLanguage();
  const navigate = useAppNavigate();
  const { pathname } = useAppLocation();
  const path = pathname.startsWith('/dashboard/') ? '/dashboard/analytics/composer' : '/admin/analytics/composer';
  const recovered = useMemo(() => {
    try { const v = JSON.parse(transientStorage.getItem(draftKey) || 'null'); return v?.platformOverrides ? v : null; }
    catch { return null; }
  }, [draftKey]);
  const [draft, setDraft] = useState(() => recovered || { ...empty, intentKey: crypto.randomUUID() });
  const [pending, setPending] = useState(null);
  const [failure, setFailure] = useState(null);
  const [result, setResult] = useState(null);
  const [ambiguous, setAmbiguous] = useState(false);
  const [retryDelay, setRetryDelay] = useState(0);
  useEffect(() => {
    if (!retryDelay) return;
    const timer = setTimeout(() => setRetryDelay(0), retryDelay);
    return () => clearTimeout(timer);
  }, [retryDelay]);
  const [preview, setPreview] = useState('');
  const [postId, setPostId] = useState(id || null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const hydrated = useRef(false);
  const [editorReady, setEditorReady] = useState(!!recovered || !id);
  const savedId = useRef(recovered?.savedPostId || id || null);
  const snapshot = JSON.stringify(draft);
  const baseline = useRef(recovered ? null : snapshot);
  const errorRef = useRef(null);
  const accounts = useQuery({ queryKey: QK.connections(workspaceId), enabled: !!workspaceId,
    queryFn: ({ signal }) => connectionsAPI.get(workspaceId, signal), retry: false });
  const post = useQuery({ queryKey: ['composer.post', workspaceId, postId], enabled: !!postId && !!workspaceId,
    queryFn: ({ signal }) => composer.get(workspaceId, postId, signal), retry: false,
    refetchInterval: query => ['queued', 'publishing'].includes(query.state.data?.status) ? 2000 : false });
  const queues = useQuery({ queryKey: ['composer.queues', workspaceId], enabled: !!workspaceId,
    queryFn: ({ signal }) => composer.queues(workspaceId, signal), retry: false });
  const providers = useMemo(() => accounts.data?.providers || [], [accounts.data]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (hydrated.current || recovered || !post.data || !accounts.data) return;
    hydrated.current = true;
    setEditorReady(true);
    const p = post.data;
    const media = p.media_urls.map((url, index) => ({ id: url.startsWith('asset:') ? Number(url.slice(6)) : `existing-${index}`, source_url: url, file_url: url.startsWith('asset:') ? '' : url }));
    const overrides = p.platform_overrides;
    const restoredMedia = p.target_platforms.map(key => {
      const provider = providers.find(item => item.key === key);
      if (!provider) return null;
      const options = overrides[key] || {};
      const descriptor = publishingModes(provider)[options.media_type || p.media_type];
      return composerExtensions[descriptor?.ui_extension]?.recover?.(options);
    }).find(Boolean);
    const next = { ...empty, intentKey: draft.intentKey, title: p.title, content: p.content, mediaType: p.media_type,
      mediaAssets: restoredMedia || media, baseMediaUrls: p.media_urls, mediaDirty: false, platformOverrides: overrides, targetPlatforms: p.target_platforms,
      scheduleMode: p.scheduled_at ? 'schedule' : 'now', scheduledAt: p.scheduled_at ? localInput(p.scheduled_at) : '' };
    baseline.current = JSON.stringify(next);
    setDraft(next);
  }, [post.data, providers, recovered, accounts.data, draft.intentKey]);
  useEffect(() => {
    if (id && !hydrated.current && !recovered) return;
    if (baseline.current === snapshot) transientStorage.removeItem(draftKey);
    else transientStorage.setItem(draftKey, JSON.stringify({ ...draft, savedPostId: savedId.current }));
  }, [snapshot, draft, draftKey, id, recovered]);
  useEffect(() => {
    const warn = event => { if (snapshot !== baseline.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [snapshot]);
  useEffect(() => { if (failure) errorRef.current?.focus(); }, [failure]);
  const update = (key, value) => { setDraft(current => ({ ...current, ...(key === 'mediaAssets' ? { mediaDirty: true } : {}), [key]: typeof value === 'function' ? value(current[key]) : value })); setResult(null); };
  const selected = providers.filter(p => draft.targetPlatforms.includes(p.key));
  const modes = [...new Set(providers.flatMap(p => Object.keys(publishingModes(p))))];
  const availableQueues = (queues.data || []).filter(q => q.platforms.length === draft.targetPlatforms.length && draft.targetPlatforms.length && draft.targetPlatforms.every(p => q.platforms.includes(p)));
  const selectedQueue = availableQueues.find(q => String(q.id) === draft.queueId);
  const issues = [];
  for (const key of draft.targetPlatforms) {
    const p = providers.find(provider => provider.key === key);
    if (!p) { issues.push({ key, code: 'not_connected' }); continue; }
    const options = draft.platformOverrides[key] || {};
    const targets = Array.isArray(options.account_targets) ? options.account_targets : options.social_account_id ? [{ social_account_id: options.social_account_id }] : [];
    if (!targets.length) issues.push({ key, code: 'account_required' });
    for (const target of targets.length ? targets : [{}]) {
      const intent = effectiveIntent({ ...options, ...target }, draft);
      const mode = publishingModes(p)[intent.mode];
      if (!mode || (mode.ui_extension && !composerExtensions[mode.ui_extension])) { issues.push({ key, code: 'unsupported' }); continue; }
      if (intent.mode === 'text' && !intent.content.trim()) issues.push({ key, code: 'invalid_request' });
      if (intent.mode === 'text' && intent.assets.length) issues.push({ key, code: 'media_invalid' });
      for (const code of incompatibilities(mode.constraints, intent.content, intent.assets)) issues.push({ key, code, limit: constraintDetail(mode.constraints, code) });
      const account = p.accounts.find(a => a.id === target.social_account_id);
      if (!account?.health.ready || account.publishing_readiness?.[intent.mode] === false) issues.push({ key, code: 'not_connected' });
      if (account?.permissions.publish !== true) issues.push({ key, code: 'permission_denied' });
      if (draft.scheduleMode !== 'now' && (account?.permissions.schedule !== true || !enabled(p.capabilities.scheduling))) issues.push({ key, code: 'schedule_unsupported' });
      if (mode.constraints.destination_types?.length && account && !mode.constraints.destination_types.includes(account.destination.kind)) issues.push({ key, code: 'invalid_destination' });
    }
  }
  if (!draft.targetPlatforms.length) issues.push({ key: '', code: 'account_required' });
  const unresolvedDelivery = post.data?.publish_logs?.some(log => ['timeout', 'network_error', 'invalid_response'].includes(log.error_code));
  const canPublish = !issues.length && !accounts.isError && !accounts.isPending && !ambiguous && !unresolvedDelivery && !retryDelay && !['queued', 'publishing', 'published', 'pending_approval'].includes(result || post.data?.status);
  function toggleProvider(key) {
    const provider = providers.find(p => p.key === key);
    if (!draft.targetPlatforms.includes(key) && provider?.accounts.length === 1 && !draft.platformOverrides[key]?.account_targets) {
      const account = provider.accounts[0];
      update('platformOverrides', values => ({ ...values, [key]: { ...values[key], account_targets: [{ social_account_id: account.id, destination_id: account.destination.id }] } }));
    }
    update('targetPlatforms', values => values.includes(key) ? values.filter(v => v !== key) : [...values, key]);
  }
  function toggleAccount(provider, account) {
    update('platformOverrides', values => {
      const options = values[provider.key] || {};
      const old = options.account_targets || (options.social_account_id ? [{ social_account_id: options.social_account_id }] : []);
      const targets = old.some(t => t.social_account_id === account.id) ? old.filter(t => t.social_account_id !== account.id)
        : [...old, { social_account_id: account.id, destination_id: account.destination.id }];
      return { ...values, [provider.key]: { ...options, account_targets: targets } };
    });
  }
  function payload() {
    const overrides = structuredClone(draft.platformOverrides);
    for (const provider of selected) {
      const intent = effectiveIntent(overrides[provider.key] || {}, draft);
      const mode = publishingModes(provider)[intent.mode];
      const extension = composerExtensions[mode?.ui_extension];
      if (extension) {
        const existingItems = overrides[provider.key]?.media_items;
        overrides[provider.key] = extension.prepare(intent.mode, overrides[provider.key] || {}, intent.assets);
        if (existingItems && !draft.mediaDirty) overrides[provider.key].media_items = existingItems;
      }
    }
    return { title: draft.title, content: draft.content, media_type: draft.mediaType,
      target_platforms: draft.targetPlatforms, platform_overrides: overrides,
      media_urls: !draft.mediaDirty && draft.baseMediaUrls ? draft.baseMediaUrls : draft.mediaAssets.map(a => a.source_url || `asset:${a.id}`) };
  }
  async function run(operation) {
    if (busy.current || (operation !== 'save' && !canPublish)) return;
    const instant = scheduledInstant(draft.scheduledAt);
    if (operation === 'schedule' && (!instant || Date.parse(instant) <= new Date().getTime())) { setFailure({ code: 'schedule_invalid' }); return; }
    if (operation === 'add_to_queue' && (!selectedQueue || queues.isError)) return;
    busy.current = true; setPending(operation); setFailure(null); setResult(null);
    let commandStarted = false;
    try {
      const saved = await composer.save(workspaceId, savedId.current, payload(), draft.intentKey);
      if (!mounted.current) return;
      if (saved.approval) { setResult('pending_approval'); return; }
      savedId.current = saved.post.id;
      hydrated.current = true;
      setPostId(saved.post.id);
      transientStorage.setItem(draftKey, JSON.stringify({ ...draft, savedPostId: savedId.current }));
      if (operation === 'save') {
        baseline.current = snapshot; transientStorage.removeItem(draftKey); setResult('saved');
        if (!id) navigate(`${path}/${saved.post.id}`, { replace: true });
        return;
      }
      commandStarted = true;
      const response = await composer.command(workspaceId, saved.post.id, operation,
        operation === 'schedule' ? { scheduled_at: instant } : operation === 'add_to_queue' ? { queue_id: selectedQueue.id } : {});
      if (!mounted.current) return;
      baseline.current = snapshot; transientStorage.removeItem(draftKey); setResult(response.status);
      if (id) post.refetch();
    } catch (error) {
      if (!mounted.current) return;
      const parsed = apiError(error);
      if (parsed.status === 429 && parsed.retryAfter) {
        const seconds = Number(parsed.retryAfter);
        if (Number.isFinite(seconds) && seconds > 0) setRetryDelay(seconds * 1000);
      }
      const uncertain = (commandStarted && (!parsed.status || parsed.status >= 500)) || parsed.status === 409;
      // Unsafe create/enqueue/publication cannot be replayed after an unknown response.
      if (uncertain) setAmbiguous(true);
      setFailure({ code: uncertain ? 'ambiguous' : parsed.code || (parsed.kind === 'rate_limit' ? 'rate_limited' : parsed.kind === 'permission' ? 'permission_denied' : parsed.status === 400 ? 'invalid_request' : 'unavailable'), retryAfter: parsed.retryAfter });
    } finally { busy.current = false; if (mounted.current) setPending(null); }
  }
  async function upload(files) {
    if (busy.current) return;
    busy.current = true; setPending('upload'); setFailure(null);
    try {
      for (const file of files) {
        const asset = await composer.upload(workspaceId, file);
        if (!mounted.current) return;
        update('mediaAssets', values => [...values, asset]);
      }
    } catch { if (mounted.current) setFailure({ code: 'unavailable' }); }
    finally { busy.current = false; if (mounted.current) setPending(null); }
  }
  async function checkStatus() {
    if (busy.current) return;
    busy.current = true; setPending('status');
    try {
      const current = savedId.current ? await composer.get(workspaceId, savedId.current) : await composer.resolve(workspaceId, draft.intentKey);
      if (!mounted.current) return;
      savedId.current = current.id;
      setFailure(null);
      setResult(current.publish_logs?.some(log => ['timeout', 'network_error', 'invalid_response'].includes(log.error_code)) ? 'ambiguous' : current.status);
      // Only definite non-delivery states permit another manual command.
      setAmbiguous(!['draft', 'scheduled', 'pending_approval'].includes(current.status)
        || current.publish_logs?.some(log => ['timeout', 'network_error', 'invalid_response'].includes(log.error_code)));
    } catch { if (mounted.current) setFailure({ code: 'ambiguous' }); }
    finally { busy.current = false; if (mounted.current) setPending(null); }
  }
  const activeProvider = selected.find(p => p.key === preview) || selected[0];
  const activeIntent = effectiveIntent(draft.platformOverrides[activeProvider?.key] || {}, draft);
  const activeMode = activeProvider && publishingModes(activeProvider)[activeIntent.mode];
  const activeExtension = composerExtensions[activeMode?.ui_extension];
  const operation = draft.scheduleMode === 'schedule' ? 'schedule' : draft.scheduleMode === 'queue' ? 'add_to_queue' : 'publish_now';
  const label = operation === 'schedule' ? 'schedule' : operation === 'add_to_queue' ? 'queue' : 'publish';
  if ([accounts, post].some(query => query.isError && ['permission', 'authentication'].includes(apiError(query.error).kind))) return <DataState state="forbidden" title={t('composer.editor.permission_denied')} />;
  if (!workspaceId) return <DataState state="forbidden" title={t('composer.editor.permission_denied')} />;
  if (id && (!post.data || !editorReady) && !recovered) return <DataState state={post.isError ? 'error' : 'loading'} title={t(post.isError ? 'composer.editor.unavailable' : 'composer.editor.loading')}
    action={post.isError && <Button onClick={() => post.refetch()}>{t('composer.editor.retry')}</Button>} />;
  return <Page maxWidth="2xl"><div className="space-y-6" aria-busy={!!pending}>
    <PageHeader sticky={false} title={t(id ? 'composer.editor.edit' : 'composer.editor.title')} subtitle={t('composer.editor.description')}
      actions={<><Button variant="secondary" icon={Save} disabled={!!pending || ambiguous || !!retryDelay} onClick={() => run('save')}>{t('composer.editor.save')}</Button>
        <Button icon={Send} loading={!!pending && pending !== 'upload'} disabled={!!pending || !canPublish || (operation === 'add_to_queue' && (!selectedQueue || queues.isError))} onClick={() => run(operation)}>{t(`composer.editor.${label}`)}</Button></>} />
    {failure && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-border bg-card p-4 text-start">
      <p>{t(errorKey(failure.code))}</p>
      {failure.retryAfter && <bdi>{failure.retryAfter}</bdi>}
      {ambiguous && <Button variant="secondary" onClick={checkStatus}>{t('composer.editor.checkStatus')}</Button>}
    </div>}
    {result && <p role="status">{t(resultKey(result))}</p>}
    {post.data?.publish_logs?.length > 0 && <Card padding="md"><h2 className="font-semibold">{t('composer.editor.results')}</h2>{post.data.publish_logs.map((log, i) => <p key={i}><bdi>{providers.find(p => p.key === log.platform)?.titles[language] || log.platform} · {log.social_account}</bdi> — {t(resultKey(['timeout', 'network_error', 'invalid_response'].includes(log.error_code) ? 'ambiguous' : log.status))}{log.error_code && ` — ${t(errorKey(log.error_code))}`}</p>)}</Card>}
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="min-w-0 space-y-6">
        <Card padding="md"><h2 className="mb-3 font-semibold">{t('composer.editor.accounts')}</h2>
          {accounts.isPending && <DataState compact state="loading" title={t('composer.editor.loading')} />}
          {accounts.isError && <DataState compact state={accounts.data ? 'partial' : 'error'} title={t('composer.editor.unavailable')} action={<Button onClick={() => accounts.refetch()}>{t('composer.editor.retry')}</Button>} />}
          {accounts.data && !providers.some(p => Object.keys(publishingModes(p)).length) && <DataState compact state="empty" title={t('composer.editor.noProviders')} />}
          <fieldset disabled={!!pending} className="space-y-3">
            {providers.filter(p => Object.keys(publishingModes(p)).length || draft.targetPlatforms.includes(p.key)).map(provider => {
              const isSelected = draft.targetPlatforms.includes(provider.key);
              const targets = draft.platformOverrides[provider.key]?.account_targets || (draft.platformOverrides[provider.key]?.social_account_id ? [{ social_account_id: draft.platformOverrides[provider.key].social_account_id }] : []);
              return <div key={provider.key} className="rounded-xl border border-border p-3">
                <Button variant="secondary" fullWidth aria-pressed={isSelected} onClick={() => toggleProvider(provider.key)}>{provider.titles[language] || provider.titles.en}</Button>
                {isSelected && <div className="mt-3 space-y-3">{provider.accounts.map(account => <Checkbox key={account.id} className="w-full" checked={targets.some(target => target.social_account_id === account.id)} onChange={() => toggleAccount(provider, account)} label={<span>{account.name}<br /><bdi>{account.destination.kind}: {account.destination.id}</bdi><br />{!account.health.ready && t('composer.editor.not_connected')}</span>} />)}</div>}
              </div>;
            })}
          </fieldset>
          {issues.length > 0 && <ul role="status" className="mt-3 space-y-2 text-sm">{issues.map((issue, i) => <li key={i}>{providers.find(p => p.key === issue.key)?.titles[language] || issue.key} {t(errorKey(issue.code))}{issue.limit && <> <bdi>{t('composer.editor.limits', undefined, { limit: issue.limit })}</bdi></>}</li>)}</ul>}
        </Card>
        <fieldset disabled={!!pending} className="min-w-0 space-y-6">
          <Card padding="md"><Input label={t('composer.editor.internalTitle')} value={draft.title} onChange={e => update('title', e.target.value)} />
            {selected.length > 0 && <AIWriteButton key={selected.map(p => p.key).join(':')} clientId={workspaceId} platform={selected[0].key} platformOptions={selected.map(p => ({ value: p.key, label: p.titles[language] || p.titles.en }))} onInsert={value => { if (mounted.current) update('content', value); }} />}
            <Textarea label={t('composer.editor.content')} value={draft.content} onChange={e => update('content', e.target.value)} minRows={6} />
            <NativeSelect label={t('composer.editor.mode')} value={draft.mediaType} onChange={e => update('mediaType', e.target.value)}>
              {[...new Set([draft.mediaType, ...modes])].map(mode => <option key={mode} value={mode}>{t(modeKey(mode))}</option>)}
            </NativeSelect>
            {selected.map(provider => {
              const options = draft.platformOverrides[provider.key] || {};
              const intent = effectiveIntent(options, draft);
              const extension = composerExtensions[publishingModes(provider)[intent.mode]?.ui_extension];
              const change = value => update('platformOverrides', old => ({ ...old, [provider.key]: { ...old[provider.key], ...value } }));
              const name = provider.titles[language] || provider.titles.en;
              return <div key={provider.key} className="space-y-3">
                {typeof options.media_type === 'string' && <NativeSelect label={`${name} · ${t('composer.editor.mode')}`} value={options.media_type} onChange={event => change({ media_type: event.target.value })}>
                  {[...new Set([options.media_type, ...Object.keys(publishingModes(provider))])].map(mode => <option key={mode} value={mode}>{t(modeKey(mode))}</option>)}
                </NativeSelect>}
                {typeof options.content === 'string' && <Textarea label={`${name} · ${t('composer.editor.content')}`} value={options.content} onChange={event => change({ content: event.target.value })} />}
                {Array.isArray(options.media_urls) && <div><p>{t('composer.editor.storedMedia', undefined, { count: options.media_urls.length })}</p><Button variant="secondary" onClick={() => update('platformOverrides', old => {
                  const next = { ...old[provider.key] }; delete next.media_urls; return { ...old, [provider.key]: next };
                })}>{t('composer.editor.inheritMedia')}</Button></div>}
                {extension && <extension.Editor mode={intent.mode} value={options} assets={intent.assets}
                  setAssets={value => update('mediaAssets', value)} onChange={change} />}
              </div>;
            })}
            <label className="ds-button ds-button-secondary my-3 inline-flex cursor-pointer items-center gap-2"><Upload size={16} />{t('composer.editor.upload')}
              <input className="sr-only" aria-label={t('composer.editor.upload')} type="file" multiple accept="image/*,video/*" disabled={!!pending} onChange={e => { upload([...e.target.files]); e.target.value = ''; }} />
            </label>
            <div className="space-y-3">{draft.mediaAssets.map((asset, i) => <div key={asset.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-border p-3">
              {asset.file_url && <img className="h-16 w-16 rounded-lg object-cover" src={asset.thumbnail_url || asset.file_url} alt="" />}
              <bdi>{i + 1}</bdi>{asset.caption && <span>{asset.caption}</span>}
              <Button variant="ghost" aria-label={t('composer.editor.remove')} icon={X} onClick={() => update('mediaAssets', values => values.filter((_, j) => j !== i))} />
              <Button variant="secondary" disabled={!i} onClick={() => update('mediaAssets', values => { const next = [...values]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; })}>{t('composer.editor.moveUp')}</Button>
            </div>)}</div>
          </Card>
          <Card padding="md"><h2 className="mb-3 font-semibold">{t('composer.editor.when')}</h2><div className="mb-3 flex flex-wrap gap-2">
            {['now', 'schedule', 'queue'].map(mode => <Button key={mode} variant={draft.scheduleMode === mode ? 'primary' : 'secondary'} aria-pressed={draft.scheduleMode === mode} onClick={() => update('scheduleMode', mode)}>{t(`composer.editor.${mode}`)}</Button>)}
          </div>
            {draft.scheduleMode === 'schedule' && <Input type="datetime-local" label={t('composer.editor.date')} hint={t('composer.editor.timezone', undefined, { zone: Intl.DateTimeFormat().resolvedOptions().timeZone })} value={draft.scheduledAt} onChange={e => update('scheduledAt', e.target.value)} />}
            {draft.scheduleMode === 'queue' && <><NativeSelect label={t('composer.queue.destination')} value={draft.queueId} disabled={queues.isPending || queues.isError} onChange={e => update('queueId', e.target.value)}>
              <option value="">{t('composer.queue.select')}</option>{availableQueues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </NativeSelect>{queues.isError && <DataState compact state="error" title={t('composer.queue.unavailable')} action={<Button onClick={() => queues.refetch()}>{t('composer.editor.retry')}</Button>} />}</>}
          </Card>
        </fieldset>
      </div>
      <Card padding="md" className="min-w-0 self-start"><h2 className="mb-3 font-semibold">{t('composer.editor.preview')}</h2>
        <div className="mb-3 flex flex-wrap gap-2">{selected.map(p => <Button key={p.key} variant="secondary" onClick={() => setPreview(p.key)}>{p.titles[language] || p.titles.en}</Button>)}</div>
        <div className="whitespace-pre-wrap break-words">{activeIntent.content}</div>
        {activeExtension && <activeExtension.Preview mode={activeIntent.mode} value={draft.platformOverrides[activeProvider.key] || {}} />}
        {activeIntent.assets.map(a => a.file_url && <img key={a.id} className="mt-3 max-w-full rounded-xl" src={a.thumbnail_url || a.file_url} alt={a.caption || ''} />)}
      </Card>
    </div>
  </div></Page>;
}
const errorCodes = ['unsupported', 'text_limit', 'media_count', 'media_size', 'media_type', 'media_duration', 'media_dimensions', 'media_aspect', 'media_invalid', 'not_connected', 'permission_denied', 'account_required', 'invalid_destination', 'schedule_unsupported', 'schedule_invalid', 'rate_limited', 'ambiguous', 'invalid_request', 'provider_error'];
function errorKey(code) { code = ({ scope_denied: 'permission_denied', token_expired: 'not_connected', media_too_large: 'media_size', graph_error: 'provider_error', publish_error: 'provider_error' })[code] || code; return `composer.editor.${errorCodes.includes(code) ? code : code === 'timeout' || code === 'network_error' || code === 'invalid_response' ? 'ambiguous' : 'unavailable'}`; }
function resultKey(status) { if (status === 'draft') status = 'saved'; return `composer.editor.${['ambiguous', 'saved', 'pending_approval', 'queued', 'publishing', 'published', 'partial', 'failed', 'scheduled', 'success'].includes(status) ? status : 'publishing'}`; }
function modeKey(mode) { return `composer.editor.mode_${['text', 'image', 'video', 'carousel', 'album', 'rich', 'poll', 'reel', 'story'].includes(mode) ? mode : 'custom'}`; }

function constraintDetail(policy, code) {
  const fields = { text_limit: ['max_characters'], media_count: ['min_items', 'max_items'], media_size: ['max_bytes'],
    media_duration: ['max_seconds'], media_aspect: ['aspect_min', 'aspect_max'], media_dimensions: ['min_width', 'max_width', 'min_height'], media_type: ['mime_types'] };
  return (fields[code] || []).map(key => policy[key]).filter(value => value != null).join(' / ');
}

function effectiveIntent(options, draft) {
  return { mode: typeof options.media_type === 'string' ? options.media_type : draft.mediaType,
    content: typeof options.content === 'string' ? options.content : draft.content,
    assets: Array.isArray(options.media_urls) ? options.media_urls.map((url, index) => draft.mediaAssets.find(asset => (asset.source_url || `asset:${asset.id}`) === url)
      || { id: `override-${index}`, source_url: url, file_url: typeof url === 'string' && url.startsWith('https://') ? url : '' }) : draft.mediaAssets };
}
