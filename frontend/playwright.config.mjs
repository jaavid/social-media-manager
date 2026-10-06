import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 30000, workers: process.env.CI ? 2 : 1,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm start', url: 'http://127.0.0.1:3000/login', reuseExistingServer: !process.env.CI,
  },
});
