#!/usr/bin/env node
/*
 * Lightweight JSX i18n inventory. Inventory mode scans all source files.
 * Strict mode is incremental: it fails only on surfaces already migrated to
 * semantic translation keys, so the check is useful before the whole app is converted.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const root = path.join(projectRoot, 'next/src');
const extensions = new Set(['.js', '.jsx']);
const strictFiles = new Set([
  'next/src/components/ui/ConnectedAccounts.jsx',
  'next/src/components/PlatformConnectModal.jsx',
]);
const technicalAllowlist = [
  { pattern: /^\d+:[A-Z]+…?$/, reason: 'example bot-token identifier' },
  { pattern: /^(?:OAuth|API|URL|ID|JWT|CSV|PDF|QR|GDPR|DPDP|CTR|ROI|Meta|Facebook|Instagram|LinkedIn|YouTube|TikTok|WhatsApp|Social Stats)$/i, reason: 'protocol, identifier, metric, or registered brand' },
  { pattern: /^[@/#₹$€£+→←–—·|:,.!?()\d\s]+$/, reason: 'punctuation, currency, direction marker, or numeric presentation' },
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function allowed(value) {
  return technicalAllowlist.some(({ pattern }) => pattern.test(value.trim()));
}

const findings = [];
for (const file of walk(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(projectRoot, file).replaceAll(path.sep, '/');
  source.split(/\r?\n/).forEach((line, index) => {
    const candidates = [];
    for (const match of line.matchAll(/>([^<>{}\n]*[A-Za-z\u0600-\u06ff][^<>{}\n]*)</g)) candidates.push(match[1]);
    for (const match of line.matchAll(/\b(?:aria-label|title|placeholder|alt)=["']([^"']*[A-Za-z\u0600-\u06ff][^"']*)["']/g)) candidates.push(match[1]);
    candidates.forEach((value) => {
      const text = value.replace(/\s+/g, ' ').trim();
      if (text && !allowed(text)) findings.push({ file: relativeFile, line: index + 1, text });
    });
  });
}

const strictFindings = findings.filter(item => strictFiles.has(item.file));
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
} else {
  findings.forEach(item => process.stdout.write(`${item.file}:${item.line}: ${item.text}\n`));
  process.stdout.write(`\n${findings.length} direct user-facing JSX string(s) found; ${strictFindings.length} in strict migrated surfaces.\n`);
}
if (process.argv.includes('--check') && strictFindings.length) process.exitCode = 1;
