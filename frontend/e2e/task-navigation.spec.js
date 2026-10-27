import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { legacyComposerConnections } from './composer-fixture';

test.use({ launchOptions: { executablePath: process.env.DASHBOARD_CHROMIUM || undefined } });
const origin = new URL(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').origin;
const evidence = process.env.NAV_EVIDENCE;
const phase = process.env.NAV_PHASE || 'after';
const permissions = ['dashboard.view', 'composer.view', 'composer.create', 'calendar.view', 'dashboard.posts_table', 'inbox.view', 'analytics.view', 'reports.view', 'composer.approve'];
async function setup(page, { language = 'en', theme = 'light', endUser = false, grants = permissions, accountPermissions } = {}) {
  const user = { id: 1, role: 'client', account_type: endUser ? 'end_user' : 'agency_member', workspace_id: 7,
    email: 'synthetic@example.test', permissions: Object.fromEntries(grants.map(code => [code, true])) };
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: origin }, { name: 'theme', value: theme, url: origin }]);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })));
  await page.context().route('**/api/**', route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    if (url.origin !== origin) return route.fulfill({ status: 202, body: '' });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: user });
    if (path.endsWith('/end-user/me/')) return route.fulfill({ json: { user, workspace: { id: 7, company: 'Synthetic brand A' }, relations: { active: 0, pending: 0 } } });
    if (/\/workspaces\/\d+\/connections\/$/.test(path)) {
      const wire = legacyComposerConnections(Number(path.split('/')[3]), 'telegram');
      if (accountPermissions) wire.providers.forEach(provider => provider.accounts.forEach(account => Object.assign(account.permissions, accountPermissions)));
      return route.fulfill({ json: wire });
    }
    if (/\/workspaces\/\d+\/$/.test(path)) return route.fulfill({ json: { id: Number(path.split('/')[3]), company: path.includes('/8/') ? 'Synthetic brand B' : 'Synthetic brand A' } });
    if (path.endsWith('/workspaces/')) return route.fulfill({ json: [{ id: 7, company: 'Synthetic brand A' }, { id: 8, company: 'Synthetic brand B' }] });
    if (path.includes('/approvals/')) return route.fulfill({ json: { count: 12, rows: [] } });
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
}
async function capture(page, name) {
  if (!evidence) return;
  fs.mkdirSync(evidence, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${evidence}/${phase}-${name}.png`, fullPage: true });
}
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`task navigation evidence ${language} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, { language, theme, endUser: true });
    await page.goto('/u');
    await expect(page.locator('[data-end-user-dashboard] h1')).toBeVisible();
    if (width < 881) await page.getByRole('button', { name: language === 'fa' ? 'باز کردن منو' : 'Open menu', exact: true }).click();
    await expect(width < 881 ? page.getByRole('dialog') : page.locator('.eu-sidebar')).toBeVisible();
    await capture(page, `end-user-${language}-${theme}-${width}`);
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.context().unrouteAll({ behavior: 'wait' });
    await setup(page, { language, theme });
    await page.goto('/dashboard/composer?workspace=7');
    await expect(page.locator('main')).toBeVisible();
    if (width < 881) await page.getByRole('button', { name: language === 'fa' ? 'باز کردن منو' : 'Open menu', exact: true }).click();
    await expect(page.locator('.ds-feature-sidebar')).toBeVisible();
    await expect(page.locator('.ds-feature-sidebar').getByRole('link', { name: language === 'fa' ? 'ساخت پست' : 'Create post', exact: true })).toBeVisible();
    await capture(page, `agency-${language}-${theme}-${width}`);
  });
}

