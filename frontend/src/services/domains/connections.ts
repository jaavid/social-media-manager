import { api } from '@/services/http/client';

export type ConnectionState = 'ready' | 'expired' | 'revoked' | 'not_connected' | 'unknown' | 'error';
export type SyncState = 'unknown' | 'not_available' | 'pending' | 'fresh' | 'stale' | 'failure';
type CapabilityStatus = 'supported' | 'beta' | 'planned' | 'not_available';
export interface ConnectionField { key: string; title_en: string; title_fa: string; secret: boolean; required: boolean }
export interface ConnectedAccount {
  id: number; name: string; external_id: string;
  identity: { id: string; name: string }; destination: { id: string; kind: string };
  health: { ready: boolean; state: ConnectionState; code: string };
  sync: { state: SyncState; last_success_at: string | null; last_failure_at: string | null; last_attempt_at: string | null; stale_after_seconds: number };
  expires_at: string | null; connected_at: string | null;
  permissions: { reconnect: boolean; disconnect: boolean };
}
export interface ConnectionProvider {
  key: string; titles: { en: string; fa: string }; category: string; auth_type: string; rollout_status: string;
  capabilities: Record<string, CapabilityStatus>;
  contract: { brand: { icon: string; color: string }; auth: { strategy: string; fields: ConnectionField[]; start_path: string }; destination_types: string[]; ui_extensions: string[] };
  readiness: { configured: boolean; missing: string[] } | null;
  permissions: { connect: boolean }; accounts: ConnectedAccount[];
}
export interface Connections {
  version: 1; workspace_id: number;
  categories: { key: string; title_en: string; title_fa: string }[];
  providers: ConnectionProvider[];
}
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const date = (v: unknown) => v === null || (str(v) && Number.isFinite(Date.parse(v)));
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
const oneOf = (v: unknown, values: string[]) => str(v) && values.includes(v);
const id = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const key = (v: unknown): v is string => str(v) && /^[a-z][a-z0-9_]{1,29}$/.test(v);
function account(v: unknown): boolean {
  return object(v) && id(v.id) && str(v.name) && str(v.external_id)
    && object(v.identity) && str(v.identity.id) && str(v.identity.name)
    && object(v.destination) && str(v.destination.id) && str(v.destination.kind)
    && object(v.health) && bool(v.health.ready) && str(v.health.code)
    && oneOf(v.health.state, ['ready', 'expired', 'revoked', 'not_connected', 'unknown', 'error'])
    && (v.health.ready === (v.health.state === 'ready'))
    && object(v.sync) && oneOf(v.sync.state, ['unknown', 'not_available', 'pending', 'fresh', 'stale', 'failure'])
    && date(v.sync.last_success_at) && date(v.sync.last_failure_at) && date(v.sync.last_attempt_at)
    && typeof v.sync.stale_after_seconds === 'number' && v.sync.stale_after_seconds >= 60
    && date(v.expires_at) && date(v.connected_at)
    && object(v.permissions) && bool(v.permissions.reconnect) && bool(v.permissions.disconnect);
}
function provider(v: unknown): boolean {
  if (!object(v) || !key(v.key) || !object(v.titles) || !str(v.titles.en) || !str(v.titles.fa)
    || !str(v.category) || !oneOf(v.auth_type, ['oauth2', 'oidc', 'api_key', 'bot_token', 'custom', 'unsupported'])
    || !oneOf(v.rollout_status, ['discovery', 'planned', 'experimental', 'beta', 'active', 'blocked', 'deprecated'])
    || !object(v.capabilities) || !Object.values(v.capabilities).every(s => oneOf(s, ['supported', 'beta', 'planned', 'not_available']))
    || !['connection', 'disconnect', 'analytics'].every(k => str((v.capabilities as Record<string, unknown>)[k]))
    || !object(v.contract) || !object(v.contract.brand) || !str(v.contract.brand.icon) || !str(v.contract.brand.color)
    || !object(v.contract.auth) || v.contract.auth.strategy !== v.auth_type || !str(v.contract.auth.start_path)
    || !Array.isArray(v.contract.auth.fields) || !strings(v.contract.destination_types) || !strings(v.contract.ui_extensions)
    || !object(v.permissions) || !bool(v.permissions.connect) || !Array.isArray(v.accounts) || !v.accounts.every(account)) return false;
  if (!v.contract.auth.fields.every(f => object(f) && str(f.key) && /^[a-z][a-z0-9_]{0,49}$/.test(f.key)
    && str(f.title_en) && str(f.title_fa) && bool(f.secret) && bool(f.required))) return false;
  return v.readiness === null || (object(v.readiness) && bool(v.readiness.configured) && strings(v.readiness.missing));
}
export function parseConnections(wire: unknown, workspaceId: number): Connections {
  if (!object(wire) || wire.version !== 1 || wire.workspace_id !== workspaceId
    || !Array.isArray(wire.categories) || !wire.categories.every(c => object(c) && str(c.key) && str(c.title_en) && str(c.title_fa))
    || !Array.isArray(wire.providers) || !wire.providers.every(provider)
    || new Set(wire.providers.map(p => p.key)).size !== wire.providers.length
    || !wire.providers.every(p => wire.categories instanceof Array && wire.categories.some(c => c.key === p.category))
    || wire.providers.some(p => new Set(p.accounts.map((a: ConnectedAccount) => a.id)).size !== p.accounts.length)) {
    throw new Error('Invalid connections response');
  }
  return wire as unknown as Connections;
}
const path = (workspaceId: number, provider?: string) => `/workspaces/${workspaceId}/connections/${provider ? `${encodeURIComponent(provider)}/` : ''}`;
export const connectionsAPI = {
  async workspace(signal?: AbortSignal): Promise<{ id: number } | null> {
    const response = await api.get<unknown>('/end-user/me/', { signal });
    if (!object(response.data) || !('workspace' in response.data)) throw new Error('Invalid workspace response');
    if (response.data.workspace === null) return null;
    if (!object(response.data.workspace) || !id(response.data.workspace.id)) throw new Error('Invalid workspace response');
    return { id: response.data.workspace.id as number };
  },
  async get(workspaceId: number, signal?: AbortSignal) {
    const response = await api.get<unknown>(path(workspaceId), { signal });
    return parseConnections(response.data, workspaceId);
  },
  async connect(workspaceId: number, provider: string, values: Record<string, string>, accountId?: number) {
    const response = await api.post<unknown>(path(workspaceId, provider), values, { params: accountId ? { account_id: accountId } : undefined });
    if (response.status !== 201 || !object(response.data) || response.data.success !== true || !id(response.data.account_id)) throw new Error('Invalid connection result');
  },
  async disconnect(workspaceId: number, provider: string, accountId: number) {
    const response = await api.delete(path(workspaceId, provider), { params: { account_id: accountId } });
    if (response.status !== 204 && !(response.status === 200 && response.data?.message)) throw new Error('Invalid disconnect result');
  },
  oauthPath(workspaceId: number, provider: string, accountId?: number) {
    return `/api${path(workspaceId, provider)}${accountId ? `?account_id=${accountId}` : ''}`;
  },
};
