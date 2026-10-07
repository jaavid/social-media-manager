import { test, expect } from '@playwright/test';
import { enMessages, faMessages } from '../src/i18n/messages';
const log = {
  id: 1,
  platform: 'fixture',
  status: 'success',
  client_name: 'Verified workspace',
  records_synced: 0,
  started_at: '2026-10-07T10:00:00Z',
  duration_seconds: null,
  error_message: 'private-provider-token',
};
const session = {
  id: 5,
  browser: 'Fixture browser',
  os: 'Test OS',
  device: 'Desktop',
  ip: null,
  last_used_at: log.started_at,
  is_active: true,
};
async function setup(page, family, language = 'en', theme = 'light') {
  const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  await page.context().addCookies([
    { name: 'socialstats.language', value: language, url: base },
    { name: 'theme', value: theme, url: base },
  ]);
  await page.addInitScript(() =>
    localStorage.setItem(
      'socialstats_cookie_choice',
      JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }),
    ),
  );
  await page.routeWebSocket('**/ws/**', (socket) => socket.close());
  const state = {
    status: 0,
    malformed: false,
    rows: family === 'logs' ? [log] : [session],
    slow: false,
    release: null,
    writes: 0,
    reads: 0,
    writeStatus: 503,
    malformedWrite: false,
    userId: 1,
    workspace: 7,
  };
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path.endsWith('/auth/session/'))
      return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
    if (path.endsWith('/auth/me/'))
      return route.fulfill({
        json: {
          id: state.userId,
          role: 'superadmin',
          account_type: 'legacy',
          workspace_id: state.workspace,
          client_id: state.workspace,
          email: 'fixture@example.test',
          permissions: {},
        },
      });
    if (path.includes('/revoke')) {
      state.writes++;
      if (state.holdWrite)
        await new Promise((done) => {
          state.releaseWrite = done;
        });
      if (state.writeStatus)
        return route.fulfill({ status: state.writeStatus, json: { error: 'private-token' } });
      if (state.malformedWrite) return route.fulfill({ json: {} });
      state.rows = state.rows.map((row) => ({ ...row, is_active: false }));
      return route.fulfill({ json: { ok: true, revoked: 1 } });
    }
    if (path === (family === 'logs' ? '/api/synclogs/' : '/api/auth/sessions/')) {
      state.reads++;
      const rows = state.rows;
      if (state.slow)
        await new Promise((done) => {
          state.release = done;
        });
      if (state.status)
        return route.fulfill({
          status: state.status,
          headers: { 'Retry-After': '3', 'X-Request-ID': '0123456789abcdef0123456789abcdef' },
          json: { detail: 'private-token' },
        });
      return route.fulfill({
        json: state.malformed
          ? {}
          : family === 'logs'
            ? rows
            : { sessions: rows, count: rows.length },
      });
    }
    if (path === '/api/profile/')
      return route.fulfill({
        json: {
          id: state.userId,
          first_name: 'Fixture',
          last_name: 'User',
          email: 'fixture@example.test',
          avatar: null,
        },
      });
    if (path === '/api/auth/mfa/status/') return route.fulfill({ json: { enabled: false } });
    return route.fulfill({ json: [] });
  });
  return state;
}
async function open(page, family) {
  await page.goto(family === 'logs' ? '/admin/analytics/synclogs' : '/admin/account-settings');
  if (family === 'sessions')
    await page.getByRole('button', { name: /Account & Security|حساب.*امنیت/ }).click();
}
const surface = (page, family, copy = enMessages) =>
  page.getByRole('region', {
    name: copy[family === 'logs' ? 'syncLogs.title' : 'sessions.title'],
    exact: true,
    includeHidden: true,
  });
