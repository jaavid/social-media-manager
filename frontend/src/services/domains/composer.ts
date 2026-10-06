import { api } from '@/services/http/client';

export interface ComposerPost {
  id: number; client: number; title: string; content: string; media_type: string; media_urls: string[];
  target_platforms: string[]; platform_overrides: Record<string, Record<string, unknown>>;
  status: string; scheduled_at: string | null;
  publish_logs?: { platform: string; social_account: number | null; status: string; error_code: string }[];
}
export interface ComposerQueue { id: number; client: number; name: string; platforms: string[]; is_active: boolean }
export interface ComposerMedia { id: number; file_url: string; mime_type: string; file_size: number; width: number | null; height: number | null; duration_seconds: number | null; thumbnail_url?: string; caption?: string; source_url?: string }
const obj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === 'string');
export function parsePost(wire: unknown, workspaceId: number): ComposerPost {
  if (!obj(wire) || !Number.isSafeInteger(wire.id) || wire.client !== workspaceId
      || typeof wire.content !== 'string' || typeof wire.title !== 'string' || typeof wire.media_type !== 'string'
      || !strings(wire.media_urls) || !strings(wire.target_platforms) || !obj(wire.platform_overrides)
      || !Object.values(wire.platform_overrides).every(obj)
      || !['draft', 'pending_approval', 'scheduled', 'queued', 'publishing', 'published', 'partial', 'failed', 'cancelled'].includes(String(wire.status))
      || (wire.publish_logs !== undefined && (!Array.isArray(wire.publish_logs) || !wire.publish_logs.every(log => obj(log) && typeof log.platform === 'string' && typeof log.error_code === 'string' && (log.social_account === null || Number.isSafeInteger(log.social_account)) && ['pending', 'publishing', 'success', 'failed', 'skipped'].includes(String(log.status)))))
      || !(wire.scheduled_at === null || (typeof wire.scheduled_at === 'string' && Number.isFinite(Date.parse(wire.scheduled_at))))) throw new Error('Invalid composer response');
  return wire as unknown as ComposerPost;
}
const config = (workspaceId: number, signal?: AbortSignal) => ({ params: { workspace_id: workspaceId }, signal });
const posts = '/composer/posts/';
export const composer = {
  async get(workspaceId: number, id: string | number, signal?: AbortSignal) {
    return parsePost((await api.get<unknown>(`${posts}${id}/`, config(workspaceId, signal))).data, workspaceId);
  },
  async save(workspaceId: number, id: string | number | null, payload: unknown, intentKey?: string) {
    const response = id ? await api.patch<unknown>(`${posts}${id}/`, payload, config(workspaceId))
      : await api.post<unknown>(posts, payload, { ...config(workspaceId), headers: { 'Idempotency-Key': intentKey } });
    if (response.status === 202 && obj(response.data) && response.data.requires_approval === true) return { approval: true as const };
    return { post: parsePost(response.data, workspaceId) };
  },
  async resolve(workspaceId: number, intentKey: string) {
    return parsePost((await api.get<unknown>(`${posts}resolve_intent/`, { params: { workspace_id: workspaceId, intent_key: intentKey } })).data, workspaceId);
  },
  async command(workspaceId: number, id: number, operation: 'publish_now' | 'schedule' | 'add_to_queue', body: unknown = {}) {
    const response = await api.post<unknown>(`${posts}${id}/${operation}/`, body, config(workspaceId));
    if (response.status === 202 && obj(response.data) && (response.data.requires_approval === true || response.data.status === 'pending_approval')) return { status: 'pending_approval' };
    if (operation === 'add_to_queue') {
      if (!obj(response.data) || !Number.isSafeInteger(response.data.id)) throw new Error('Invalid queue result');
      return { status: 'queued' };
    }
    const post = parsePost(response.data, workspaceId);
    if (!(operation === 'schedule' ? ['scheduled', 'pending_approval'] : ['queued', 'publishing', 'pending_approval', 'published']).includes(post.status)) throw new Error('Invalid publication result');
    return { status: post.status };
  },
  async queues(workspaceId: number, signal?: AbortSignal): Promise<ComposerQueue[]> {
    const response = await api.get<unknown>('/composer/queues/', config(workspaceId, signal));
    const data = obj(response.data) ? response.data.results : response.data;
    if (!Array.isArray(data) || !data.every(q => obj(q) && Number.isSafeInteger(q.id) && q.client === workspaceId && typeof q.name === 'string' && strings(q.platforms) && typeof q.is_active === 'boolean')) throw new Error('Invalid queue response');
    return data;
  },
  async upload(workspaceId: number, file: File): Promise<ComposerMedia> {
    const body = new FormData(); body.append('file', file);
    const response = await api.post<unknown>('/composer/media/', body, { ...config(workspaceId), headers: { 'Content-Type': 'multipart/form-data' } });
    if (!obj(response.data) || !Number.isSafeInteger(response.data.id) || response.data.client !== workspaceId || typeof response.data.mime_type !== 'string' || typeof response.data.file_url !== 'string') throw new Error('Invalid media response');
    return response.data as unknown as ComposerMedia;
  },
};
