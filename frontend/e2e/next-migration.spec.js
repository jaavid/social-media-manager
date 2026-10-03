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
  expect(html).toMatch(/<h1[^>]*>Privacy Policy<\/h1>/);
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
test('OAuth MFA callback preserves state across native App Router navigation', async ({ page }) => {
  await page.goto('/auth/callback?mfa_required=true&mfa_token=test-mfa');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('social-stats.navigation-handoff'))).toBeNull();
  await page.reload();
  await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible();
});
test('persisted English and dark theme apply after hydration', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('socialstats.language', 'en');
    localStorage.setItem('theme', 'dark');
  });
  await page.goto('/login');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('public native links preserve browser Back', async ({ page }) => {
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
  await expect(page).toHaveTitle('User Settings · Social Stats');
});

test('unknown routes and content slugs return HTTP 404', async ({ request }) => {
  for (const path of ['/not-a-real-route', '/blog/not-a-real-slug', '/product/not-a-real-slug', '/solutions/not-a-real-slug']) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
});

test('dynamic public pages render content and per-slug metadata on the server', async ({ request, page }) => {
  for (const path of ['/product/analytics', '/solutions/agencies']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<h1');
    if (path.startsWith('/product/')) expect(html).toContain('application/ld+json');
  }
  await page.goto('/product/analytics');
  await expect(page).toHaveTitle('Cross-platform analytics · Social Stats');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.reload();
  await expect(page.locator('h1')).toBeVisible();
  expect(errors).toEqual([]);
});

test('staff aliases and workspace parameters survive refresh', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-token'));
  await page.route('**/api/auth/me/', route => route.fulfill({ json: { id: 1, role: 'staff', email: 'staff@example.test', account_type: 'legacy', permissions: {} } }));
  await page.goto('/admin/clients');
  await expect(page).toHaveURL(/\/admin\/clients$/);
  await page.goto('/admin/workspaces');
  await page.reload();
  await expect(page).toHaveURL(/\/admin\/workspaces$/);
  await page.goto('/admin/workspace/42');
  await expect(page).toHaveURL(/\/admin\/workspace\/42$/);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

test('account-type guards direct end users to their own shell', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-token'));
  await page.route('**/api/auth/me/', route => route.fulfill({ json: { id: 2, role: 'client', email: 'end@example.test', account_type: 'end_user', workspace_id: 42, client_id: 42, permissions: {} } }));
  await page.goto('/agency/marketplace-profile');
  await expect(page).toHaveURL(/\/u$/);
  await expect(page.getByRole('link', { name: /Connections|اتصال/ }).first()).toBeVisible();
});

test('agency member retains its native marketplace profile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-token'));
  await page.route('**/api/auth/me/', route => route.fulfill({ json: { id: 3, role: 'client', email: 'agency@example.test', account_type: 'agency_member', primary_agency_slug: 'test-agency', workspace_id: 42, permissions: {} } }));
  await page.route('**/api/agency/test-agency/', route => route.fulfill({ json: { slug: 'test-agency', name: 'Test Agency', industries_served: [], services_offered: [] } }));
  await page.goto('/agency');
  await expect(page).toHaveURL(/\/agency\/marketplace-profile$/);
  await expect(page.locator('h1')).toBeVisible();
});

test('bot flow editor receives its dynamic ID and preserves fullscreen layout', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('access_token', 'test-token'));
  await page.route('**/api/auth/me/', route => route.fulfill({ json: { id: 1, role: 'staff', email: 'staff@example.test', account_type: 'legacy', permissions: {} } }));
  await page.route('**/api/bot-flows/42/', route => route.fulfill({ json: { id: 42, name: 'Cutover test flow', nodes: [], edges: [] } }));
  await page.goto('/admin/bot-flows/42/edit');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"]')).toHaveCount(0);
});
