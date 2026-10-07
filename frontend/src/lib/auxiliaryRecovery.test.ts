import { parseOAuthStatus, parseLookups } from './auxiliaryRecovery';
export const oauth = Object.fromEntries(['facebook','instagram','youtube','linkedin','google_my_business'].map(key => [key, { status: 'not_connected', last_successful_sync: null, accounts: [] }]));
test('OAuth wire completeness is checked and credential fields cannot enter the projection', () => {
  for (const v of [{}, null, { ...oauth, facebook: {} }, { ...oauth, facebook: { ...oauth.facebook, status: 'unknown' } }]) expect(() => parseOAuthStatus(v)).toThrow();
  expect(JSON.stringify(parseOAuthStatus({ ...oauth, facebook: { ...oauth.facebook, access_token: 'private' } }))).not.toContain('private');
});
test('lookup validation respects a genuinely empty public collection and rejects malformed entries', () => {
  expect(parseLookups({})).toEqual({});
  expect(() => parseLookups({ platforms: [] })).not.toThrow();
  for (const v of [[], null, { platforms: {} }, { platforms: [{ key: 'facebook', label: 'Facebook' }] }]) expect(() => parseLookups(v)).toThrow();
});
