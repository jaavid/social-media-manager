/** Backend wire contracts. List DTOs deliberately exclude all secret fields. */
type Row = Record<string, unknown>;
const row = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown) => v === null || date(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === 'string');
function check(v: unknown): asserts v { if (!v) throw new Error('Invalid security response'); }
export function parseKey(v: unknown) {
  check(row(v) && Number.isSafeInteger(v.id) && Number(v.id) > 0 && typeof v.name === 'string' &&
    typeof v.key_prefix === 'string' && /^sk_(live|test)_[A-Za-z0-9_-]{4}$/.test(v.key_prefix) &&
    strings(v.scopes) && strings(v.ip_allowlist) && typeof v.is_active === 'boolean' &&
    typeof v.is_expired === 'boolean' && date(v.created_at) && nullableDate(v.revoked_at) &&
    nullableDate(v.expires_at) && nullableDate(v.last_used_at) && Number.isSafeInteger(v.use_count) && Number(v.use_count) >= 0);
  return { id: Number(v.id), name: v.name, key_prefix: v.key_prefix, scopes: [...v.scopes],
    ip_allowlist: [...v.ip_allowlist], is_active: v.is_active, is_expired: v.is_expired,
    created_at: v.created_at, revoked_at: v.revoked_at, expires_at: v.expires_at,
    last_used_at: v.last_used_at, use_count: v.use_count };
}
export function parseKeys(v: unknown) {
  check(row(v) && Array.isArray(v.keys));
  const keys = v.keys.map(parseKey);
  check(new Set(keys.map(k => k.id)).size === keys.length);
  return keys;
}
export function parseIssuedKey(v: unknown, payload: { name: string; scopes: string[]; ip_allowlist: string[] }) {
  const metadata = parseKey(v);
  check(row(v) && typeof v.plaintext_key === 'string' && /^sk_(live|test)_[A-Za-z0-9_-]{32}$/.test(v.plaintext_key) &&
    v.plaintext_key.slice(0, 12) === metadata.key_prefix && metadata.is_active && !metadata.is_expired &&
    metadata.revoked_at === null && metadata.name === payload.name &&
    JSON.stringify(metadata.scopes) === JSON.stringify(payload.scopes.slice(0, 50).map(s => s.slice(0, 80))) &&
    JSON.stringify(metadata.ip_allowlist) === JSON.stringify(payload.ip_allowlist.slice(0, 50).map(s => s.slice(0, 50))));
  return { metadata, secret: v.plaintext_key, adjusted: JSON.stringify(metadata.scopes) !== JSON.stringify(payload.scopes) || JSON.stringify(metadata.ip_allowlist) !== JSON.stringify(payload.ip_allowlist) };
}
export function parsePasswordProfile(v: unknown, userId: unknown) {
  check(row(v) && v.id === userId && typeof v.is_social === 'boolean');
  return { is_social: v.is_social };
}
export function parsePasswordChange(v: unknown) {
  check(row(v) && v.detail === 'Password changed successfully.');
}
