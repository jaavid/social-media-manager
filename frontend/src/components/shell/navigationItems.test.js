import fs from 'fs';
import path from 'path';
import { canonicalWorkspacePath } from '../../lib/runtime/navigation';
import { visibleSections, navigationHref, searchNavigationResults } from './navigationItems';
import { routeIsActive } from '../../lib/runtime/navigation';
const paths = (base, grants) => visibleSections('analytics', base, code => grants.includes(code)).flatMap(group => group.items.map(item => item.path));
test.each([
  ['designer', ['composer.view'], ['/composer'], ['/inbox', '/reports']],
  ['approver', ['composer.approve', 'reports.view'], ['/approvals', '/reports'], ['/composer', '/inbox']],
  ['agency', ['composer.view', 'inbox.view', 'reports.view'], ['/composer', '/inbox', '/reports'], []],
])('%s discovers only explicitly granted tools', (_, grants, allowed, denied) => {
  const available = paths('/dashboard', grants);
  allowed.forEach(path => expect(available).toContain(path));
  denied.forEach(path => expect(available).not.toContain(path));
});
test('client cannot discover admin-only routes even with bot grants; future entries never become links', () => {
  const client = visibleSections('messaging', '/dashboard', () => true).flatMap(group => group.items);
  expect(client.some(item => item.path.startsWith('/admin/') || item.disabled)).toBe(false);
  expect(visibleSections('messaging', '/admin', () => true).flatMap(group => group.items).some(item => item.path === '/admin/bot-flows')).toBe(true);
});
test('workspace scope is carried by links, global APIs retain their scope and aliases remain active', () => {
  const item = { path: '/composer' };
  expect(navigationHref('/dashboard', 'analytics', item, 7)).toBe('/dashboard/analytics/composer?workspace=7');
  expect(navigationHref('/dashboard', 'analytics', item, 8)).not.toContain('workspace=7');
  expect(navigationHref('/u', 'analytics', { path: '/approvals' }, 8)).not.toContain('workspace=');
  expect(routeIsActive(navigationHref('/dashboard', 'analytics', item, 7), '/dashboard/composer')).toBe(true);
});

test('search cannot bypass shell or permission discovery and uses delivered routes', () => {
  const wire = { posts: [{ id: 2, deep_link: '/admin/composer/2' }], leads: [{ id: 3 }], conversations: [{ id: 4 }], contacts: [{ id: 5 }] };
  const allowed = searchNavigationResults(wire, '/dashboard', () => true, 7);
  expect(allowed.posts[0].deep_link).toBe('/dashboard/analytics/composer/2?workspace=7');
  expect(allowed.leads).toEqual([]);
  expect(allowed.conversations[0].deep_link).toBe('/dashboard/analytics/inbox?workspace=7');
  expect(searchNavigationResults(wire, '/dashboard', () => false, 7).total).toBe(0);
});

test('every active catalog destination is owned by a native page in the allowed shell', () => {
  const app = path.resolve(__dirname, '../../app');
  function pages(folder) {
    return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(folder, entry.name);
      return entry.isDirectory() ? pages(file) : /^page\.[jt]sx$/.test(entry.name) ? [file] : [];
    });
  }
  const owned = pages(app).map(file => '/' + path.relative(app, path.dirname(file)).split(path.sep).filter(segment => !segment.startsWith('(')).join('/'));
  for (const base of ['/admin', '/dashboard']) for (const moduleId of ['analytics', 'messaging']) {
    for (const item of visibleSections(moduleId, base, () => true).flatMap(section => section.items)) {
      const destination = canonicalWorkspacePath(navigationHref(base, moduleId, item, 7)).split('?')[0];
      expect({ base, destination, owned: owned.includes(destination) }).toEqual({ base, destination, owned: true });
    }
  }
});

test('a unified inbox grant does not advertise the separate WhatsApp module', () => {
  expect(visibleSections('messaging', '/dashboard', code => code === 'inbox.view')).toEqual([]);
});
