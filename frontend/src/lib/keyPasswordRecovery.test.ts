import { parseKeys, parseIssuedKey, parsePasswordProfile, parsePasswordChange } from './keyPasswordRecovery';
export const metadata = { id: 1, name: 'fixture', key_prefix: 'sk_live_AAAA', scopes: [], ip_allowlist: [], is_active: true, is_expired: false, created_at: '2026-10-07T10:00:00Z', revoked_at: null, expires_at: null, last_used_at: null, use_count: 0 };
test.each([{}, null, { keys: {} }, { keys: [metadata, metadata] }, { keys: [{ ...metadata, is_active: null }] }])('rejects invalid collection %p', v => expect(() => parseKeys(v)).toThrow());
test('metadata projection excludes secret and diagnostics', () => {
  expect(JSON.stringify(parseKeys({ keys: [{ ...metadata, plaintext_key: 'private', key_hash: 'private' }] }))).not.toContain('private');
});
test('issuance requires full key and matching metadata', () => {
  const issued = { ...metadata, plaintext_key: `sk_live_${'A'.repeat(32)}` };
  expect(parseIssuedKey(issued, metadata).metadata).not.toHaveProperty('plaintext_key');
  for (const patch of [{ plaintext_key: 'sk_live_AAAA' }, { name: 'other' }, { scopes: ['other'] }, { ip_allowlist: ['other'] }, { is_active: false }]) expect(() => parseIssuedKey({ ...issued, ...patch }, metadata)).toThrow();
});
test('eligibility and password result cannot be guessed', () => {
  expect(parsePasswordProfile({ id: 7, is_social: true }, 7)).toEqual({ is_social: true });
  for (const v of [{}, { id: 7 }, { id: 8, is_social: false }]) expect(() => parsePasswordProfile(v, 7)).toThrow();
  for (const v of [{}, { ok: true }, { detail: 'ok' }]) expect(() => parsePasswordChange(v)).toThrow();
  expect(() => parsePasswordChange({ detail: 'Password changed successfully.' })).not.toThrow();
});

test('issuance accepts exactly the backend list truncation without losing the one-time secret', () => {
  const scopes = Array.from({ length: 51 }, () => 'x'.repeat(81));
  const ip_allowlist = ['1'.repeat(51)];
  const dto = { ...metadata, scopes: scopes.slice(0, 50).map(s => s.slice(0, 80)), ip_allowlist: ['1'.repeat(50)], plaintext_key: `sk_live_${'A'.repeat(32)}` };
  expect(parseIssuedKey(dto, { name: metadata.name, scopes, ip_allowlist }).adjusted).toBe(true);
  expect(parseIssuedKey(dto, { name: metadata.name, scopes, ip_allowlist }).secret).toBe(dto.plaintext_key);
});
