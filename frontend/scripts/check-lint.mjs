import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
const results = await new ESLint().lintFiles(['src']);
const current = {};
for (const result of results) for (const item of result.messages) {
  const key = `${path.relative(process.cwd(), result.filePath)}:${item.ruleId || 'directive'}`;
  current[key] = (current[key] || 0) + 1;
}
const baselinePath = new URL('./lint-baseline.json', import.meta.url);
if (process.argv.includes('--write-baseline')) fs.writeFileSync(baselinePath, JSON.stringify({
  owner: 'frontend maintainers', policy: 'No new warnings per file/rule. Hooks correctness and TypeScript any remain errors; compiler recommendations are warnings until the React Compiler decision in #98.', warnings: current,
}, null, 2) + '\n');
const baseline = JSON.parse(fs.readFileSync(baselinePath)).warnings;
const added = Object.entries(current).filter(([key, count]) => count > (baseline[key] || 0));
const errors = results.reduce((count, r) => count + r.errorCount, 0);
console.log(`${results.length} files linted; ${Object.values(current).reduce((a, b) => a + b, 0)} visible baseline findings; ${errors} errors; ${added.length} file/rule regressions.`);
if (added.length || errors) {
  console.error((await new ESLint().loadFormatter('stylish')).format(results.filter(r => r.errorCount || r.messages.some(m => added.some(([key]) => key === `${path.relative(process.cwd(), r.filePath)}:${m.ruleId || 'directive'}`)))));
  process.exitCode = 1;
}
