#!/usr/bin/env node
// Check canonical documentation entrypoints and relative Markdown links.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = ['README.md', 'PROJECT.md', 'DESIGN.md', 'AGENTS.md', 'CONTRIBUTING.md', 'docs/README.md', 'docs/SHELL_COMPOSITION_CONTRACT.md'];
const errors = [];
for (const name of required) if (!fs.existsSync(path.join(root, name))) errors.push('Missing canonical document: ' + name);
const dirs = ['docs', '.'];
const files = [];
function collect(directory) {
  for (const ent of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, ent.name);
    if (ent.isDirectory()) collect(absolute);
    else if (ent.name.endsWith('.md')) files.push(absolute);
  }
}
for (const dir of dirs) {
  if (dir === '.') for (const name of required.filter(x => !x.includes('/'))) files.push(path.join(root, name));
  else collect(path.join(root, dir));
}
for (const file of new Set(files)) {
  const body = fs.readFileSync(file, 'utf8');
  const links = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of body.matchAll(links)) {
    const target = match[1].trim().split(/\s+["']/)[0].replace(/^<|>$/g, '').split('#')[0].split('?')[0];
    if (!target || /^(?:[a-z]+:|#|\/\/)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!fs.existsSync(resolved)) errors.push(path.relative(root, file) + ': missing link ' + target);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Documentation entrypoints and links verified (' + new Set(files).size + ' files).');
