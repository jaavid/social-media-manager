import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections.js';
const origin = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
const surface = page => page.locator('[data-connected-accounts]');
async function setup(page, { language = 'en', theme = 'light', role = 'superadmin', accountType = 'legacy', respond } = {}) {
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: origin }, { name: 'theme', value: theme, url: origin }]);
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })));
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role, account_type: accountType, workspace_id: 7, client_id: 7, permissions: {} } });
    if (url.pathname.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'test' } });
    if (/\/workspaces\/\d+\/$/.test(url.pathname)) return route.fulfill({ json: { id: Number(url.pathname.split('/')[3]), name: 'Workspace', company: 'Workspace', organization: 1 } });
    if (url.pathname.includes('/connections/')) return respond?.(route, url) || route.fulfill({ json: connectionFixture(Number(url.pathname.split('/')[3])) });
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
}
const open = page => page.goto('/admin/workspace/7/settings');
test('slow initial read, failed read, explicit retry and failed background refresh preserve the shell and identity', async ({ page }) => {
  let resolveInitial;
  let calls = 0;
  await setup(page, { respond: route => {
    calls += 1;
    if (calls === 1) return new Promise(resolve => { resolveInitial = () => resolve(route.fulfill({ status: 503, json: { code: 'unavailable' } })); });
    if (calls === 3) return route.fulfill({ status: 503, json: { code: 'unavailable' } });
    return route.fulfill({ json: connectionFixture() });
  } });
  await open(page);
  await expect(page.getByText('Loading connections…')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await resolveInitial();
  await expect(page.getByText('Connections could not be loaded.')).toBeVisible();
  await expect(page.getByText('No connected accounts yet.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(surface(page).getByText(/identity-10/)).toBeVisible();
  await surface(page).getByRole('button', { name: 'Refresh connections' }).click();
  await expect(page.getByText('Refresh failed. Showing previously loaded connections.')).toBeVisible();
  await expect(surface(page).getByText(/identity-10/)).toBeVisible();
  expect(calls).toBe(3);
});
for (const status of [403, 404, 429, 500]) {
  test(`initial ${status} is an explicit error, never a successful empty collection`, async ({ page }) => {
    await setup(page, { respond: route => route.fulfill({ status, json: { code: 'test' } }) }); await open(page);
    await expect(page.getByText(status === 403 ? 'You do not have access to these connections.' : 'Connections could not be loaded.')).toBeVisible();
    await expect(page.getByText('No connected accounts yet.')).toHaveCount(0);
  });
}
test('malformed and wrong-workspace payloads fail closed; successful empty is distinct', async ({ page }) => {
  let wire = { providers: [] };
  await setup(page, { respond: route => route.fulfill({ json: wire }) }); await open(page);
  await expect(page.getByText('Connections could not be loaded.')).toBeVisible();
  wire = connectionFixture(8); await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Connections could not be loaded.')).toBeVisible();
  wire = connectionFixture(); wire.providers[0].accounts = [];
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('No connected accounts yet.')).toBeVisible();
  await expect(surface(page).getByRole('button', { name: 'Add account' })).toBeVisible();
});
test('multiple account selection, revoked/unknown/stale health, reconnect input recovery and no automatic mutation replay', async ({ page }) => {
  let writes = 0;
  const payload = connectionFixture();
  payload.providers[0].accounts[0].health = { state: 'revoked', ready: false, code: 'reconnect_required' };
  await setup(page, { respond: (route, url) => {
    if (route.request().method() === 'POST') { writes++; expect(url.searchParams.get('account_id')).toBe('10'); return route.fulfill({ status: 503, json: { detail: 'PRIVATE-ERROR-MUST-NOT-DISPLAY' } }); }
    return route.fulfill({ json: payload });
  } }); await open(page);
  await expect(surface(page).getByText('Revoked · reconnect required')).toBeVisible();
  await surface(page).getByRole('combobox').selectOption('11');
  await expect(surface(page).getByText('Expired or expiring soon · reconnect required')).toBeVisible();
  await expect(surface(page).getByText('Last sync failed')).toBeVisible();
  await surface(page).getByRole('combobox').selectOption('10');
  await surface(page).getByRole('button', { name: 'Reconnect' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Test credential').fill('LOCAL-PRIVATE-INPUT');
  await dialog.getByLabel('Destination ID').fill('destination-10');
  await dialog.getByRole('button', { name: 'Verify and connect' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Your input is preserved');
  await expect(dialog.getByLabel('Test credential')).toHaveValue('LOCAL-PRIVATE-INPUT');
  await expect(page.getByText('PRIVATE-ERROR-MUST-NOT-DISPLAY')).toHaveCount(0);
  expect(writes).toBe(1);
  await page.keyboard.press('Escape');
  await expect(surface(page).getByRole('button', { name: 'Reconnect' })).toBeFocused();
  payload.providers[0].accounts[0].health = { state: 'unknown', ready: false, code: '' };
  payload.providers[0].accounts[0].sync.state = 'stale';
  await surface(page).getByRole('button', { name: 'Refresh connections' }).click();
  await expect(surface(page).getByText('Connection health unknown')).toBeVisible();
  await expect(surface(page).getByText('Sync stale')).toBeVisible();
});
test('disconnect confirms the selected account, preserves other accounts and reports failure', async ({ page }) => {
  let deletes = 0;
  await setup(page, { respond: (route, url) => {
    if (route.request().method() === 'DELETE') { deletes++; expect(url.searchParams.get('account_id')).toBe('11'); return route.fulfill({ status: 403, json: { code: 'permission_denied' } }); }
    return route.fulfill({ json: connectionFixture() });
  } }); await open(page);
  await surface(page).getByRole('combobox').selectOption('11');
  await surface(page).getByRole('button', { name: 'Disconnect', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText('Second account');
  await dialog.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  expect(deletes).toBe(1);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(surface(page).getByRole('combobox').locator('option')).toHaveCount(2);
});
test('rapid account and workspace navigation cannot reveal a late old-workspace result', async ({ page }) => {
  let finishOld;
  await setup(page, { respond: (route, url) => {
    if (url.pathname.includes('/workspaces/7/')) return new Promise(resolve => { finishOld = () => resolve(route.fulfill({ json: connectionFixture() }).catch(() => {})); });
    const data = connectionFixture(8); data.providers[0].titles.en = 'Workspace eight provider'; return route.fulfill({ json: data });
  } }); await open(page);
  await expect(page.getByText('Loading connections…')).toBeVisible();
  await page.goto('/admin/workspace/8/settings');
  await expect(surface(page).getByText('Workspace eight provider')).toBeVisible();
  await finishOld();
  await surface(page).getByRole('combobox').selectOption('11');
  await surface(page).getByRole('combobox').selectOption('10');
  await expect(surface(page).getByText(/identity-10/)).toBeVisible();
  await expect(surface(page).getByText('Contract example')).toHaveCount(0);
});
test('network outage preserves existing content and explicit retry recovers', async ({ page }) => {
  let failed = false;
  await setup(page, { respond: route => failed ? route.abort('internetdisconnected') : route.fulfill({ json: connectionFixture() }) }); await open(page);
  await expect(surface(page).getByText('Contract example')).toBeVisible(); failed = true;
  await surface(page).getByRole('button', { name: 'Refresh connections' }).click();
  await expect(page.getByText('Refresh failed. Showing previously loaded connections.')).toBeVisible();
  await expect(surface(page).getByText(/identity-10/)).toBeVisible(); failed = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Refresh failed. Showing previously loaded connections.')).toHaveCount(0);
});
for (const language of ['en', 'fa']) for (const theme of ['light', 'dark', 'system']) for (const width of [360, 768, 1440]) {
  test(`provider fixture visual and keyboard contract ${language}/${theme}/${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 }); await page.emulateMedia({ colorScheme: theme === 'light' ? 'light' : 'dark', reducedMotion: 'reduce' });
    await setup(page, { language, theme }); await open(page);
    await expect(surface(page).getByRole('heading', { name: language === 'fa' ? 'آزمایشی' : 'Contract example', exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme === 'system' ? 'dark' : theme);
    const overflow = await surface(page).evaluate(node => node.scrollWidth > node.clientWidth + 1); expect(overflow).toBe(false);
    const action = surface(page).getByRole('button', { name: language === 'fa' ? 'اتصال مجدد' : 'Reconnect', exact: true });
    await action.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').locator('input').first()).toBeFocused();
    await page.keyboard.press('Escape'); await expect(action).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`after-${language}-${theme}-${width}.png`), fullPage: true });
  });
}
test('the standard custom provider connects through its declared schema and refreshes without generic source changes', async ({ page }) => {
  const data = connectionFixture(); data.providers[0].accounts = [];
  let writes = 0;
  await setup(page, { respond: route => {
    if (route.request().method() === 'POST') {
      writes++;
      expect(route.request().postDataJSON()).toEqual({ token: 'test-credential', destination_id: 'new-destination' });
      data.providers[0].accounts = connectionFixture().providers[0].accounts;
      return route.fulfill({ status: 201, json: { success: true, account_id: 10 } });
    }
    return route.fulfill({ json: data });
  } }); await open(page);
  await surface(page).getByRole('button', { name: 'Add account' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Test credential').fill('test-credential');
  await dialog.getByLabel('Destination ID').fill('new-destination');
  await dialog.getByRole('button', { name: 'Verify and connect' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(surface(page).getByText(/identity-10/)).toBeVisible();
  expect(writes).toBe(1);
});
test('forbidden background refresh hides cached identities and denied actions stay absent', async ({ page }) => {
  let forbidden = false;
  const data = connectionFixture(); const provider = data.providers[0];
  provider.permissions.connect = false; provider.accounts.forEach(a => { a.permissions = { reconnect: false, disconnect: false }; });
  await setup(page, { respond: route => forbidden ? route.fulfill({ status: 403, json: { code: 'permission_denied' } }) : route.fulfill({ json: data }) });
  await open(page); await expect(surface(page).getByText(/identity-10/)).toBeVisible();
  await expect(surface(page).getByRole('button', { name: 'Reconnect' })).toHaveCount(0);
  await expect(surface(page).getByRole('button', { name: 'Disconnect' })).toHaveCount(0);
  forbidden = true; await surface(page).getByRole('button', { name: 'Refresh connections' }).click();
  await expect(page.getByText('You do not have access to these connections.')).toBeVisible();
  await expect(page.getByText(/identity-10/)).toHaveCount(0);
});
test('provider-owned Telegram settings follow the selected account and ignore a late previous response', async ({ page }) => {
  const data = connectionFixture(); data.providers[0].contract.ui_extensions = ['telegram_settings'];
  let finish;
  await setup(page, { respond: route => route.fulfill({ json: data }) });
  await page.route('**/api/telegram-accounts/**', route => {
    const settings = { destination_context: { destination_type: 'channel' }, assistant_enabled: false, assistant_rich: false, rich_enabled: true, webhook_enabled: false, last_update_at: null };
    if (route.request().url().includes('/10/')) return new Promise(resolve => { finish = () => resolve(route.fulfill({ json: { ...settings, rich_enabled: false } }).catch(() => {})); });
    return route.fulfill({ json: settings });
  });
  await open(page); await expect(surface(page).getByText('Loading connections…')).toBeVisible();
  await surface(page).getByLabel('Account / destination').selectOption('11');
  await expect(surface(page).getByText('Telegram topics and assistant')).toBeVisible();
  await expect(surface(page).getByLabel('Enable Rich Messages')).toBeChecked();
  await finish(); await expect(surface(page).getByLabel('Enable Rich Messages')).toBeChecked();
});
test('OAuth reconnect uses the same account-scoped internal flow and provider setup gates the action', async ({ page }) => {
  const data = connectionFixture(); const provider = data.providers[0];
  provider.auth_type = 'oauth2'; provider.contract.auth = { strategy: 'oauth2', fields: [], start_path: '/api/oauth/example/start/{workspace_id}/' };
  provider.readiness = { configured: true, missing: [] };
  let account;
  await setup(page, { respond: (route, url) => {
    if (url.pathname.endsWith('/contract_example/')) { account = url.searchParams.get('account_id'); return route.fulfill({ status: 200, contentType: 'text/plain', body: 'Provider consent fixture' }); }
    return route.fulfill({ json: data });
  } }); await open(page);
  await surface(page).getByRole('combobox').selectOption('11');
  await surface(page).getByRole('button', { name: 'Reconnect' }).click();
  await expect(page).toHaveURL(/\/api\/workspaces\/7\/connections\/contract_example\/\?account_id=11$/);
  expect(account).toBe('11');
});
test('end-user workspace lookup errors remain errors and retry distinguishes a successful absent workspace', async ({ page }) => {
  let failed = true;
  await setup(page, { role: 'client', accountType: 'end_user' });
  await page.route('**/api/end-user/me/', route => failed ? route.fulfill({ status: 503, json: { code: 'unavailable' } }) : route.fulfill({ json: { workspace: null } }));
  await page.goto('/u/connections');
  await expect(page.getByText('Connections could not be loaded.')).toBeVisible();
  await expect(page.getByText('Select a workspace to manage connections.')).toHaveCount(0);
  failed = false; await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Select a workspace to manage connections.')).toBeVisible();
});
test('a rejected browser session hides account identities and uses the existing login recovery', async ({ page }) => {
  await setup(page, { respond: route => route.fulfill({ status: 401, json: { code: 'authentication_required' } }) });
  await open(page);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/identity-10/)).toHaveCount(0);
});
