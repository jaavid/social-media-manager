/** Checked wire shapes for the retained sync-log and account-session APIs. */
type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export interface SyncLogRow {
  id: number;
  platform: string;
  status: string;
  client_name: string;
  records_synced: number;
  started_at: string;
  duration_seconds: number | null;
}
export function parseSyncLogs(wire: unknown): SyncLogRow[] {
  const rows = Array.isArray(wire) ? wire : object(wire) ? wire.results : undefined;
  if (
    !Array.isArray(rows) ||
    new Set(rows.map((v) => v?.id)).size !== rows.length ||
    rows.some(
      (v) =>
        !object(v) ||
        !id(v.id) ||
        typeof v.platform !== 'string' ||
        !v.platform ||
        typeof v.client_name !== 'string' ||
        !['success', 'failed', 'running', 'pending'].includes(String(v.status)) ||
        !Number.isSafeInteger(v.records_synced) ||
        Number(v.records_synced) < 0 ||
        !date(v.started_at) ||
        !(
          v.duration_seconds === null ||
          (typeof v.duration_seconds === 'number' &&
            Number.isFinite(v.duration_seconds) &&
            v.duration_seconds >= 0)
        ),
    )
  )
    throw new Error('Invalid sync log response');
  // Raw provider exception text is intentionally excluded from the UI DTO.
  return rows.map((v) => ({
    id: v.id,
    platform: v.platform,
    status: v.status,
    client_name: v.client_name,
    records_synced: v.records_synced,
    started_at: v.started_at,
    duration_seconds: v.duration_seconds,
  }));
}
export interface SessionRow {
  id: number;
  browser: string;
  os: string;
  device: string;
  ip: string | null;
  last_used_at: string;
  is_active: boolean;
}
export function parseSessions(wire: unknown): SessionRow[] {
  if (
    !object(wire) ||
    !Array.isArray(wire.sessions) ||
    !Number.isSafeInteger(wire.count) ||
    wire.count !== wire.sessions.length ||
    new Set(wire.sessions.map((v) => v?.id)).size !== wire.sessions.length ||
    wire.sessions.some(
      (v) =>
        !object(v) ||
        !id(v.id) ||
        typeof v.is_active !== 'boolean' ||
        !date(v.last_used_at) ||
        !['browser', 'os', 'device'].every((k) => typeof v[k] === 'string') ||
        !(v.ip === null || typeof v.ip === 'string'),
    )
  )
    throw new Error('Invalid session response');
  return wire.sessions.map((v) => ({
    id: v.id,
    browser: v.browser,
    os: v.os,
    device: v.device,
    ip: v.ip,
    last_used_at: v.last_used_at,
    is_active: v.is_active,
  }));
}
export function parseRevocation(wire: unknown, all: boolean) {
  if (
    !object(wire) ||
    wire.ok !== true ||
    (all && (!Number.isSafeInteger(wire.revoked) || Number(wire.revoked) < 0))
  )
    throw new Error('Invalid revocation response');
}
