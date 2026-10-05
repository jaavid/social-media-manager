import { internalReturnTo, parseSessionUser, returnToForUser } from './contracts';
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


test('login restores only role-permitted internal targets and preserves inherited fragments', () => {
  const user = { role: 'client', account_type: 'legacy' } as const;
  expect(returnToForUser('/dashboard/analytics/calendar?view=list', user, '#posts')).toBe('/dashboard/analytics/calendar?view=list#posts');
  expect(returnToForUser('/admin/analytics/calendar', user)).toBe('/dashboard');
  expect(returnToForUser('//external.test', user)).toBe('/dashboard');
  expect(returnToForUser('/u/billing', user)).toBe('/dashboard');
});
