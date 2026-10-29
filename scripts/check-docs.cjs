#!/usr/bin/env node
// Validate canonical Markdown entrypoints and repository-local links.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = ['README.md', 'PROJECT.md', 'DESIGN.md', 'AGENTS.md', 'CONTRIBUTING.md', 'docs/README.md', 'docs/SHELL_COMPOSITION_CONTRACT.md'];
const failures = [];
for (const name of required) if (!fs.existsSync(path.join(root, name))) failures.push('Missing: ' + name);
const files = required.filter(name => !name.includes('/')).map(name => path.join(root, name));
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name.endsWith('.md')) files.push(file);
  }
}
walk(path.join(root, 'docs'));
// Markdown destinations may include valid parentheses such as Next route groups.
function destinations(text) {
  const found = [];
  for (let i = 0; i < text.length - 2; i++) {
    if (text[i] !== ']' || text[i + 1] !== '(') continue;
    let depth = 1, quoted = false, start = i + 2, j = start;
    for (; j < text.length; j++) {
      if (text[j] === '\\') { j++; continue; }
      if (text[j] === '<') quoted = true;
      if (text[j] === '>') quoted = false;
      if (!quoted && text[j] === '(') depth++;
      if (!quoted && text[j] === ')' && --depth === 0) break;
    }
    if (depth === 0) { found.push(text.slice(start, j)); i = j; }
  }
  return found;
}
for (const file of new Set(files)) {
  const source = fs.readFileSync(file, 'utf8').replace(/\x60{3}[\s\S]*?\x60{3}/g, '');
  for (const raw of destinations(source)) {
    const url = raw.trim().replace(/^<([^>]*)>.*$/, '$1').split(/\s+["']/)[0].split('#')[0].split('?')[0];
    if (!url || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue;
    let decoded;
    try { decoded = decodeURIComponent(url); }
    catch { failures.push(path.relative(root, file) + ': invalid URL ' + url); continue; }
    const resolved = decoded.startsWith('/') ? path.resolve(root, '.' + decoded) : path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) failures.push(path.relative(root, file) + ': missing ' + url);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Verified ' + new Set(files).size + ' Markdown documents and canonical entrypoints.');
