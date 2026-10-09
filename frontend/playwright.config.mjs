import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 30000, // Full browser coverage shares the existing ten-minute frontend job budget.
  testIgnore: 'refactor-visual.spec.js', // Platform-specific images have their own explicit runner.
  // Each worker has an isolated browser context and uses synthetic API fixtures.
  fullyParallel: true,
  workers: process.env.CI ? 4 : 1,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm start', url: 'http://127.0.0.1:3000/login', reuseExistingServer: !process.env.CI,
  },
});
