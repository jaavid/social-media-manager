/** Verify the reviewed legacy URL inventory is completely owned by native pages. */
import fs from 'fs';
import path from 'path';
import inventory from './__fixtures__/legacyRoutes.json';
import redirects from './__fixtures__/redirectOnlyRoutes.json';
const app = path.resolve(__dirname, '../../app');
function pages(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? pages(file) : /^page\.[jt]sx$/.test(entry.name) ? [file] : [];
  });
}
const native = pages(app).map(file => '/' + path.relative(app, path.dirname(file)).split(path.sep)
  .filter(segment => !segment.startsWith('(')).map(segment => segment.replace(/^\[([^\.]+)\]$/, ':$1')).join('/'));
test('every inventoried URL has one native owner or a reviewed redirect to a native owner', () => {
  expect(inventory.routes).toHaveLength(191);
  for (const route of inventory.routes) {
    const redirected = redirects.filter(r => r.path === route.path);
    expect(native.filter(p => p === route.path).length + redirected.length).toBe(1);
    if (redirected.length) expect(native.filter(p => p === redirected[0].destination)).toHaveLength(1);
  }
  expect(native.filter(p => p.includes('...'))).toEqual(expect.arrayContaining(['/admin/ads/[...segments]', '/dashboard/ads/[...segments]']));
  expect(native.filter(p => p.includes('...'))).toHaveLength(2);
});
test('sole build has no legacy router or bundler dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(app, '../../package.json')));
  expect(pkg.dependencies['react-router-dom']).toBeUndefined();
  expect(pkg.devDependencies.vite).toBeUndefined();
  expect(pkg.scripts.build).toContain('next build');
  expect(fs.existsSync(path.join(app, '[[...legacy]]'))).toBe(false);
});

test('Next discovers a single App Router without treating feature modules as Pages Router routes', () => {
  const root = path.resolve(app, '../..');
  for (const reserved of ['pages', 'src/pages', 'app', 'next/next.config.mjs']) {
    expect(fs.existsSync(path.join(root, reserved))).toBe(false);
  }
  expect(fs.existsSync(path.join(root, 'next.config.mjs'))).toBe(true);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  // A production build must not overwrite reviewed route source files.
  expect(pkg.scripts.build).not.toMatch(/generate|next build next/);
});
