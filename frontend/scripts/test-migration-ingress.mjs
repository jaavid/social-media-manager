// Local test ingress models the allowlist in docker/next-routes.conf using built assets.
import { createServer, request } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const build = resolve('build');
const migrated = /^\/(privacy|terms|login|pending|admin\/account-settings|dashboard\/account-settings)\/?$/;
createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (migrated.test(pathname) || pathname.startsWith('/_next/')) {
    const proxy = request({ hostname: '127.0.0.1', port: 3001, path: req.url, method: req.method, headers: req.headers }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(proxy); return;
  }
  const candidate = resolve(build, `.${pathname}`);
  const file = candidate.startsWith(`${build}/`) && existsSync(candidate) && statSync(candidate).isFile()
    ? candidate : resolve(build, 'index.html');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(3120, '127.0.0.1');
