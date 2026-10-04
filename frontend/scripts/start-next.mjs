import { cpSync } from 'node:fs';
import { spawn } from 'node:child_process';
// Match the production standalone image: Next does not copy public/static itself.
cpSync('next/.next/static', 'next/.next/standalone/next/.next/static', { recursive: true });
cpSync('next/public', 'next/.next/standalone/next/public', { recursive: true });
const child = spawn(process.execPath, ['next/.next/standalone/next/server.js'], {
  stdio: 'inherit', env: { ...process.env, PORT: process.env.PORT || '3000', HOSTNAME: '0.0.0.0' },
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 1));
