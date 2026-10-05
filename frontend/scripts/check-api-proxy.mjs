import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { WebSocket, WebSocketServer } = require('next/dist/compiled/ws');
// Isolated fake upstream: verifies transport behavior, not Django authorization.
const upstream = http.createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const pathname = new URL(request.url, 'http://localhost').pathname;
  // Django's APPEND_SLASH: losing the slash creates a redirect to the same
  // public URL. Assert the first response rather than following the loop.
  if (/^\/api\/auth\/(session|login|logout|me)$/.test(pathname)) {
    response.writeHead(301, { Location: `${pathname}/` });
    response.end();
    return;
  }
  const code = Number(pathname.match(/\/status\/(\d+)/)?.[1]) || 200;
  response.writeHead(pathname.endsWith('/redirect') ? 307 : code, {
    'Content-Type': pathname.endsWith('/download') ? 'text/csv' : 'application/json',
    'Retry-After': '3', 'X-Upstream-Contract': 'preserved',
    'Set-Cookie': 'contract=value; Path=/; HttpOnly; SameSite=Lax',
    ...(pathname.endsWith('/redirect') ? { Location: '/api/__contract__/status/200' } : {}),
    ...(pathname.endsWith('/download') ? { 'Content-Disposition': 'attachment; filename="export.csv"' } : {}),
  });
  response.end(pathname.endsWith('/download') ? 'id,name\n1,Example\n' : JSON.stringify({
    url: request.url, method: request.method, body: body.toString(), contentType: request.headers['content-type'], cookie: request.headers.cookie, csrfToken: request.headers['x-csrftoken'],
  }));
});
const sockets = new WebSocketServer({ server: upstream, path: '/ws/__contract__/' });
sockets.on('connection', socket => socket.on('message', message => socket.send(message)));
await new Promise((resolve, reject) => upstream.listen(8000, '127.0.0.1', resolve).once('error', reject));
const mode = process.argv.includes('--dev') ? 'dev' : process.argv.includes('--standalone') ? 'standalone' : 'production';
const args = mode === 'standalone' ? ['scripts/start-next.mjs'] : ['node_modules/next/dist/bin/next', mode === 'dev' ? 'dev' : 'start', '--port', '3101', ...(mode === 'dev' ? ['--webpack'] : [])];
const mismatch = process.argv.includes('--mismatch');
const child = spawn(process.execPath, args, { env: { ...process.env, PORT: '3101', NEXT_BACKEND_URL: mismatch ? 'http://127.0.0.1:8001' : 'http://127.0.0.1:8000' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; }); child.stderr.on('data', chunk => { logs += chunk; });
const base = 'http://127.0.0.1:3101';
const check = (condition, label) => { if (!condition) throw new Error(label); };
try {
  if (mismatch) {
    for (let attempt = 0; attempt < 100 && !logs.includes('differs from the built API rewrite'); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    check(logs.includes('differs from the built API rewrite'), 'Build/runtime mismatch was not diagnosed');
    const response = await fetch(`${base}/api/__contract__/status/200`, { signal: AbortSignal.timeout(5000) });
    check(response.ok, 'Built rewrite destination changed at runtime');
    console.log('Build/runtime API destination mismatch diagnosed; rewrite remains fixed to the build destination.');
  } else {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { await fetch(`${base}/api/__contract__/status/200`, { signal: AbortSignal.timeout(1000) }); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  check(ready, 'Next did not start');
  for (const endpoint of ['session', 'me', 'login', 'logout']) {
    const response = await fetch(`${base}/api/auth/${endpoint}/?contract=slash`, {
      method: ['login', 'logout'].includes(endpoint) ? 'POST' : 'GET', redirect: 'manual',
      headers: { Cookie: 'sessionid=opaque-contract; csrftoken=csrf-contract', 'X-CSRFToken': 'csrf-contract' },
    });
    check(response.status === 200, `${endpoint}: trailing slash lost (status ${response.status})`);
    const payload = await response.json();
    check(payload.url === `/api/auth/${endpoint}/?contract=slash`, `${endpoint}: path/query changed`);
    check(payload.cookie.includes('sessionid=opaque-contract') && payload.csrfToken === 'csrf-contract', `${endpoint}: session/CSRF headers lost`);
  }
  for (const prefix of ['api', 'media', 'backend', 'static']) {
    for (const suffix of ['nested/path', 'nested/path/', 'file.csv', '']) {
      const path = `/${prefix}/${suffix}`;
      const response = await fetch(`${base}${path}`, { redirect: 'manual' });
      check(response.status === 200 && (await response.json()).url === path, `Proxy path changed: ${path}`);
    }
  }
  for (const status of [200, 401, 403, 404, 429, 500, 503]) {
    const response = await fetch(`${base}/api/__contract__/status/${status}`);
    check(response.status === status, `Status ${status} changed`);
    check(response.headers.get('retry-after') === '3', 'Retry-After lost');
    check(response.headers.get('set-cookie')?.includes('HttpOnly'), 'Cookie forwarding lost');
  }
  const redirect = await fetch(`${base}/api/__contract__/redirect`, { redirect: 'manual' });
  check(redirect.status === 307 && redirect.headers.get('location') === '/api/__contract__/status/200', 'Redirect forwarding changed');
  const form = new FormData(); form.append('caption', 'متن فارسی'); form.append('file', new Blob(['upload data']), 'test.txt');
  const upload = await (await fetch(`${base}/api/__contract__/upload`, { method: 'POST', body: form, headers: { Cookie: 'sessionid=opaque-contract' } })).json();
  check(upload.method === 'POST' && upload.body.includes('upload data') && upload.body.includes('متن فارسی') && upload.contentType.startsWith('multipart/form-data; boundary='), 'Multipart changed');
  check(upload.cookie === 'sessionid=opaque-contract', 'Request cookie lost');
  const download = await fetch(`${base}/media/__contract__/download`);
  check(download.headers.get('content-disposition')?.includes('export.csv') && (await download.text()).includes('Example'), 'Download changed');
  const ws = new WebSocket('ws://127.0.0.1:3101/ws/__contract__/');
  await Promise.race([once(ws, 'open'), new Promise((_, reject) => setTimeout(() => reject(new Error('WebSocket upgrade failed')), 5000))]);
  ws.send('cookie-session-transport');
  const [message] = await once(ws, 'message'); check(message.toString() === 'cookie-session-transport', 'WebSocket payload changed'); ws.close();
  console.log(`${mode}: status, headers/cookies, redirect, multipart, download and WebSocket proxy contracts passed.`);
  }
} catch (error) { console.error(logs); throw error; }
finally { child.kill('SIGTERM'); for (const socket of sockets.clients) socket.terminate(); sockets.close(); upstream.closeAllConnections(); upstream.close(); }
