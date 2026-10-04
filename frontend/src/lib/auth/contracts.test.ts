import { internalReturnTo, parseSessionUser } from './contracts';
test('returnTo accepts internal path, filters and fragments and rejects external destinations', () => {
  expect(internalReturnTo('/dashboard?tab=posts#draft')).toBe('/dashboard?tab=posts#draft');
  for (const target of ['//attacker.test', '/\\attacker.test', 'https://attacker.test', 'javascript:alert(1)', '/\n/attacker']) {
    expect(internalReturnTo(target)).toBe('/dashboard');
  }
});
test('identity and workspace IDs are validated before permissions enter client state', () => {
  const user = { id: 1, role: 'client', account_type: 'end_user', workspace_id: 42, permissions: { 'posts.read': true } };
  expect(parseSessionUser(user)).toEqual(user);
  expect(() => parseSessionUser({ ...user, workspace_id: '42' })).toThrow();
  expect(() => parseSessionUser({ ...user, account_type: 'unknown' })).toThrow();
  expect(() => parseSessionUser({ ...user, permissions: { admin: 'true' } })).toThrow();
});
