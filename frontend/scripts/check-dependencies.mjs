import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url)));
const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' });
const failures = [];
const packages = ['next', 'react', 'react-dom', '@types/react', '@types/react-dom'];
if (process.versions.node !== manifest.engines.node) failures.push(`Node must be ${manifest.engines.node}; found ${process.versions.node}`);
if (npmVersion.status !== 0 || npmVersion.stdout.trim() !== manifest.engines.npm) failures.push(`npm must be ${manifest.engines.npm}; found ${npmVersion.stdout.trim()}`);
for (const name of packages) {
  const section = name.startsWith('@types/') ? 'devDependencies' : 'dependencies';
  const declared = manifest[section][name];
  const locked = lock.packages[`node_modules/${name}`]?.version;
  const installed = JSON.parse(fs.readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url))).version;
  const copies = Object.keys(lock.packages).filter(key => key.endsWith(`node_modules/${name}`));
  if (copies.length !== 1) failures.push(`${name}: expected one lockfile resolution; found ${copies.length}`);
  if (declared !== locked || declared !== installed || lock.packages[''][section][name] !== declared) {
    failures.push(`${name}: manifest=${declared}, lock=${locked}, installed=${installed}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
// Validate installed peers; Next's vendored App Router React is outside this npm tree.
const tree = spawnSync('npm', ['ls', ...packages, '--parseable'], { encoding: 'utf8' });
if (tree.status !== 0) {
  console.error(tree.stderr || tree.error?.message);
  process.exit(tree.status ?? 1);
}
const installedPaths = [...new Set(tree.stdout.trim().split('\n').filter(Boolean))];
for (const name of packages) {
  const copies = installedPaths.filter(path => path.endsWith(`/node_modules/${name}`));
  if (copies.length !== 1) {
    console.error(`${name}: expected one installed copy; found ${copies.length}`);
    process.exit(1);
  }
  console.log(`${name}: ${lock.packages[`node_modules/${name}`].version} (one installed copy)`);
}
console.log(`Dependency contract verified: Node ${process.versions.node}, npm ${npmVersion.stdout.trim()}.`);
