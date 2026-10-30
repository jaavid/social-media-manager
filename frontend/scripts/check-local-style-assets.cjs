#!/usr/bin/env node
// Guard application-owned style and font assets. npm package CSS is bundled by the build.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../src');
const offenders = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { visit(file); continue; }
    if (!/\.(css|jsx?|tsx?)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
    const contents = fs.readFileSync(file, 'utf8');
    const checks = [
      [/next\/font\/google\b/g, 'external Next font provider'],
      [/@import\s+(?:url\()?\s*['"]?(?:https?:)?\/\//g, 'remote CSS import'],
      [/url\(\s*['"]?(?:https?:)?\/\//g, 'remote CSS asset'],
      [/<link\b[^>]*\brel\s*=\s*['"]stylesheet['"][^>]*\bhref\s*=\s*['"](?:https?:)?\/\//gi, 'remote stylesheet link'],
      [/<link\b[^>]*\bhref\s*=\s*['"](?:https?:)?\/\/[^>]*\brel\s*=\s*['"]stylesheet['"]/gi, 'remote stylesheet link'],
    ];
    for (const [pattern, reason] of checks)
      if (pattern.test(contents)) offenders.push(`${path.relative(root, file)}: ${reason}`);
  }
}
visit(root);
if (offenders.length) {
  console.error('External style/font sources are forbidden:\n' + offenders.join('\n'));
  process.exitCode = 1;
} else console.log('Local CSS/font asset policy verified.');