for (const family of ['logs', 'sessions']) {
  for (const status of [401, 403, 404, 429, 503])
    test(`${family}: initial ${status} is recoverable without false empty`, async ({ page }) => {
      const state = await setup(page, family);
      state.status = status;
      await open(page, family);
      if (status === 401) {
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByText('private-token')).toHaveCount(0);
        return;
      }
      const area = surface(page, family);
      await expect(area.locator('[data-data-state]')).toHaveAttribute(
        'data-data-state',
        status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'error',
      );
      await expect(area.locator('[data-data-state="empty"]')).toHaveCount(0);
      await expect(page.getByText('private-token')).toHaveCount(0);
      await expect(area.getByText('0123456789abcdef0123456789abcdef')).toBeVisible();
      if (status === 429) expect(state.reads).toBe(1);
      state.status = 0;
      await area.getByRole('button', { name: enMessages['recovery.retry'], exact: true }).click();
      await expect(
        family === 'logs'
          ? area.getByRole('cell', { name: 'Verified workspace', exact: true })
          : area.getByText('Fixture browser · Test OS · Desktop', { exact: true }),
      ).toBeVisible();
    });
  test(`${family}: slow read, malformed refresh, offline/reconnect and denial preserve the shell`, async ({
    page,
    context,
  }) => {
    const state = await setup(page, family);
    state.slow = true;
    await open(page, family);
    const area = surface(page, family);
    await expect(area.locator('[data-data-state="loading"]')).toHaveAttribute('aria-busy', 'true');
    await expect(area.locator('[data-data-state="empty"]')).toHaveCount(0);
    await expect.poll(() => !!state.release).toBe(true);
    state.slow = false;
    state.release();
    const row =
      family === 'logs'
        ? area.getByRole('cell', { name: 'Verified workspace', exact: true })
        : area.getByText('Fixture browser · Test OS · Desktop', { exact: true });
    await expect(row).toBeVisible();
    state.malformed = true;
    await area.getByRole('button', { name: enMessages['recovery.refresh'], exact: true }).click();
    await expect(area.locator('[data-data-state="stale"]')).toBeVisible();
    await expect(row).toBeVisible();
    state.malformed = false;
    await context.setOffline(true);
    await area.getByRole('button', { name: enMessages['recovery.refresh'], exact: true }).click();
    await expect(area.locator('[data-data-state="offline"]')).toBeVisible();
    await expect(row).toBeVisible();
    await context.setOffline(false);
    await expect(area.locator('[data-data-state="offline"]')).toHaveCount(0);
    await expect(row).toBeVisible();
    state.status = 403;
    await area.getByRole('button', { name: enMessages['recovery.refresh'], exact: true }).click();
    await expect(area.locator('[data-data-state="forbidden"]')).toBeVisible();
    await expect(row).toHaveCount(0);
    await expect(page.locator('header').first()).toBeVisible();
  });
  test(`${family}: initial malformed response is not empty and recovers`, async ({ page }) => {
    const state = await setup(page, family);
    state.malformed = true;
    await open(page, family);
    const area = surface(page, family);
    await expect(area.locator('[data-data-state="error"]')).toBeVisible();
    await expect(area.locator('[data-data-state="empty"]')).toHaveCount(0);
    state.malformed = false;
    await area.getByRole('button', { name: enMessages['recovery.retry'], exact: true }).click();
    await expect(area.locator('[data-data-state="error"]')).toHaveCount(0);
  });
}
test('logs: no-results differs from empty; refresh failure preserves selected filters and records', async ({
  page,
}) => {
  const state = await setup(page, 'logs');
  await open(page, 'logs');
  const area = surface(page, 'logs');
  await expect(area.getByRole('table')).toBeVisible();
  await expect(page.getByText('private-provider-token')).toHaveCount(0);
  await area.getByLabel(enMessages['syncLogs.status'], { exact: true }).selectOption('failed');
  await expect(area.locator('[data-data-state="no-results"]')).toBeVisible();
  await area.getByLabel(enMessages['syncLogs.status'], { exact: true }).selectOption('success');
  state.status = 503;
  await area.getByRole('button', { name: enMessages['recovery.refresh'], exact: true }).click();
  await expect(area.locator('[data-data-state="stale"]')).toBeVisible();
  await expect(area.getByRole('table')).toBeVisible();
  await expect(area.getByLabel(enMessages['syncLogs.status'], { exact: true })).toHaveValue(
    'success',
  );
  state.status = 0;
  state.rows = [];
  await area.getByRole('button', { name: enMessages['recovery.retry'], exact: true }).click();
  await expect(area.locator('[data-data-state="empty"]')).toBeVisible();
});
for (const writeStatus of [403, 404, 429, 503, 'malformed'])
  test(`sessions: ${writeStatus} revoke never claims success or replays on reconnect`, async ({
    page,
    context,
  }) => {
    const state = await setup(page, 'sessions');
    state.writeStatus = writeStatus === 'malformed' ? 0 : writeStatus;
    state.malformedWrite = writeStatus === 'malformed';
    await open(page, 'sessions');
    const area = surface(page, 'sessions');
    await area.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByRole('button', { name: enMessages['recovery.cancel'] })).toBeFocused();
    await dialog.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(page.getByText(enMessages['sessions.revoked'], { exact: true })).toHaveCount(0);
    await expect(area.getByText('Fixture browser · Test OS · Desktop')).toBeVisible();
    await expect(page.getByText('private-token')).toHaveCount(0);
    await context.setOffline(true);
    await context.setOffline(false);
    expect(state.writes).toBe(1);
    state.writeStatus = 0;
    state.malformedWrite = false;
    await dialog.getByRole('button', { name: enMessages['recovery.retry'], exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }),
    ).toBeEnabled();
    await dialog.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(area.getByText(enMessages['sessions.inactive'], { exact: true })).toBeVisible();
    expect(state.writes).toBe(2);
    await expect(area.getByRole('heading', { name: enMessages['sessions.title'] })).toBeFocused();
  });
