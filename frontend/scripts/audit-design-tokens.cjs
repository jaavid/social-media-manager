#!/usr/bin/env node
'use strict';
/**
 * Issue #241: design-token migration inventory and regression ratchet.
 * The historical inventory is a per-file ceiling, NOT an allowlist to add colors.
 * Official provider color metadata and immutable artwork may retain named exceptions;
 * future exceptions require an explicit explanatory comment on the same line.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'src');
const oldInventory = JSON.parse(fs.readFileSync(path.join(root, '../docs/brand/ravinta/RAW_COLOR_INVENTORY.json'), 'utf8'));
const ceilings = Object.fromEntries(oldInventory.rows.map(row =>
  [row.path.replace(/^frontend\/src\//, ''), row.occurrences]));
/* The historical brand inventory predates the merged theme bootstrap and a few
 * feature splits. Approved, version-pinned native colors remain as ceilings:
 * inline SSR theme fallbacks, canonical JS defaults, and official provider art.
 * These must not grow without explicit review.
 */
Object.assign(ceilings, {
  'app/layout.jsx': 8,
  'lib/appearance.js': 14,
  'components/ui/SocialPlatformIcon.jsx': 27,
  'services/platformPresentation.js': 1,
});

// The migrated files have tighter limits than the historical inventory.
const migratedBudgets = {
  'features/settings/SettingsPage.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/CalendarPage.jsx': { hex: 1, rgb: 0, inline: 3 },
  'features/ROICalculatorPage.jsx': { hex: 0, rgb: 1, inline: 98 },
  'features/HomePage.jsx': { hex: 0, rgb: 6, inline: 80 },
  'features/bots/nodeCatalog.js': { hex: 0, rgb: 0, inline: 0 },
  'features/bots/CanvasNode.jsx': { hex: 0, rgb: 0, inline: 14 },
  'features/bots/NodeInspector.jsx': { hex: 0, rgb: 0, inline: 6 },
  'features/bots/BotFlowEditorPage.jsx': { hex: 1, rgb: 0, inline: 16 },
  'components/ui/ROIFunnel.jsx': { hex: 0, rgb: 0, inline: 2 },
  'components/ui/StatCard.jsx': { hex: 9, rgb: 0, inline: 1 },
  'components/marketing/MeshGradient.jsx': { hex: 0, rgb: 0, inline: 3 },
  'components/marketing/BentoPreviews.jsx': { hex: 9, rgb: 4, inline: 41 },
  'features/CaptionWriterPage.jsx': { hex: 0, rgb: 3, inline: 138 },
  'features/ClientOnboardingPage.jsx': { hex: 0, rgb: 9, inline: 8 },
  'features/PostIdeasPage.jsx': { hex: 0, rgb: 8, inline: 18 },
  'components/ui/CompetitorSection.jsx': { hex: 0, rgb: 1, inline: 0 },
  'features/marketing/solutionPages.js': { hex: 0, rgb: 0, inline: 0 },
  'features/marketing/productPages.js': { hex: 0, rgb: 0, inline: 0 },
  'features/bots/MessageForms.jsx': { hex: 0, rgb: 2, inline: 16 },
  'features/bots/TestModeDrawer.jsx': { hex: 0, rgb: 0, inline: 19 },
  'features/management/ClientsTab.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/management/ManagementPanels.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/management/StaffTab.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/settings/BusinessAssetSections.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/settings/BusinessAudienceSection.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/settings/BusinessIdentitySections.jsx': { hex: 0, rgb: 0, inline: 0 },
  'features/workspaces/AllClientsPage.jsx': { hex: 0, rgb: 0, inline: 0 },
  'styles/common.css': { hex: 0, rgb: 1, inline: 0 },

};
const allowedException = /design-token-exempt:\s*(platform-brand|fixed-asset|data-color)\b/;
const hexPattern = /#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})\b/gi;
const rgbPattern = /\brgba?\s*\(/gi;
const arbitraryPattern = /\[(?:background|color|border|box-shadow|fill|stroke|font-size):[^\]]+\]/gi;
function family(file) {
  if (/^(?:core|components\/layout|components\/shell)\//.test(file)) return 'shell';
  if (/^(?:features\/Login|features\/Signup|features\/Auth|features\/ResetPassword|features\/VerifyEmail)/.test(file)) return 'auth';
  if (/Dashboard|calendar\//i.test(file) || file.startsWith('features/Calendar')) return 'dashboard-calendar';
  if (/composer|inbox|CaptionWriter/i.test(file)) return 'composer-inbox';
  if (/ROI|Analytics|Reports|StatCard/i.test(file)) return 'analytics-roi';
  if (/bots|bot\//i.test(file)) return 'bot-editor';
  if (/marketing|HomePage|PostIdeas/i.test(file)) return 'marketing-public';
  if (/settings/i.test(file)) return 'settings';
  return 'other';
}
function analyze(content) {
  const lines = content.split(/\r?\n/);
  const ordinary = lines.filter(line => !allowedException.test(line)).join('\n');
  return {
    hex: (ordinary.match(hexPattern) || []).length,
    rgb: (ordinary.match(rgbPattern) || []).length,
    inline: (content.match(/style=\{\{/g) || []).length,
    arbitrary: (content.match(arbitraryPattern) || []).length,
    styleTags: (content.match(/<style(?:\s|>)/g) || []).length,
    exceptions: lines.filter(line => allowedException.test(line)).length,
  };
}
function walk(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute, result);
    else if (/\.(?:js|jsx|ts|tsx|css)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name))
      result.push(absolute);
  }
  return result;
}
if (process.argv.includes('--self-test')) {
  const assert = require('node:assert/strict');
  assert.equal(analyze("color: '#00d7ff'; background: rgba(1,2,3,.5); style={{ opacity: 0.4 }}").hex, 1);
  assert.equal(analyze("// design-token-exempt: platform-brand #1877f2").hex, 0);
  assert.equal(analyze("['[background:#ffffff]', '[color:var(--brand-primary)]']").arbitrary, 2);
  console.log('Design-token scanner self-test passed.');
  process.exit(0);
}
const rows = walk(sourceRoot).map(file => {
  const relative = path.relative(sourceRoot, file).split(path.sep).join('/');
  return { path: 'frontend/src/' + relative, family: family(relative), ...analyze(fs.readFileSync(file, 'utf8')) };
}).sort((a, b) => a.path.localeCompare(b.path));
const byFamily = {};
for (const row of rows) {
  const summary = byFamily[row.family] ||= { files: 0, hex: 0, rgb: 0, inline: 0, arbitrary: 0, styleTags: 0 };
  summary.files += 1;
  for (const key of ['hex', 'rgb', 'inline', 'arbitrary', 'styleTags']) summary[key] += row[key];
}
const violations = [];
for (const row of rows) {
  const relative = row.path.replace('frontend/src/', '');
  if (relative === 'styles/tokens.css') continue; // canonical definitions
  if (row.hex > (migratedBudgets[relative]?.hex ?? ceilings[relative] ?? 0)) {
    violations.push(`${row.path}: ${row.hex} raw colors exceed ${migratedBudgets[relative]?.hex ?? ceilings[relative] ?? 0}`);
  }
  const budget = migratedBudgets[relative];
  if (budget) for (const key of ['rgb','inline']) if (row[key] > budget[key])
    violations.push(`${row.path}: ${key} count ${row[key]} exceeds migrated budget ${budget[key]}`);
}
const report = {
  version: 1, baseInventory: 'docs/brand/ravinta/RAW_COLOR_INVENTORY.json',
  totals: { files: rows.length, ...Object.fromEntries(['hex','rgb','inline','arbitrary','styleTags'].map(k => [k,rows.reduce((n,r)=>n+r[k],0)])) },
  families: byFamily, rows, violations,
};
if (process.argv.includes('--report')) console.log(JSON.stringify(report, null, 2));
else console.log(JSON.stringify({ totals: report.totals, families: byFamily, violations }, null, 2));
if (process.argv.includes('--check') && violations.length) process.exitCode = 1;
