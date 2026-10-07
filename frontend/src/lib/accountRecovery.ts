/** Validate account-security/privacy DTOs without retaining raw diagnostics. */
type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) > 0;
const date = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown): v is string | null => v === null || date(v);
function check(valid: unknown): asserts valid {
  if (!valid) throw new Error('Invalid account response');
}
export function parseMfaStatus(v: unknown) {
  check(
    object(v) &&
      typeof v.enabled === 'boolean' &&
      typeof v.pending === 'boolean' &&
      !(v.enabled && v.pending) &&
      Number.isSafeInteger(v.backup_codes_remaining) &&
      Number(v.backup_codes_remaining) >= 0 &&
      nullableDate(v.last_used_at),
  );
  return {
    enabled: v.enabled,
    pending: v.pending,
    backup_codes_remaining: v.backup_codes_remaining,
    last_used_at: v.last_used_at,
  };
}
export function parseMfaSetup(v: unknown) {
  check(
    object(v) &&
      typeof v.secret === 'string' &&
      /^[A-Z2-7]{32}$/.test(v.secret) &&
      typeof v.qr_data_uri === 'string' &&
      /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(v.qr_data_uri) &&
      typeof v.otpauth_url === 'string' &&
      v.otpauth_url.startsWith('otpauth://totp/'),
  );
  const url = new URL(v.otpauth_url);
  check(url.searchParams.get('secret') === v.secret);
  // Secret/QR live only in component memory, never in Query cache or storage.
  return { secret: v.secret, qr_data_uri: v.qr_data_uri };
}
export function parseBackupCodes(v: unknown, regenerated = false): string[] {
  check(
    object(v) &&
      v.ok === true &&
      Array.isArray(v.backup_codes) &&
      v.backup_codes.length === 10 &&
      v.backup_codes.every((c: unknown) => typeof c === 'string' && /^[A-F0-9]{10}$/.test(c)) &&
      new Set(v.backup_codes).size === 10 &&
      (!regenerated || v.count === 10),
  );
  return [...v.backup_codes];
}
export function parseOk(v: unknown) {
  check(object(v) && v.ok === true);
}
export function parseExport(v: unknown) {
  check(
    object(v) &&
      id(v.id) &&
      ['queued', 'processing', 'completed', 'failed', 'expired'].includes(String(v.status)) &&
      date(v.requested_at) &&
      nullableDate(v.completed_at) &&
      nullableDate(v.expires_at) &&
      Number.isSafeInteger(v.size_bytes) &&
      Number(v.size_bytes) >= 0 &&
      (v.download_url === null ||
        (typeof v.download_url === 'string' &&
          /^\/api\/privacy\/download\/[a-f0-9]{32}\/$/.test(v.download_url))) &&
      (v.status !== 'completed' ||
        (date(v.completed_at) && date(v.expires_at) && v.download_url !== null)),
  );
  return {
    id: v.id,
    status: v.status,
    requested_at: v.requested_at,
    completed_at: v.completed_at,
    expires_at: v.expires_at,
    size_bytes: v.size_bytes,
    download_url: v.download_url,
  };
}
export function parseExports(v: unknown) {
  check(object(v) && Array.isArray(v.requests));
  const rows = v.requests.map(parseExport);
  check(new Set(rows.map((r: Row) => r.id)).size === rows.length);
  return rows;
}
export function parseConsents(v: unknown) {
  check(object(v) && object(v.consents) && Array.isArray(v.available));
  const available = v.available;
  check(
    available.every(
      (r: unknown) =>
        object(r) && typeof r.type === 'string' && !!r.type && typeof r.label === 'string',
    ) &&
      new Set(available.map((r: Row) => r.type)).size === available.length &&
      Object.entries(v.consents).every(
        ([k, value]) => typeof value === 'boolean' && available.some((r: Row) => r.type === k),
      ),
  );
  return {
    consents: { ...v.consents },
    available: available.map((r: Row) => ({ type: r.type, label: r.label })),
  };
}
export function parseConsentWrite(v: unknown, type: string, given: boolean) {
  check(object(v));
  parseOk(v);
  check(v.consent_type === type && v.given === given && date(v.recorded_at));
}
export function parseProcessing(v: unknown) {
  check(
    object(v) &&
      Array.isArray(v.workspaces) &&
      v.workspaces.every(
        (r: unknown) =>
          object(r) &&
          id(r.id) &&
          typeof r.name === 'string' &&
          typeof r.is_processing_paused === 'boolean',
      ) &&
      new Set(v.workspaces.map((r: Row) => r.id)).size === v.workspaces.length,
  );
  return v.workspaces.map((r: Row) => ({
    id: r.id,
    name: r.name,
    is_processing_paused: r.is_processing_paused,
  }));
}
export function parseProcessingWrite(v: unknown, paused: boolean) {
  check(object(v));
  parseOk(v);
  check(v.is_processing_paused === paused && v.workspaces_affected === 1);
}
export function parseDeletion(v: unknown) {
  check(
    object(v) &&
      id(v.id) &&
      ['queued', 'cancelled', 'processing', 'completed', 'failed'].includes(String(v.status)) &&
      date(v.requested_at) &&
      date(v.grace_until) &&
      nullableDate(v.cancelled_at) &&
      nullableDate(v.processed_at) &&
      typeof v.reason === 'string' &&
      (v.status !== 'cancelled' || date(v.cancelled_at)),
  );
  return {
    id: v.id,
    status: v.status,
    requested_at: v.requested_at,
    grace_until: v.grace_until,
    cancelled_at: v.cancelled_at,
    processed_at: v.processed_at,
    reason: v.reason,
  };
}
export function parseDeletionStatus(v: unknown) {
  check(object(v) && Object.hasOwn(v, 'request'));
  return v.request === null ? null : parseDeletion(v.request);
}
export function parseImmediateDeletion(v: unknown) {
  check(object(v) && v.detail === 'Your account has been permanently deleted.');
}