for (const family of ['logs', 'sessions'])
  for (const [language, theme, width] of [
    ['en', 'light', 1440],
    ['fa', 'dark', 360],
  ])
    test(`${family}: ${language}/${theme}/${width} keyboard recovery and reduced motion`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      const state = await setup(page, family, language, theme);
      const copy = language === 'fa' ? faMessages : enMessages;
      await open(page, family);
      const area = surface(page, family, copy);
      if (family === 'sessions') {
        await area.getByRole('button', { name: copy['sessions.revoke'], exact: true }).click();
        const dialog = page.getByRole('alertdialog');
        await expect(dialog.getByRole('button', { name: copy['recovery.cancel'] })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(
          area.getByRole('button', { name: copy['sessions.revoke'], exact: true }),
        ).toBeFocused();
      } else await expect(area.getByRole('table')).toBeVisible();
      state.status = 503;
      await area.getByRole('button', { name: copy['recovery.refresh'], exact: true }).click();
      await expect(area.locator('[data-data-state="stale"]')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `e2e/evidence/state-recovery/${family}-after-${language}-${theme}-${width}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });

for (const family of ['logs', 'sessions'])
  test(`${family}: account/workspace switch rejects a delayed private response`, async ({
    page,
  }) => {
    const state = await setup(page, family);
    await open(page, family);
    const area = surface(page, family);
    await expect(
      area.getByRole('button', { name: enMessages['recovery.refresh'], exact: true }),
    ).toBeEnabled();
    if (family === 'logs') await expect(area.getByRole('table')).toBeVisible();
    else await expect(area.getByText('Fixture browser · Test OS · Desktop')).toBeVisible();
    state.slow = true;
    state.rows =
      family === 'logs'
        ? [{ ...log, client_name: 'Obsolete private workspace' }]
        : [{ ...session, browser: 'Obsolete private browser' }];
    await area.getByRole('button', { name: enMessages['recovery.refresh'], exact: true }).click();
    await expect.poll(() => !!state.release).toBe(true);
    const release = state.release;
    state.slow = false;
    state.userId = 2;
    state.workspace = 9;
    state.rows =
      family === 'logs'
        ? [{ ...log, client_name: 'New workspace' }]
        : [{ ...session, browser: 'New browser' }];
    await page.evaluate(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'social-stats.session-changed',
          newValue: 'new-identity',
        }),
      ),
    );
    if (family === 'sessions')
      await page.getByRole('button', { name: /Account & Security/ }).click();
    const current = surface(page, family);
    await expect(
      family === 'logs'
        ? current.getByRole('cell', { name: 'New workspace', exact: true })
        : current.getByText('New browser · Test OS · Desktop'),
    ).toBeVisible();
    release();
    await expect(current.getByText(/Obsolete private/)).toHaveCount(0);
  });

test('sessions: slow revocation announces pending, locks dismissal and resolves uncertain completion by reading', async ({
  page,
}) => {
  const state = await setup(page, 'sessions');
  state.holdWrite = true;
  await open(page, 'sessions');
  const area = surface(page, 'sessions');
  await area.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  await expect(
    dialog.getByRole('button', { name: enMessages['sessions.revoke'], exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByRole('button', { name: enMessages['recovery.cancel'] })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect.poll(() => !!state.releaseWrite).toBe(true);
  state.releaseWrite();
  await expect(dialog.getByRole('alert')).toBeVisible();
  state.rows = [{ ...session, is_active: false }];
  await dialog.getByRole('button', { name: enMessages['recovery.retry'], exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes).toBe(1);
  await expect(area.getByRole('heading', { name: enMessages['sessions.title'] })).toBeFocused();
});
test('sessions: revoked authentication during mutation follows the existing session contract', async ({
  page,
}) => {
  const state = await setup(page, 'sessions');
  state.writeStatus = 401;
  await open(page, 'sessions');
  await surface(page, 'sessions')
    .getByRole('button', { name: enMessages['sessions.revoke'], exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: enMessages['sessions.revoke'], exact: true })
    .click();
  await expect(page).toHaveURL(/\/login/);
  expect(state.writes).toBe(1);
  await expect(page.getByText('private-token')).toHaveCount(0);
  await expect(page.getByText(enMessages['sessions.revoked'], { exact: true })).toHaveCount(0);
});
