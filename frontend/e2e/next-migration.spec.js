import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const isList = /\/(workspaces|alerts|notifications|invitations)\/$/.test(path);
    return route.fulfill({ json: isList ? [] : {} });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
});
test('server-owned metadata and RTL survive hydration and public route navigation', async ({ page, request }) => {
  const html = await (await request.get('/privacy')).text();
  expect(html).toContain('<title>Privacy Policy · Social Stats</title>');
  expect(html).toContain('dir="rtl"');
  expect(html).not.toContain('access_token');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Privacy Policy · Social Stats');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.getByRole('link', { name: 'Terms', exact: true }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole('heading', { name: /Terms of Service/i, exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Terms of Service · Social Stats');
  expect(errors).toEqual([]);
});
test('anonymous protected route waits for session then redirects to login', async ({ page }) => {
  await page.goto('/admin/account-settings');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
test('client cannot render staff account settings', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-token'));
  await page.route('**/api/auth/me/', route => route.fulfill({ json: { role: 'client', account_type: 'legacy', client_id: 1 } }));
  await page.goto('/admin/account-settings');
  await expect(page).toHaveURL(/\/dashboard/);
});
test('OAuth MFA callback preserves state across the compatibility boundary', async ({ page }) => {
  await page.goto('/auth/callback?mfa_required=true&mfa_token=test-mfa');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('social-stats.navigation-handoff'))).toBeNull();
});
test('persisted English and dark theme apply before feature mount', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('socialstats.language', 'en');
    localStorage.setItem('theme', 'dark');
  });
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('retained Vite links hand migrated routes to ingress and browser Back still works', async ({ page }) => {
  await page.goto('/about');
  await page.getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page).toHaveTitle('Privacy Policy · Social Stats');
  await page.goBack();
  await expect(page).toHaveURL(/\/about$/);
});

test('staff session resolves before the native settings page is shown', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('socialstats.language', 'en');
  });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/me/', async route => {
    await gate;
    await route.fulfill({ json: { role: 'staff', name: 'Test Staff', email: 'staff@example.test', account_type: 'legacy', permissions: {} } });
  });
  await page.goto('/admin/account-settings');
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).not.toBeVisible();
  release();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Account settings · Social Stats');
});
