import { test, expect } from '@playwright/test';
import { enMessages as copy, faMessages } from '../src/i18n/messages';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const key = { id: 1, name: 'Synthetic key', key_prefix: 'sk_live_AAAA', scopes: [], ip_allowlist: [], is_active: true, is_expired: false, created_at: '2026-10-07T10:00:00Z', revoked_at: null, expires_at: null, last_used_at: null, use_count: 0 };
async function fixture(page, family) {
  const state = { status: 0, malformed: false, writes: 0, writeStatus: 0, malformedWrite: false, delay: 0, social: false, active: false };
  page.recoveryFixture = state;
  await page.context().addCookies([{ name: 'socialstats.language', value: 'en', url: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000' }]);
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname, write = route.request().method() === 'POST';
    if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path === '/api/auth/me/') return route.fulfill({ json: { id: 1, role: 'superadmin', workspace_id: 7, client_id: 7, account_type: 'legacy', email: 'fixture@example.test', permissions: {} } });
    if (path === '/api/auth/mfa/status/') return route.fulfill({ json: { enabled: false, pending: false, backup_codes_remaining: 0, last_used_at: null } });
    if (path === '/api/auth/sessions/') return route.fulfill({ json: { sessions: [], count: 0 } });
    if (path === '/api/profile/change-password/' || path === '/api/api-keys/1/revoke/' || (path === '/api/api-keys/' && write)) {
      state.writes++; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      return route.fulfill(state.writeStatus ? { status: state.writeStatus, json: {} } : { json: state.malformedWrite ? {} : path.includes('change-password') ? { detail: 'Password changed successfully.' } : { ok: true } });
    }
    if ((family === 'keys' && path === '/api/api-keys/') || (family === 'password' && state.active && path === '/api/profile/')) {
      if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      return route.fulfill(state.status ? { status: state.status, json: {} } : { json: state.malformed ? {} : family === 'keys' ? { keys: [key] } : { id: 1, first_name: 'Fixture', last_name: 'User', avatar: null, email: 'fixture@example.test', is_social: state.social } });
    }
    if (path === '/api/profile/') return route.fulfill({ json: { id: 1, first_name: 'Fixture', last_name: 'User', avatar: null, email: 'fixture@example.test' } });
    return route.fulfill({ json: [] });
  });
  return state;
}
async function open(page, family) {
  await page.goto('/admin/account-settings');
  await expect(page.getByLabel(copy['profile.first'], { exact: true })).toBeVisible();
  page.recoveryFixture.active = true;
  await page.getByRole('button', { name: family === 'keys' ? 'API Keys' : 'Account & Security', exact: true }).click();
  return page.getByRole('region', { name: copy[family === 'keys' ? 'keys.title' : 'password.title'], exact: true });
}
for (const family of ['keys', 'password']) for (const status of [401, 403, 404, 429, 503, 'malformed']) {
  test(`${family} initial ${status} has recovery and no false state`, async ({ page }) => {
    const state = await fixture(page, family); if (status === 'malformed') state.malformed = true; else state.status = status;
    const area = await open(page, family);
    if (status === 401) {
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('region', { name: copy[family === 'keys' ? 'keys.title' : 'password.title'], exact: true })).toHaveCount(0);
      return;
    }
    await expect(area.getByRole('button', { name: copy['recovery.retry'], exact: true })).toBeVisible();
    await expect(area.getByText(copy['keys.empty'])).toHaveCount(0);
    if (family === 'password') await expect(area.getByLabel(copy['password.current'])).toHaveCount(0);
    state.status = 0; state.malformed = false; await area.getByRole('button', { name: copy['recovery.retry'], exact: true }).click();
    await expect(family === 'keys' ? area.getByText(key.name) : area.getByLabel(copy['password.current'])).toBeVisible();
    await expect(area.getByRole('heading')).toBeFocused();
  });
}
test('keys background failure retains rows and draft, offline reconnect does not write', async ({ page, context }) => {
  const state = await fixture(page, 'keys'); const area = await open(page, 'keys'); await expect(area.getByText(key.name)).toBeVisible(); await area.getByLabel(copy['keys.name']).fill('retained'); state.status = 503;
  await area.getByRole('button', { name: copy['recovery.refresh'] }).click(); await expect(area.getByText(copy['recovery.stale'])).toBeVisible(); await expect(area.getByText(key.name)).toBeVisible(); await expect(area.getByLabel(copy['keys.name'])).toHaveValue('retained');
  await context.setOffline(true); await context.setOffline(false); expect(state.writes).toBe(0);
});
test('password ambiguous result retains inputs, locks duplicate and never reconciles by profile', async ({ page, context }) => {
  const state = await fixture(page, 'password'); const area = await open(page, 'password'); await area.getByLabel(copy['password.current']).fill('synthetic-current'); await area.getByLabel(copy['password.new'], { exact: true }).fill('synthetic-new'); await area.getByLabel(copy['password.confirm']).fill('synthetic-new'); state.malformedWrite = true;
  await area.getByRole('button', { name: copy['password.submit'] }).click(); await expect(area.getByText(copy['password.unknown'])).toBeVisible(); await expect(area.getByLabel(copy['password.new'], { exact: true })).toHaveValue('synthetic-new'); await expect(area.getByRole('button', { name: copy['password.submit'] })).toBeDisabled();
  await context.setOffline(true); await context.setOffline(false); expect(state.writes).toBe(1); await expect(area.getByText(copy['password.saved'])).toHaveCount(0);
});
test('revoke pending guard and malformed response never announce success', async ({ page }) => {
  const state = await fixture(page, 'keys'); const area = await open(page, 'keys'); await expect(area.getByText(key.name)).toBeVisible(); await area.getByRole('button', { name: copy['keys.revoke'] }).click(); const dialog = page.getByRole('alertdialog'); await expect(dialog.getByRole('button', { name: copy['recovery.cancel'] })).toBeFocused(); state.delay = 700; state.malformedWrite = true;
  await dialog.getByRole('button', { name: copy['keys.revoke'] }).dblclick(); await expect(dialog.getByText(copy['keys.unknownRevoke'])).toBeVisible(); expect(state.writes).toBe(1); await expect(area.getByText(copy['account.saved'])).toHaveCount(0);
});
for (const family of ['keys', 'password']) for (const [language, theme, width] of [['fa', 'dark', 360], ['en', 'light', 1440]]) {
  test(`safe recovery evidence ${family} ${language} ${theme}`, async ({ page }) => {
    const state = await fixture(page, family);
    const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }, { name: 'theme', value: theme, url: base }]);
    await page.addInitScript(locale => { localStorage.setItem('socialstats.language', locale); localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })); }, language);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/account-settings');
    await expect(page.getByLabel(language === 'fa' ? 'نام' : 'First name', { exact: true })).toBeVisible();
    state.active = true; state.status = 503;
    await page.getByRole('button', { name: family === 'keys' ? 'API Keys' : 'Account & Security', exact: true }).click();
    if (!process.env.E2E_UI_BASELINE) await expect(page.getByRole('button', { name: language === 'fa' ? faMessages['recovery.retry'] : copy['recovery.retry'], exact: true })).toBeVisible();
    else await page.waitForTimeout(1500);
    await page.screenshot({ path: `e2e/evidence/key-password/${family}-${process.env.E2E_UI_BASELINE ? 'before' : 'after'}-${language}-${theme}-${width}.png`, fullPage: true });
  });
}
