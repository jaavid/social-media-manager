#!/usr/bin/env node
// Parser-based inventory. Ratchet by file, kind, and text, never by line number.
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const ts = require('typescript');
const { parse: parseMessage } = require('@formatjs/icu-messageformat-parser');
const root = path.resolve(__dirname, '..');
const baselinePath = path.join(__dirname, 'i18n-baseline.json');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : /\.[jt]sx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}
const attributes = new Set(['aria-label', 'title', 'placeholder', 'alt', 'label', 'description', 'message']);
const findings = [];
function visit(node, parent, file) {
  if (!node || typeof node !== 'object') return;
  let value;
  let kind;
  if (node.type === 'JSXText') { value = node.value; kind = 'text'; }
  if (node.type === 'JSXAttribute' && attributes.has(node.name?.name) && node.value?.type === 'StringLiteral') {
    value = node.value.value; kind = 'attribute';
  }
  if (node.type === 'CallExpression' && ((node.callee?.object?.name === 'toast') || ['alert', 'confirm'].includes(node.callee?.name))) {
    const arg = node.arguments[0];
    value = arg?.type === 'StringLiteral' ? arg.value : arg?.type === 'TemplateLiteral' ? arg.quasis.map(q => q.value.cooked).join('{expression}') : undefined;
    kind = 'notification';
  }
  if (value) {
    const text = value.replace(/\s+/g, ' ').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || /^[·\s]*Social Stats$/.test(text)) return;
    // Authored Persian copy already satisfies the Persian-only product direction.
    const persianProse = text.replace(/\{expression\}/g, '')
      .replace(/\b(?:OAuth|API|UI|IP|PII|PDF|JSON|CSV|GDPR|DPDP|DPA|DPO|SCC|SOC|II|EU|EEA|B2B|2FA|MIT|SLA|CTWA|LLM|CTA|CSS|AWS|AES-256|Fernet|Mumbai|ap-south-1|US-East-1|Gigai Kripa Services|Gigai Kripa)\b|Cmd\+[A-Z]/g, '');
    if (/[\u0600-\u06ff]/.test(text) && !/[A-Za-z]/.test(persianProse)) return;
    if (/[A-Za-z\u0600-\u06ff]/.test(text) && !/^(OAuth|API|URL|ID|JWT|CSV|PDF|QR|Meta|Facebook|Instagram|LinkedIn|YouTube|TikTok|WhatsApp|Social Stats)$/.test(text)) {
      findings.push({ file, kind, text, line: node.loc.start.line });
    }
  }
  for (const [key, child] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(child)) child.forEach(item => visit(item, node, file));
    else if (child && typeof child === 'object') visit(child, node, file);
  }
}
for (const file of walk(path.join(root, 'src'))) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  if (relative.startsWith('src/i18n/')) continue;
  visit(parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'] }), null, relative);
}
function counts(items) {
  const result = {};
  for (const { file, kind, text } of items) { const key = JSON.stringify([file, kind, text]); result[key] = (result[key] || 0) + 1; }
  return result;
}
// Evaluate only the checked, pure semantic catalog after TypeScript transpilation.
const moduleObject = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'src/i18n/messages.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
new Function('exports', compiled)(moduleObject.exports);
const { enMessages, faMessages } = moduleObject.exports;
function variables(message) {
  const found = [];
  function inspect(elements) {
    for (const e of elements) {
      if ([1, 2, 3, 4, 5, 6].includes(e.type)) found.push(`${e.value}:${e.type}`);
      if (e.options) for (const option of Object.values(e.options)) inspect(option.value);
      if (e.children) inspect(e.children);
    }
  }
  inspect(parseMessage(message));
  return [...new Set(found)].sort().join('|');
}
const errors = [];
for (const key of new Set([...Object.keys(enMessages), ...Object.keys(faMessages)])) {
  if (!enMessages[key] || !faMessages[key]) errors.push(`Missing semantic translation: ${key}`);
  else if (variables(enMessages[key]) !== variables(faMessages[key])) errors.push(`ICU placeholder/plural mismatch: ${key}`);
}
const current = counts(findings);
if (process.argv.includes('--write-baseline')) {
  fs.writeFileSync(baselinePath, JSON.stringify({ owner: 'frontend maintainers', policy: 'No new raw text; migrate by feature in #103/#106. Remove entries when their text is translated.', findings: current }, null, 2) + '\n');
}
const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath)).findings : {};
const added = findings.filter(f => current[JSON.stringify([f.file, f.kind, f.text])] > (baseline[JSON.stringify([f.file, f.kind, f.text])] || 0));
if (process.argv.includes('--json')) console.log(JSON.stringify(findings, null, 2));
else {
  if (!process.argv.includes('--check')) findings.forEach(f => console.log(`${f.file}:${f.line}: ${f.text}`));
  console.log(`${findings.length} untranslated candidates in JS/JSX/TS/TSX; ${added.length} beyond baseline. This is an inventory, not a translated coverage count.`);
  console.log(`${Object.keys(enMessages).length} semantic keys checked for locale and ICU parity.`);
}
if (process.argv.includes('--check')) {
  added.forEach(f => errors.push(`${f.file}:${f.line}: new ${f.kind}: ${f.text}`));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
}
