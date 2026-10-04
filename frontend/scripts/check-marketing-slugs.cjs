const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const families = { product: ['productPages', 'productPages'], solutions: ['solutionPages', 'solutionPages'], customers: ['caseStudies', 'STUDIES'], blog: ['blogPosts', 'POSTS'], agencies: ['agencyProfiles', 'AGENCIES'] };
const result = {};
for (const [family, [file, variable]] of Object.entries(families)) {
  const ast = parse(fs.readFileSync(path.join(root, `src/features/marketing/${file}.js`), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  const declaration = ast.program.body.flatMap(n => (n.declaration || n).declarations || []).find(n => n.id.name === variable);
  if (!declaration) throw new Error(`Missing content family: ${family}`);
  result[family] = declaration.init.type === 'ObjectExpression'
    ? declaration.init.properties.map(n => n.key.name || n.key.value)
    : declaration.init.elements.map(n => n.properties.find(p => (p.key.name || p.key.value) === 'slug').value.value);
  result[family].sort();
}
const target = path.join(root, 'src/lib/marketing-slugs.json');
if (process.argv.includes('--write')) fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
else if (JSON.stringify(JSON.parse(fs.readFileSync(target))) !== JSON.stringify(result)) {
  console.error('Marketing slug drift: review content and run node scripts/check-marketing-slugs.cjs --write');
  process.exitCode = 1;
} else console.log('Proxy slug inventory matches authored marketing content.');
