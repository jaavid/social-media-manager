/** Verify the reviewed legacy URL inventory is completely owned by native pages. */
import fs from 'fs';
import path from 'path';
import inventory from './routeInventory.json';
const app = path.resolve(__dirname, '../../../next/app');
function pages(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? pages(file) : entry.name === 'page.jsx' ? [file] : [];
  });
}
const native = pages(app).map(file => '/' + path.relative(app, path.dirname(file)).split(path.sep)
  .filter(segment => !segment.startsWith('(')).map(segment => segment.replace(/^\[([^\.]+)\]$/, ':$1')).join('/'));
test('every inventoried URL has exactly one explicit native owner', () => {
  expect(inventory.routes).toHaveLength(191);
  for (const route of inventory.routes) expect(native.filter(p => p === route.path)).toHaveLength(1);
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
