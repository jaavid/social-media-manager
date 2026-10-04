import { destinationHref, routeIsActive } from './navigation';
test('query, fragment and relative navigation preserve their URL meaning', () => {
  expect(destinationHref('?tab=team', '/admin/settings', '?old=1')).toBe('/admin/settings?tab=team');
  expect(destinationHref('#privacy', '/terms', '?lang=en')).toBe('/terms?lang=en#privacy');
  expect(destinationHref('../reports', '/dashboard/analytics')).toBe('/dashboard/reports');
  expect(destinationHref({ pathname: '/login', search: '?next=%2Fu', hash: '#mfa' }, '/')).toBe('/login?next=%2Fu#mfa');
});
test.each(['https://evil.test', '//evil.test', 'javascript:alert(1)'])('rejects external destinations: %s', url => {
  expect(() => destinationHref(url, '/')).toThrow('internal URL');
});
test('active links match whole segments and honor exact matching', () => {
  expect(routeIsActive('/admin?tab=a', '/admin/users')).toBe(true);
  expect(routeIsActive('/admin', '/administrator')).toBe(false);
  expect(routeIsActive('/admin', '/admin/users', true)).toBe(false);
  expect(routeIsActive('/', '/privacy')).toBe(false);
});
