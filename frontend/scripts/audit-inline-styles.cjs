#!/usr/bin/env node
// Inventory only: do not prohibit CSS custom properties driven by runtime data.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../src');
const findings = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:jsx|tsx)$/.test(file)) {
      const source = fs.readFileSync(file, 'utf8');
      const inline = (source.match(/style=\{\{/g) || []).length;
      const tags = (source.match(/<style(?:\s|>)/g) || []).length;
      if (inline || tags) findings.push({ file: path.relative(root, file), inline, tags });
    }
  }
}
walk(root);
findings.sort((a, b) => b.inline - a.inline || a.file.localeCompare(b.file));
console.log(JSON.stringify({ scanned: 'frontend/src/**/*.jsx|tsx', filesWithStyles: findings.length, totalInline: findings.reduce((n, f) => n + f.inline, 0), totalStyleTags: findings.reduce((n, f) => n + f.tags, 0), top: findings.slice(0, 30) }, null, 2));
