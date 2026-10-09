const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '../src');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = path.join(dir, e.name);
    return e.isDirectory() ? walk(file) : /\.(?:[jt]sx?|mjs)$/.test(file) && !/\.test\./.test(file) ? [file] : [];
  });
}
function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  Object.values(node).forEach(v => Array.isArray(v) ? v.forEach(c => visit(c, callback)) : typeof v === 'object' && visit(v, callback));
}
const files = walk(root), graph = new Map(), clients = [], servers = new Set(), findings = [];
const label = file => path.relative(root, file).replace(/\.(?:[jt]sx?|mjs)$/, '');
for (const file of files) {
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  if (ast.program.directives.some(d => d.value.value === 'use client')) clients.push(file);
  const edges = [];
  visit(ast, n => {
    const specifier = n.source?.value || (n.type === 'CallExpression' && (n.callee?.type === 'Import' || n.callee?.name === 'require') ? n.arguments[0]?.value : null);
    if (typeof specifier !== 'string') return;
    if (specifier === 'server-only' || specifier === 'next/headers' || specifier.startsWith('node:')) servers.add(file);
    if (/archive|legacy-frontend/.test(specifier)) findings.push(`archive:${label(file)}:${specifier}`);
    const target = specifier.startsWith('@/') ? path.join(root, specifier.slice(2)) : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : null;
    if (!target) return;
    if ([path.join(root, 'services/api'), path.join(root, 'services/api.js')].includes(target)) {
      findings.push(`retired:${label(file)}:services/api`);
    }
    const resolved = [target, ...['.js', '.jsx', '.ts', '.tsx', '.mjs'].flatMap(ext => [target + ext, path.join(target, 'index' + ext)])].find(p => files.includes(p));
    if (!resolved) return;
    edges.push(resolved);
    const from = label(file).split('/'), to = label(resolved).split('/');
    if (to[0] === 'app' && from[0] !== 'app') findings.push(`upward:${label(file)}->${label(resolved)}`);
    if (from[0] === 'features' && to[0] === 'features' && from[1] !== to[1]) findings.push(`feature:${label(file)}->${label(resolved)}`);
    if (['components', 'hooks', 'services', 'lib', 'i18n'].includes(from[0]) && to[0] === 'features') findings.push(`shared:${label(file)}->${label(resolved)}`);
  });
  graph.set(file, edges);
}
let counter = 0;
const indexes = new Map(), low = new Map(), stack = [], active = new Set();
function strong(file) {
  indexes.set(file, counter); low.set(file, counter++); stack.push(file); active.add(file);
  for (const target of graph.get(file) || []) {
    if (!indexes.has(target)) { strong(target); low.set(file, Math.min(low.get(file), low.get(target))); }
    else if (active.has(target)) low.set(file, Math.min(low.get(file), indexes.get(target)));
  }
  if (low.get(file) === indexes.get(file)) {
    const group = []; let item;
    do { item = stack.pop(); active.delete(item); group.push(item); } while (item !== file);
    if (group.length > 1) findings.push(`cycle:${group.map(label).sort().join(',')}`);
  }
}
files.forEach(file => { if (!indexes.has(file)) strong(file); });
const fatal = [];
for (const client of clients) {
  const seen = new Set();
  function check(file, chain) {
    if (seen.has(file)) return;
    seen.add(file);
    if (servers.has(file)) { fatal.push(`Client imports server-only code: ${chain.map(label).join(' -> ')}`); return; }
    (graph.get(file) || []).forEach(target => check(target, [...chain, target]));
  }
  check(client, [client]);
}
const baselineFile = path.join(__dirname, 'architecture-baseline.json');
if (process.argv.includes('--write-baseline')) fs.writeFileSync(baselineFile, JSON.stringify({ owner: 'frontend maintainers', policy: 'Retire feature/shared coupling in #103; no new edges/cycles. Archive and client/server violations are always fatal.', findings: [...new Set(findings)].sort() }, null, 2) + '\n');
const baseline = new Set(JSON.parse(fs.readFileSync(baselineFile)).findings);
const added = findings.filter(f => !baseline.has(f) || f.startsWith('archive:') || f.startsWith('retired:'));
console.log(`${files.length} modules checked; ${findings.length} import/cycle findings; ${added.length} beyond baseline; ${fatal.length} client/server violations.`);
if (added.length || fatal.length) { console.error([...added, ...fatal].join('\n')); process.exitCode = 1; }
