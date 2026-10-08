import { test, expect } from '@playwright/test';
import { enMessages as en, faMessages as fa } from '../src/i18n/messages';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const stamp = '2026-10-07T10:00:00Z';
const preferences = { events: [{ id: 'post_published', label: 'Post published' }], channels: [{ id: 'email', label: 'Email' }], matrix: [{ event_type: 'post_published', email: false }] };
const business = { id: 7, name: 'Fixture', company: 'Synthetic workspace', email: 'fixture@example.test', phone: '', whatsapp_number: '', website: '', gmb_url: '', business_category: '', brand_description: '', usp: '', brand_tone: '', target_audience: '', gender: 'all', business_location: '', business_subcategories: [], target_locations: [], competitors: [], brand_assets: {}, profile_image: null };
const alert = { id: 4, message: 'Synthetic alert', alert_type: 'sync_failed', is_read: false, created_at: stamp, client_name: 'Synthetic workspace', platform: '' };
const paths = { agency: '/api/profile/agency/', business: '/api/workspaces/7/', preferences: '/api/notifications/preferences/', alerts: '/api/alerts/' };
async function fixture(page, family, language = 'en', theme = 'light') {
  const base = test.info().project.use.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  const state = { status: 0, malformed: false, writeStatus: 0, malformedWrite: false, writes: 0, writeBody: null, delay: 0, user: 1, workspace: 7, bodies: { agency: { connected: true, agency_name: 'Synthetic agency', agency_email: 'agency@example.test', agency_since: null }, business, preferences, alerts: [alert] } };
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }, { name: 'theme', value: theme, url: base }]);
  await page.addInitScript(locale => { localStorage.setItem('socialstats.language', locale); localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })); }, language);
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path === '/api/auth/me/') return route.fulfill({ json: { id: state.user, role: family === 'agency' ? 'client' : 'superadmin', account_type: 'legacy', client_id: state.workspace, workspace_id: state.workspace, email: 'fixture@example.test', permissions: {} } });
    if (path === '/api/public/lookups/') return route.fulfill({ json: {} });
    if (path === '/api/profile/') return route.fulfill({ json: { id: state.user, first_name: 'Fixture', last_name: 'User', email: 'fixture@example.test', avatar: null } });
    if (req.method() !== 'GET' && (path === paths[family] || path === '/api/profile/disconnect-agency/' || /\/alerts\/.*mark.*\/$/.test(path))) {
      state.writes++; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      const dto = family === 'agency' ? { detail: 'Successfully disconnected from agency.', session: true } : family === 'preferences' ? { updated: 1 } : family === 'business' ? state.writeBody || business : { status: 'ok' };
      return route.fulfill(state.writeStatus ? { status: state.writeStatus, json: {} } : { json: state.malformedWrite ? {} : dto });
    }
    if (path === paths[family]) {
      const dto = state.bodies[family]; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      return route.fulfill(state.status ? { status: state.status, json: {} } : { json: state.malformed ? {} : dto });
    }
    return route.fulfill({ json: [] });
  });
  return state;
}
async function open(page, family) {
  const prefix = family === 'agency' ? '/dashboard' : '/admin';
  if (family === 'alerts') { await page.goto('/admin/analytics/alerts'); return page.locator('main'); }
  if (family === 'business') { await page.goto('/admin/workspace/7/settings'); await page.getByRole('tab', { name: 'Business Profile', exact: true }).click(); return page.locator('main'); }
  await page.goto(`${prefix}/account-settings`);
  await page.locator('main').getByRole('button', { name: family === 'agency' ? 'Agency' : 'Notifications', exact: true }).click();
  return page.getByRole('region', { name: en[family === 'agency' ? 'agency.title' : 'preferences.title'], exact: true });
}
for (const family of ['agency', 'business', 'preferences', 'alerts']) for (const status of [403, 404, 429, 503, 'malformed']) {
  test(`${family} initial ${status} never fabricates a healthy state`, async ({ page }) => {
    const state = await fixture(page, family); if (status === 'malformed') state.malformed = true; else state.status = status;
    const area = await open(page, family); const retry = area.getByRole('button', { name: en['recovery.retry'], exact: true });
    await expect(retry).toBeVisible();
    if (family === 'agency') await expect(area.getByText(en['agency.none'])).toHaveCount(0);
    if (family === 'preferences') await expect(area.getByRole('checkbox')).toHaveCount(0);
    if (family === 'business') await expect(area.getByLabel('Your Name', { exact: true })).toHaveCount(0);
    if (family === 'alerts') await expect(area.getByText('All alerts have been read.')).toHaveCount(0);
    state.status = 0; state.malformed = false; await retry.click();
    await expect(family === 'agency' ? area.getByText('Synthetic agency') : family === 'preferences' ? area.getByRole('checkbox') : family === 'business' ? area.getByLabel('Your Name', { exact: true }) : area.getByText('Synthetic alert')).toBeVisible();
  });
}
test('preferences retains draft on refresh failure and malformed PUT, no reconnect replay', async ({ page, context }) => {
  const state = await fixture(page, 'preferences'); const area = await open(page, 'preferences'); const checkbox = area.getByRole('checkbox'); await checkbox.check(); state.status = 503;
  await area.getByRole('button', { name: en['recovery.refresh'] }).click(); await expect(area.getByText(en['recovery.stale'])).toBeVisible(); await expect(checkbox).toBeChecked();
  state.malformedWrite = true; await area.getByRole('button', { name: en['preferences.save'] }).click(); await expect(area.getByText(en['account.uncertain'])).toBeVisible(); await expect(checkbox).toBeChecked(); await context.setOffline(true); await context.setOffline(false); expect(state.writes).toBe(1);
});
test('agency malformed disconnect keeps confirmation and locks replay until verified read', async ({ page }) => {
  const state = await fixture(page, 'agency'); const area = await open(page, 'agency'); await area.getByRole('button', { name: en['agency.disconnect'] }).click(); const dialog = page.getByRole('alertdialog'); await expect(dialog.getByRole('button', { name: en['recovery.cancel'] })).toBeFocused(); state.malformedWrite = true; state.delay = 600;
  await dialog.getByRole('button', { name: en['agency.disconnect'] }).dblclick(); await expect(dialog.getByText(en['agency.unknown'])).toBeVisible(); expect(state.writes).toBe(1); state.delay = 0; state.bodies.agency = { connected: false }; await dialog.getByRole('button', { name: en['account.checkStatus'] }).click(); await expect(area.getByText(en['agency.observed'])).toBeVisible(); expect(state.writes).toBe(1);
});
test('business background failure preserves inputs and healthy connected-accounts tab', async ({ page }) => {
  const state = await fixture(page, 'business'); const area = await open(page, 'business'); const field = area.getByLabel('Your Name', { exact: true }); await field.fill('Retained draft'); state.malformedWrite = true;
  await area.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(area.getByText(en['account.uncertain'])).toBeVisible(); await expect(field).toHaveValue('Retained draft');
  await page.getByRole('tab', { name: 'Connect Accounts', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible(); expect(state.writes).toBe(1);
});
for (const family of ['agency', 'preferences']) for (const [language, theme, width] of [['fa', 'dark', 360], ['en', 'light', 1440]]) {
  test(`safe settings evidence ${family} ${language}`, async ({ page }) => {
    const state = await fixture(page, family, language, theme); state.status = 503; await page.setViewportSize({ width, height: 900 });
    await page.goto(`${family === 'agency' ? '/dashboard' : '/admin'}/account-settings`); await page.locator('main').getByRole('button', { name: family === 'agency' ? 'Agency' : 'Notifications', exact: true }).click();
    if (!process.env.E2E_UI_BASELINE) await expect(page.getByRole('button', { name: (language === 'fa' ? fa : en)['recovery.retry'], exact: true })).toBeVisible(); else await page.waitForTimeout(1500);
    await page.screenshot({ path: `e2e/evidence/settings-notification/${family}-${process.env.E2E_UI_BASELINE ? 'before' : 'after'}-${language}-${theme}-${width}.png`, fullPage: true });
  });
}

for (const family of ['agency', 'business', 'preferences', 'alerts']) test(`${family} 401 follows terminal session policy`, async ({ page }) => {
  const state = await fixture(page, family); state.status = 401;
  await page.goto(family === 'agency' ? '/dashboard/account-settings' : family === 'business' ? '/admin/workspace/7/settings' : family === 'alerts' ? '/admin/analytics/alerts' : '/admin/account-settings');
  if (family === 'agency' || family === 'preferences') await page.locator('main').getByRole('button', { name: family === 'agency' ? 'Agency' : 'Notifications', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
test('slow preferences reader exposes status while shell stays usable', async ({ page }) => {
  const state = await fixture(page, 'preferences'); state.delay = 2000;
  const area = await open(page, 'preferences'); await expect(area.getByRole('status')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(area.getByRole('checkbox')).toBeVisible();
});

test('business acknowledgment accepts nested jsonb key reordering without unlocking unknown outcomes', async ({ page }) => {
  const state = await fixture(page, 'business');
  state.bodies.business = { ...business, brand_assets: { colors: { primary: 'fixture-a', secondary: 'fixture-b' }, entries: [{ z: 1, a: true }] } };
  state.writeBody = { ...business, brand_assets: { entries: [{ a: true, z: 1 }], colors: { secondary: 'fixture-b', primary: 'fixture-a' } } };
  const area = await open(page, 'business');
  await expect(area.getByLabel('Your Name', { exact: true })).toHaveValue('Fixture');
  await area.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(area.getByText(en['account.saved'])).toBeVisible();
  await expect(area.getByText(en['account.uncertain'])).toHaveCount(0);
  expect(state.writes).toBe(1);
});
