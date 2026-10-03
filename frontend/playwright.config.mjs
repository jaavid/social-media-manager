import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 30000, workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3120', trace: 'retain-on-failure' },
  webServer: process.env.E2E_BASE_URL ? undefined : [
    { command: 'npm run start:next', url: 'http://127.0.0.1:3001/login', reuseExistingServer: !process.env.CI },
    { command: 'node scripts/test-migration-ingress.mjs', url: 'http://127.0.0.1:3120/login', reuseExistingServer: !process.env.CI },
  ],
});
