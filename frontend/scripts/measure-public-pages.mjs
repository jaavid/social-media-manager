import { chromium } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
const origin = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch();
const results = [];
for (const route of ['/privacy', '/product/analytics', '/']) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1365, height: 900 } });
  await context.addInitScript(() => {
    // Time the first React commit using the same hook protocol as React DevTools.
    window.__publicReactCommits = [];
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { this.renderers.set(1, renderer); return 1; },
      onCommitFiberRoot() { window.__publicReactCommits.push(performance.now()); },
      onCommitFiberUnmount() {}, checkDCE() {},
    };
  });
  const page = await context.newPage();
  const scripts = new Map();
  const pending = [];
  let authRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/auth/me/') authRequests++; });
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  page.on('response', response => {
    if (response.request().resourceType() !== 'script') return;
    pending.push(response.body().then(body => scripts.set(response.url(), body)).catch(() => {}));
  });
  await page.goto(origin + route, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__publicReactCommits.length > 0);
  await Promise.all(pending);
  const timings = await page.evaluate(() => ({
    firstReactCommitMs: Math.round(window.__publicReactCommits[0]),
    commits: window.__publicReactCommits.length,
  }));
  results.push({ route, scriptFiles: scripts.size,
    scriptBytes: [...scripts.values()].reduce((sum, body) => sum + body.length, 0),
    scriptGzipBytes: [...scripts.values()].reduce((sum, body) => sum + gzipSync(body).length, 0),
    authRequests, ...timings });
  if (process.env.MEASURE_SCREENSHOT_PREFIX) await page.screenshot({ path: `${process.env.MEASURE_SCREENSHOT_PREFIX}-${route === '/' ? 'home' : route.split('/')[1]}.png`, animations: 'disabled' });
  await context.close();
}
await browser.close();
const json = JSON.stringify({ origin, results }, null, 2) + '\n';
if (process.env.MEASURE_OUTPUT) await writeFile(process.env.MEASURE_OUTPUT, json);
process.stdout.write(json);
