/** Generate explicit App Router files from the reviewed pre-cutover URL inventory. */
const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'src');
const app = path.join(root, 'next/app');
const inventory = JSON.parse(fs.readFileSync(path.join(source, 'app/routes/routeInventory.json'), 'utf8'));
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
};
const generated = [];
const manifest = path.join(root, 'next/generated-routes.json');
const previous = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : [];
function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text);
  generated.push(path.relative(root, file).replaceAll('\\', '/'));
}
function importPath(from, to) { let p = path.relative(path.dirname(from), to).replaceAll('\\', '/'); return p.startsWith('.') ? p : './' + p; }
function attr(node, name) { return node.openingElement.attributes.find(a => a.name?.name === name)?.value; }
function staticMeta(route) {
  let title = route.component?.replace(/Page$/, '').replace(/([a-z])([A-Z])/g, '$1 $2') || 'Social Stats';
  let description = 'Manage analytics, content, conversations, and ads across your workspaces.';
  if (!route.source || route.component === 'RootRedirect') return { title: 'Social Stats — The marketing OS for modern teams', description };
  const ast = parse(fs.readFileSync(path.join(source, route.source), 'utf8'), { sourceType: 'module', plugins: ['jsx', 'typescript'] });
  walk(ast, node => {
    if (node.type !== 'JSXElement' || !['Meta', 'LegalPageLayout'].includes(node.openingElement.name.name)) return;
    const t = attr(node, 'title'); const d = attr(node, 'description') || attr(node, 'intro');
    if (t?.type === 'StringLiteral') title = t.value;
    if (d?.type === 'StringLiteral') description = d.value;
  });
  return { title, description };
}
// Extract only plain content identity for server metadata. Rich JSX stays in features.
function contentTable(file, variable) {
  const ast = parse(fs.readFileSync(path.join(source, file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  let content;
  walk(ast, node => { if (node.type === 'VariableDeclarator' && node.id.name === variable) content = node.init; });
  const records = content.type === 'ArrayExpression' ? content.elements.map(value => ({ value }))
    : content.properties.map(prop => ({ key: prop.key.name || prop.key.value, value: prop.value }));
  const result = {};
  for (const record of records) {
    const fields = Object.fromEntries(record.value.properties.filter(p => p.value?.type === 'StringLiteral').map(p => [p.key.name || p.key.value, p.value.value]));
    const slug = record.key || fields.slug;
    if (!slug) continue;
    result[slug] = {
      title: fields.seoTitle || fields.title || fields.name || slug,
      description: fields.seoDescription || fields.description || fields.heroSubtitle || fields.excerpt || fields.headline || fields.subtitle || '',
    };
  }
  return result;
}
const content = {
  product: contentTable('pages/marketing/productPages.js', 'productPages'),
  solutions: contentTable('pages/marketing/solutionPages.js', 'solutionPages'),
  customers: contentTable('pages/marketing/caseStudies.js', 'STUDIES'),
  blog: contentTable('pages/marketing/blogPosts.js', 'POSTS'),
  agencies: contentTable('pages/marketing/agencyProfiles.js', 'AGENCIES'),
};
write(path.join(root, 'next/route-content.json'), JSON.stringify(content, null, 2) + '\n');
for (const route of inventory.routes) {
  const segments = route.path.split('/').filter(Boolean).map(s => s.startsWith(':') ? `[${s.slice(1)}]` : s);
  let groups = [];
  if (route.roles?.includes('staff')) {
    groups = ['(staff)', 'admin', route.component === 'BotFlowEditorPage' ? '(fullscreen)' : '(shell)'];
    segments.shift();
  } else if (route.section === 'dashboard') { groups = ['(workspace)', 'dashboard']; segments.shift(); }
  else if (route.section === 'agency') { groups = ['(agency)', 'agency']; segments.shift(); }
  else if (route.section === 'end-user') { groups = ['(end-user)', 'u']; segments.shift(); }
  else if (route.path === '/pending') groups = ['(pending)'];
  const folder = path.join(app, ...groups, ...segments);
  const page = path.join(folder, 'page.jsx');
  const metaImport = importPath(page, path.join(root, 'next/metadata.mjs'));
  if (route.redirect) {
    const href = JSON.stringify(route.redirect);
    write(page, `// Generated from src/app/routes/routeInventory.json.\nimport { redirect } from 'next/navigation';\nexport default function Page() { redirect(${href}); }\n`);
    continue;
  }
  const view = path.join(folder, 'View.jsx');
  const sourceImport = importPath(view, path.join(source, route.source));
  const clientImport = importPath(view, path.join(source, 'app/session'));
  const paramsImport = importPath(view, path.join(source, 'app/navigation'));
  let viewText = `'use client';\nimport Feature from '${sourceImport}';\n`;
  let clientId = '';
  if (route.clientProp && route.clientScope === 'session') {
    viewText += `import { useSession } from '${clientImport}';\n`;
    clientId = '  const { user } = useSession();\n  const clientId = user?.workspace_id ?? user?.client_id ?? null;\n';
  } else if (route.clientProp && route.clientScope === 'params') {
    viewText += `import { useAppParams } from '${paramsImport}';\n`;
    clientId = '  const params = useAppParams();\n  const clientId = params.workspaceId ?? params.clientId;\n';
  } else if (route.clientProp) clientId = '  const clientId = null;\n';
  const props = Object.entries(route.props || {}).map(([key, value]) => ` ${key}={${JSON.stringify(value)}}`).join('') + (route.clientProp ? ' clientId={clientId}' : '');
  if (route.component === 'BotFlowEditorPage') {
    // Canvas/editor libraries deliberately remain browser-only, not the entire app.
    viewText = `'use client';\nimport dynamic from 'next/dynamic';\nconst Feature = dynamic(() => import('${sourceImport}'), { ssr: false });\n`;
  }
  viewText += `export default function View() {\n${clientId}  return <Feature${props} />;\n}\n`;
  write(view, viewText);
  const meta = staticMeta(route);
  const family = route.path.split('/')[1];
  const dynamicContent = route.path === `/${family}/:slug` && content[family];
  let pageText = `// Generated from src/app/routes/routeInventory.json.\nimport View from './View';\nimport { publicMetadata } from '${metaImport}';\n`;
  if (dynamicContent) {
    const tableImport = importPath(page, path.join(root, 'next/route-content.json'));
    pageText += `import content from '${tableImport}';\nimport { notFound } from 'next/navigation';\nconst entries = content[${JSON.stringify(family)}];\nexport const dynamicParams = false;\nexport function generateStaticParams() { return Object.keys(entries).map(slug => ({ slug })); }\nexport async function generateMetadata({ params }) {\n  const { slug } = await params;\n  const data = entries[slug];\n  if (!data) notFound();\n  return publicMetadata(data.title, data.description, '/${family}/' + slug);\n}\nexport default async function Page({ params }) {\n  const { slug } = await params;\n  if (!entries[slug]) notFound();\n  return <View />;\n}\n`;
  } else {
    pageText += `export const metadata = publicMetadata(${JSON.stringify(meta.title)}, ${JSON.stringify(meta.description)}, ${JSON.stringify(route.path)}, ${Boolean(route.roles || /^\/(auth|oauth|login|signup|verify-email|forgot-password|reset-password|report|invitation|invite|agency-invite)(\/|$)/.test(route.path))});\nexport default function Page() { return <View />; }\n`;
  }
  write(page, pageText);
}
// Remove only previously generated files when inventory routes are retired.
for (const stale of previous.filter(file => !generated.includes(file))) {
  if (!stale.startsWith('next/app/') || stale.includes('..')) throw new Error('Invalid generated route path');
  fs.rmSync(path.join(root, stale), { force: true });
}
fs.writeFileSync(manifest, JSON.stringify(generated.sort(), null, 2) + '\n');
console.log(`Generated ${inventory.routes.length} explicit App Router pages.`);
