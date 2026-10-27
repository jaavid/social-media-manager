import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test.use({ launchOptions: { executablePath: process.env.DASHBOARD_CHROMIUM || undefined } });

const origin = new URL(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').origin;
const texts = {
  en: { heading: 'Your dashboard', failed: 'Workspace status could not be loaded', empty: 'No workspace is set up for this account yet', retry: 'Reload status', connections: 'View social connections', stats: 'Statistics are not available in this dashboard' },
  fa: { heading: 'داشبورد شما', failed: 'دریافت وضعیت فضای کاری ممکن نشد', empty: 'هنوز فضای کاری برای این حساب تنظیم نشده است', retry: 'دریافت دوباره وضعیت', connections: 'مشاهدهٔ اتصال‌های شبکه‌های اجتماعی', stats: 'آمار در این داشبورد در دسترس نیست' },
};
async function setup(page, { language = 'en', theme = 'light', state = 'workspace' } = {}) {
  const writes = []; let mode = state; let reads = 0;
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: origin }, { name: 'theme', value: theme, url: origin }]);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true, analytics: false, marketing: false } })));
  const user = { id: 1, email: 'owner@example.com', first_name: 'Test', role: 'client', account_type: 'end_user', workspace_id: state === 'empty' ? null : 10, permissions: {} };
  await page.route('**/api/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname;
    // Analytics can use an external /api/send URL; it is not a product mutation.
    if (url.origin !== origin) return route.fulfill({ status: 202, body: '' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(path);
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: user });
    if (path.endsWith('/end-user/me/')) {
      reads++;
      if (mode === 'error') return route.fulfill({ status: 503, json: { detail: 'Synthetic failure' } });
      return route.fulfill({ json: { user, workspace: mode === 'empty' ? null : { id: mode === 'mismatch' ? 20 : 10, company: 'برند آزمایشی · Synthetic brand' }, relations: { active: 0, pending: 2 } } });
    }
    return route.fulfill({ json: [] });
  });
  return { writes, setMode: value => { mode = value; }, reads: () => reads };
}

for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`dashboard states ${language} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const state of ['error', 'empty', 'workspace']) {
      await page.unrouteAll({ behavior: 'wait' });
      const fixture = await setup(page, { language, theme, state });
      await page.goto('/u'); const dashboard = page.locator('[data-end-user-dashboard]'); const copy = texts[language];
      await expect(dashboard.getByRole('heading', { level: 1 })).toHaveText(copy.heading);
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      if (state === 'error') {
        await expect(dashboard.getByRole('alert')).toContainText(copy.failed);
        await expect(dashboard.getByRole('button', { name: copy.retry })).toBeVisible();
        await expect(dashboard.getByRole('link')).toHaveCount(0);
        await expect(dashboard.getByText(copy.empty)).toHaveCount(0);
      } else if (state === 'empty') {
        await expect(dashboard.getByText(copy.empty)).toBeVisible();
        await expect(dashboard.getByRole('link')).toHaveAttribute('href', '/u/organizations');
        await expect(dashboard.locator('dd')).toHaveCount(0);
      } else {
        await expect(dashboard.getByText(copy.stats)).toBeVisible();
        await expect(dashboard.getByRole('link', { name: copy.connections })).toHaveAttribute('href', '/u/connections?workspace=10');
        await expect(dashboard.locator('dd')).toHaveText(language === 'fa' ? ['۰', '۲'] : ['0', '2']);
        await expect(dashboard.getByText('—', { exact: true })).toHaveCount(0);
      }
      const layout = await dashboard.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { viewport: window.innerWidth, right: rect.right, left: rect.left, scroll: element.scrollWidth, width: element.clientWidth };
      });
      expect(layout.left).toBeGreaterThanOrEqual(0); expect(layout.right).toBeLessThanOrEqual(layout.viewport + 1);
      expect(layout.scroll).toBeLessThanOrEqual(layout.width + 1);
      expect(fixture.writes).toEqual([]);
      if (process.env.DASHBOARD_EVIDENCE) {
        fs.mkdirSync(process.env.DASHBOARD_EVIDENCE, { recursive: true });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${process.env.DASHBOARD_EVIDENCE}/after-${state}-${language}-${theme}-${width}.png`, fullPage: true });
      }
    }
  });
}

test('dashboard recovery retries only the summary read and restores heading focus', { tag: '@smoke' }, async ({ page }) => {
  const fixture = await setup(page, { state: 'error' }); await page.goto('/u');
  const dashboard = page.locator('[data-end-user-dashboard]');
  await expect(dashboard.getByRole('alert')).toBeVisible(); expect(fixture.reads()).toBe(1);
  fixture.setMode('workspace');
  await dashboard.getByRole('button', { name: texts.en.retry }).focus();
  await page.keyboard.press('Enter');
  await expect(dashboard.getByText(texts.en.stats)).toBeVisible();
  await expect(dashboard.getByRole('heading', { level: 1 })).toBeFocused();
  expect(fixture.reads()).toBe(2); expect(fixture.writes).toEqual([]);
});

test('foreign workspace summary is hidden and does not expose its connections action', async ({ page }) => {
  await setup(page, { state: 'mismatch' }); await page.goto('/u');
  const dashboard = page.locator('[data-end-user-dashboard]');
  await expect(dashboard.getByText('This workspace summary is unavailable')).toBeVisible();
  await expect(dashboard.getByText('برند آزمایشی · Synthetic brand')).toHaveCount(0);
  await expect(dashboard.getByRole('link', { name: texts.en.connections })).toHaveCount(0);
});
