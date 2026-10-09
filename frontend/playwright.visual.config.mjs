import { defineConfig } from '@playwright/test';
import base from './playwright.config.mjs';

// Run against a production build. Baselines are specific to OS and browser.
export default defineConfig({
  ...base,
  testMatch: 'refactor-visual.spec.js',
  testIgnore: [],
  workers: 1,
  use: { ...base.use, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', threshold: 0.2, maxDiffPixels: 0 } },
});