for (const scenario of [
  { name: 'owner', endUser: true, grants: permissions },
  { name: 'invited designer', endUser: true, grants: ['composer.view'] },
  { name: 'invited approver', endUser: true, grants: ['composer.approve'] },
]) test(`${scenario.name}: unavailable end-user tasks are explained without dead links`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page, scenario); await page.goto('/u');
  const menu = page.locator('.eu-sidebar');
  await expect(menu.getByRole('link', { name: 'Calendar', exact: true })).toHaveAttribute('href', '/u/calendar?workspace=7');
  await expect(menu.locator('a[href*="/composer"], a[href*="/inbox"], a[href*="/reports"], a[href*="/billing"]')).toHaveCount(0);
  await menu.getByText('Unavailable in this interface', { exact: true }).click();
  await expect(menu.getByText('Post creation, messages and reports are not available here yet.', { exact: false })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Approval requests · all workspaces' })).toBeVisible();
  await expect(menu.getByText('12', { exact: true })).toHaveCount(0);
  await page.goto('/u/calendar?workspace=8');
  await expect(menu.locator('[data-workspace-context]')).toContainText('Synthetic brand B');
  await expect(menu.locator('[data-workspace-context]')).not.toContainText('Synthetic brand A');
  await expect(menu.getByRole('link', { name: 'Connections', exact: true })).toHaveAttribute('href', '/u/connections?workspace=8');
  await page.reload(); await expect(menu.locator('[data-workspace-context]')).toContainText('Synthetic brand B');
});

for (const scenario of [
  { name: 'agency with all core grants', grants: permissions, expected: ['Create post', 'Inbox', 'Reports'] },
  { name: 'designer', grants: ['composer.view', 'calendar.view'], expected: ['Create post'], accountPermissions: { view_inbox: false, generate_reports: false, publish: false, schedule: false } },
  { name: 'approver', grants: ['composer.approve', 'reports.view', 'calendar.view'], expected: ['Reports'], accountPermissions: { view_inbox: false, publish: false, schedule: false } },
  { name: 'revoked account permissions', grants: permissions, expected: [], accountPermissions: { view_posts: false, view_inbox: false, generate_reports: false } },
]) test(`${scenario.name}: sidebar, mobile and palette share granted destinations`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page, scenario); await page.goto('/dashboard/calendar?workspace=7');
  const sidebar = page.locator('.ds-feature-sidebar');
  await expect(sidebar.locator('[data-workspace-context]')).toContainText('Synthetic brand A');
  for (const name of ['Content & publishing', 'Messages', 'Analytics & reports']) {
    const group = sidebar.getByRole('button', { name, exact: true });
    if (await group.count() && await group.getAttribute('aria-expanded') === 'false') await group.click();
  }
  for (const name of ['Create post', 'Inbox', 'Reports']) {
    if (scenario.expected.includes(name)) await expect(sidebar.getByRole('link', { name, exact: true })).toBeVisible();
    else await expect(sidebar.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await expect(palette).toBeVisible();
  for (const name of ['Create post', 'Inbox', 'Reports']) {
    const entry = palette.locator('[cmdk-item]').filter({ has: page.locator('span', { hasText: new RegExp(`^${name}$`) }) });
    await expect(entry).toHaveCount(scenario.expected.includes(name) ? 1 : 0);
  }
  await expect(palette.locator('[cmdk-item]').filter({ hasText: 'Switch to workspace' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const name of scenario.expected) {
    const link = sidebar.getByRole('link', { name, exact: true });
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(new URL(href, origin).href);
    await expect(page.locator('main').getByRole('heading', { name: name === 'Create post' ? 'Composer' : name, exact: true })).toBeVisible();
  }
  await page.setViewportSize({ width: 360, height: 1000 });
  const bottom = page.locator('.ds-mobile-nav');
  for (const name of ['Create post', 'Inbox', 'Reports']) await expect(bottom.getByRole('link', { name, exact: true })).toHaveCount(scenario.expected.includes(name) ? 1 : 0);
});

test('workspace selection, alias and modified click preserve the active destination', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await setup(page);
  await page.goto('/dashboard/analytics/composer?workspace=7');
  await expect(page).toHaveURL(/\/dashboard\/composer\?workspace=7$/);
  const sidebar = page.locator('.ds-feature-sidebar');
  const create = sidebar.getByRole('link', { name: 'Create post', exact: true });
  await expect(create).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('combobox', { name: 'Choose workspace' }).selectOption('8');
  await expect(page).toHaveURL(/workspace=8/);
  await expect(sidebar.locator('[data-workspace-context]')).toContainText('Synthetic brand B');
  await expect(create).toHaveAttribute('href', '/dashboard/composer?workspace=8');
  await expect(create).toHaveAttribute('aria-current', 'page');
  const popupPromise = context.waitForEvent('page');
  await create.click({ modifiers: ['Control'] }); const popup = await popupPromise;
  await expect(popup).toHaveURL(/\/dashboard\/composer\?workspace=8$/);
  await expect(popup.getByRole('heading', { name: 'Composer', exact: true })).toBeVisible();
  await popup.close();
});

test('Back/Forward and reload retain the workspace and active inbox route', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await setup(page);
  await page.goto('/dashboard/composer?workspace=8');
  const sidebar = page.locator('.ds-feature-sidebar');
  await expect(sidebar.locator('[data-workspace-context]')).toContainText('Synthetic brand B');
  const messages = sidebar.getByRole('button', { name: 'Messages', exact: true });
  await expect(messages).toBeVisible();
  if (await messages.getAttribute('aria-expanded') === 'false') await messages.click();
  await expect(messages).toHaveAttribute('aria-expanded', 'true');
  const inbox = sidebar.getByRole('link', { name: 'Inbox', exact: true });
  await expect(inbox).toHaveAttribute('href', '/dashboard/inbox?workspace=8');
  await inbox.click();
  await expect(page).toHaveURL(/\/dashboard\/inbox\?workspace=8$/);
  await expect(inbox).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard\/composer\?workspace=8$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/dashboard\/inbox\?workspace=8$/);
  await page.reload();
  await expect(sidebar.locator('[data-workspace-context]')).toContainText('Synthetic brand B');
  await page.goto('/dashboard/reports?workspace=8');
  await expect(page.locator('main')).toBeVisible();
});

