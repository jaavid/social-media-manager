/** Keep the active Next application independent of the removable legacy archive. */
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const next = path.join(root, 'next');
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.json', '.css'];
function files(folder) {
  if (fs.lstatSync(folder).isSymbolicLink()) throw new Error(`Active Next directory cannot be a symlink: ${folder}`);
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Active Next files cannot be symlinks: ${file}`);
    return entry.isDirectory() ? files(file) : [file];
  });
}
function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  Object.values(node).forEach(value => {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else if (value && typeof value === 'object') visit(value, callback);
  });
}
const errors = [];
const active = [...files(path.join(next, 'app')), ...files(path.join(next, 'src'))];
files(path.join(next, 'public'));
for (const file of [...active, path.join(next, 'proxy.js'), path.join(next, 'metadata.mjs')]) {
  if (!/\.(?:[jt]sx?|mjs)$/.test(file)) continue;
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  visit(ast, node => {
    const specifier = /^(?:ImportDeclaration|ExportNamedDeclaration|ExportAllDeclaration)$/.test(node.type)
      ? node.source?.value
      : node.type === 'CallExpression' && (node.callee.type === 'Import' || node.callee.name === 'require')
        ? node.arguments[0]?.value : undefined;
    if (typeof specifier !== 'string' || !specifier.startsWith('.')) return;
    const target = path.resolve(path.dirname(file), specifier);
    const candidates = [target, ...extensions.map(ext => target + ext), ...extensions.map(ext => path.join(target, 'index' + ext))];
    const resolved = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    const label = `${path.relative(root, file)} → ${specifier}`;
    if (!resolved) errors.push(`Unresolved import: ${label}`);
    else if (!fs.realpathSync(resolved).startsWith(next + path.sep)) errors.push(`Import outside Next: ${label}`);
  });
}
const inventory = JSON.parse(fs.readFileSync(path.join(next, 'src/app/routes/routeInventory.json'), 'utf8'));
for (const route of inventory.routes) {
  if (route.source && !fs.existsSync(path.join(next, 'src', route.source))) errors.push(`Missing route source: ${route.path}`);
}
for (const old of ['src', 'public', 'docker']) {
  if (fs.existsSync(path.join(root, old))) errors.push(`Old frontend directory remains active: ${old}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Next independence verified: ${inventory.routes.length} routes, ${active.length} active files, public assets without symlinks.`);
}
