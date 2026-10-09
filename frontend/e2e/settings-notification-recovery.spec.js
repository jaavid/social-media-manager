import { test, expect } from '@playwright/test';
import { settingsFixture as fixture, business, preferences, alert, stamp, paths } from './settings-fixture';
import { enMessages as en, faMessages as fa } from '../src/i18n/messages';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
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