for (const language of ['fa', 'en']) test(`mobile end-user menu ${language} traps focus, restores trigger and follows scoped links`, async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 }); await setup(page, { endUser: true, language }); await page.goto('/u');
  const trigger = page.getByRole('button', { name: language === 'fa' ? 'باز کردن منو' : 'Open menu', exact: true });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const controls = await trigger.getAttribute('aria-controls'); expect(controls).toBeTruthy();
  await trigger.focus(); await page.keyboard.press('Enter');
  const drawer = page.getByRole('dialog'); await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(drawer).toHaveAttribute('id', controls);
  for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); expect(await drawer.evaluate(el => el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Escape'); await expect(drawer).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false'); await expect(trigger).toBeFocused();
  await trigger.click(); await page.getByRole('dialog').getByRole('link', { name: language === 'fa' ? 'تقویم' : 'Calendar', exact: true }).click();
  await expect(page).toHaveURL(/\/u\/calendar\?workspace=7$/); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a hidden discovery item does not replace backend-authorized direct access', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page, { grants: ['calendar.view'] });
  await page.goto('/dashboard/composer?workspace=7');
  await expect(page.locator('.ds-feature-sidebar').getByRole('link', { name: 'Create post', exact: true })).toHaveCount(0);
  // Backend metadata is explicitly readable in this fixture despite no legacy
  // menu grant; the existing direct destination remains reachable.
  await expect(page.getByRole('heading', { name: 'Composer', exact: true })).toBeVisible();
  await expect(page.locator('main').getByText('Accounts / destinations', { exact: true })).toBeVisible();
});

test('reports read the explicit workspace and never the session default after a switch', async ({ page }) => {
  await setup(page); const reads = [];
  await page.context().route('**/api/shared-reports/**', route => {
    reads.push(new URL(route.request().url()).searchParams.get('workspace'));
    return route.fulfill({ json: [] });
  });
  await page.goto('/dashboard/reports?workspace=8');
  await expect.poll(() => reads.at(-1)).toBe('8');
  expect(reads).not.toContain('7');
  await page.locator('main').getByRole('combobox', { name: 'Workspace', exact: true }).selectOption('7');
  await expect(page).toHaveURL(/workspace=7/);
  await expect.poll(() => reads.at(-1)).toBe('7');
});

test('agency discovery has one active menu destination', async ({ page }) => {
  await setup(page, { endUser: true }); await page.goto('/u/agency/find');
  const sidebar = page.locator('.eu-sidebar');
  await expect(sidebar.getByRole('link', { name: 'Find an agency', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'My agency', exact: true })).not.toHaveAttribute('aria-current');
  await expect(sidebar.locator('a[aria-current="page"]')).toHaveCount(1);
});
