import { readFileSync } from 'fs';
import vm from 'vm';
import { migratedRoutes, isMigratedRoute } from './migratedRoutes';
test('ingress and client handoff select exactly the same routes', () => {
  const config = readFileSync('../docker/next-routes.conf', 'utf8');
  const pattern = new RegExp(config.match(/location ~ (\S+) \{/)[1]);
  for (const path of [...migratedRoutes, ...migratedRoutes.map(p => `${p}/`), '/about', '/admin', '/privacy/extra', '/api/auth/me/']) {
    expect(pattern.test(path)).toBe(isMigratedRoute(path));
  }
});
test('service worker never intercepts migrated HTML, Next assets or RSC', () => {
  const events = {};
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { events[name] = fn; } }, URL,
  });
  for (const path of [...migratedRoutes, '/_next/static/app.js', '/about?_rsc=123']) {
    const respondWith = jest.fn();
    events.fetch({ request: { url: `https://example.test${path}`, method: 'GET', headers: { has: key => key === 'RSC' && path.includes('_rsc') } }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  }
});
