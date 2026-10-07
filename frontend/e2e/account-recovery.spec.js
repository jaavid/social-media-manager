import { test, expect } from '@playwright/test';
import { enMessages, faMessages } from '../src/i18n/messages';
// Entirely synthetic fixtures. No screenshots/traces are recorded while secrets/codes are visible.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const stamp = '2026-10-07T10:00:00Z';
const disabled = { enabled: false, pending: false, backup_codes_remaining: 0, last_used_at: null };
const enabled = { ...disabled, enabled: true, backup_codes_remaining: 10 };
const codes = Array.from({ length: 10 }, (_, i) => String(i).padStart(10, '0'));
const seed = {
  secret: 'A'.repeat(32),
  qr_data_uri: 'data:image/png;base64,AAAA',
  otpauth_url: `otpauth://totp/fixture?secret=${'A'.repeat(32)}`,
};
const deletion = {
  id: 3,
  status: 'queued',
  requested_at: stamp,
  grace_until: '2026-11-06T10:00:00Z',
  cancelled_at: null,
  processed_at: null,
  reason: '',
};
const exported = {
  id: 4,
  status: 'queued',
  requested_at: stamp,
  completed_at: null,
  expires_at: null,
  size_bytes: 0,
  download_url: null,
};
const paths = {
  mfa: '/api/auth/mfa/status/',
  exports: '/api/privacy/export-request/',
  consents: '/api/privacy/consents/',
  processing: '/api/privacy/processing-status/',
  deletion: '/api/privacy/delete-account/',
};
const keys = {
  mfa: 'mfa.title',
  exports: 'privacy.exports',
  consents: 'privacy.consents',
  processing: 'privacy.processing',
  deletion: 'privacy.deletionTitle',
  immediate: 'privacy.immediateTitle',
};
const area = (page, family, copy = enMessages) =>
  page.getByRole('region', { name: copy[keys[family]], exact: true });
async function fixture(page, language = 'en', theme = 'light') {
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
    user: 1,
    workspace: 7,
    role: 'superadmin',
    errors: {},
    malformed: {},
    readCount: {},
    writes: {},
    writeStatus: 0,
    malformedWrite: false,
    bodies: {
      mfa: disabled,
      exports: { requests: [] },
      consents: {
        consents: { data_processing: true },
        available: [{ type: 'data_processing', label: 'Core data processing' }],
      },
      processing: {
        workspaces: [{ id: 7, name: 'Workspace fixture', is_processing_paused: false }],
      },
      deletion: { request: null },
    },
  };
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path.endsWith('/auth/session/') && req.method() === 'DELETE') {
      state.logouts = (state.logouts || 0) + 1;
      return route.fulfill(
        state.logoutStatus ? { status: state.logoutStatus, json: {} } : { status: 204 },
      );
    }
    if (path.endsWith('/auth/session/'))
      return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
    if (path.endsWith('/auth/me/'))
      return route.fulfill({
        json: {
          id: state.user,
          role: state.role,
          account_type: 'legacy',
          workspace_id: state.workspace,
          client_id: state.workspace,
          email: 'fixture@example.test',
          permissions: {},
        },
      });
    if (path === '/api/profile/' && req.method() === 'GET')
      return route.fulfill({
        json: {
          id: state.user,
          first_name: 'Fixture',
          last_name: 'User',
          email: 'fixture@example.test',
          avatar: null,
        },
      });
    if (path === '/api/auth/sessions/' && req.method() === 'GET')
      return route.fulfill({ json: { sessions: [], count: 0 } });
    const family = Object.keys(paths).find((k) => paths[k] === path);
    if (family && req.method() === 'GET') {
      state.readCount[family] = (state.readCount[family] || 0) + 1;
      const body = state.bodies[family];
      if (state.slowRead === family)
        await new Promise((done) => {
          state.releaseRead = done;
        });
      if (state.errors[family])
        return route.fulfill({
          status: state.errors[family],
          headers: { 'Retry-After': '3', 'X-Request-ID': '0123456789abcdef0123456789abcdef' },
          json: { error: 'private-token' },
        });
      return route.fulfill({ json: state.malformed[family] ? {} : body });
    }
    if (
      req.method() !== 'GET' &&
      (path.includes('/mfa/') ||
        path.includes('/privacy/') ||
        path === '/api/profile/delete-account/')
    ) {
      state.writes[path] = (state.writes[path] || 0) + 1;
      const body = req.postDataJSON();
      const capturedUser = state.user;
      if (state.slowWrite)
        await new Promise((done) => {
          state.releaseWrite = done;
        });
      if (state.writeStatus)
        return route.fulfill({ status: state.writeStatus, json: { error: 'private-token' } });
      if (state.malformedWrite) return route.fulfill({ json: {} });
      // The real API captures request.user; a delayed old write cannot mutate the fixture's new account.
      if (capturedUser !== state.user && path.endsWith('/privacy/delete-account/'))
        return route.fulfill({ json: deletion });
      let result;
      if (path.endsWith('/mfa/setup/')) {
        state.bodies.mfa = { ...disabled, pending: true };
        result = seed;
      }
      if (path.endsWith('/mfa/verify-setup/')) {
        state.bodies.mfa = enabled;
        result = { ok: true, backup_codes: codes };
      }
      if (path.endsWith('/mfa/regenerate-backup-codes/')) {
        result = { ok: true, backup_codes: codes, count: 10 };
      }
      if (path.endsWith('/mfa/disable/')) {
        state.bodies.mfa = disabled;
        result = { ok: true };
      }
      if (path.endsWith('/consents/')) {
        state.bodies.consents.consents[body.consent_type] = body.given;
        result = {
          ok: true,
          consent_type: body.consent_type,
          given: body.given,
          recorded_at: stamp,
        };
      }
      if (path.endsWith('/processing-status/')) {
        state.bodies.processing = {
          workspaces: [
            {
              id: body.workspace_id ?? body.client_id,
              name: 'Workspace fixture',
              is_processing_paused: body.paused,
            },
          ],
        };
        result = { ok: true, workspaces_affected: 1, is_processing_paused: body.paused };
      }
      if (path.endsWith('/export-request/')) {
        state.bodies.exports = { requests: [exported] };
        result = exported;
      }
      if (path.endsWith('/privacy/delete-account/')) {
        state.bodies.deletion = { request: deletion };
        result = deletion;
      }
      if (path.endsWith('/delete-account/cancel/')) {
        result = { ...deletion, status: 'cancelled', cancelled_at: stamp };
        state.bodies.deletion = { request: result };
      }
      if (path === '/api/profile/delete-account/')
        result = { detail: 'Your account has been permanently deleted.' };
      return route.fulfill({ json: result });
    }
    return route.fulfill({ json: [] });
  });
  return state;
}
async function open(page, family) {
  await page.goto(
    family === 'immediate' ? '/dashboard/account-settings' : '/admin/account-settings',
  );
  if (family !== 'immediate')
    await page
      .getByRole('button', {
        name: family === 'mfa' ? /Account & Security|حساب.*امنیت/ : /Data & Privacy|داده.*حریم/,
      })
      .click();
}
for (const family of Object.keys(paths)) {
  for (const status of [401, 403, 404, 429, 503, 'malformed'])
    test(`${family}: initial ${status} never guesses state; read recovery`, async ({ page }) => {
      const state = await fixture(page);
      if (status === 'malformed') state.malformed[family] = true;
      else state.errors[family] = status;
      await open(page, family);
      if (status === 401) {
        await expect(page).toHaveURL(/\/login/);
        return;
      }
      const section = area(page, family);
      await expect(section.locator('[data-data-state]')).toHaveAttribute(
        'data-data-state',
        status === 403 ? 'forbidden' : status === 404 ? 'not-found' : 'error',
      );
      await expect(section.locator('[data-data-state="empty"]')).toHaveCount(0);
      await expect(page.getByText('private-token')).toHaveCount(0);
      if (family === 'mfa')
        await expect(section.getByText(enMessages['mfa.disabled'])).toHaveCount(0);
      else
        await expect(
          area(page, family === 'processing' ? 'consents' : 'processing').getByRole('switch'),
        ).toBeVisible();
      if (status === 429) expect(state.readCount[family]).toBe(1);
      state.errors[family] = 0;
      state.malformed[family] = false;
      await section
        .getByRole('button', { name: enMessages['recovery.retry'], exact: true })
        .click();
      await expect(
        section.locator(
          '[data-data-state="error"], [data-data-state="forbidden"], [data-data-state="not-found"]',
        ),
      ).toHaveCount(0);
    });
  test(`${family}: slow load, background failure, malformed refresh, offline/reconnect and denied-data hiding`, async ({
    page,
    context,
  }) => {
    const state = await fixture(page);
    state.slowRead = family;
    await open(page, family);
    const section = area(page, family);
    await expect(section.locator('[data-data-state="loading"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
    await expect.poll(() => !!state.releaseRead).toBe(true);
    state.slowRead = null;
    state.releaseRead();
    await expect(
      section.getByRole('button', { name: enMessages['recovery.refresh'] }),
    ).toBeEnabled();
    for (const malformed of [false, true]) {
      state.errors[family] = malformed ? 0 : 503;
      state.malformed[family] = malformed;
      await section.getByRole('button', { name: enMessages['recovery.refresh'] }).click();
      await expect(section.locator('[data-data-state="stale"]')).toBeVisible();
      if (family === 'processing' || family === 'consents')
        await expect(section.getByRole('switch')).toBeVisible();
    }
    state.errors[family] = 0;
    state.malformed[family] = false;
    await context.setOffline(true);
    await section.getByRole('button', { name: enMessages['recovery.refresh'] }).click();
    await expect(section.locator('[data-data-state="offline"]').first()).toBeVisible();
    await context.setOffline(false);
    await expect(section.locator('[data-data-state="offline"]')).toHaveCount(0);
    state.errors[family] = 403;
    await section.getByRole('button', { name: enMessages['recovery.refresh'] }).click();
    await expect(section.locator('[data-data-state="forbidden"]')).toBeVisible();
    await expect(section.getByRole('switch')).toHaveCount(0);
    await expect(page.locator('header').first()).toBeVisible();
  });
}
async function enroll(page) {
  const section = area(page, 'mfa');
  await section.getByRole('button', { name: enMessages['mfa.setup'], exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: enMessages['account.confirm'] })
    .click();
  await section.getByLabel(enMessages['mfa.code']).fill('123456');
  return section;
}
test('MFA: enrollment input and issued codes survive failed refresh; clipboard rejects without false success', async ({
  page,
  context,
}) => {
  const state = await fixture(page);
  await open(page, 'mfa');
  const section = await enroll(page);
  state.errors.mfa = 503;
  await section.getByRole('button', { name: enMessages['recovery.refresh'] }).click();
  await expect(section.locator('[data-data-state="stale"]')).toBeVisible();
  await expect(section.getByLabel(enMessages['mfa.code'])).toHaveValue('123456');
  await section.getByRole('button', { name: enMessages['mfa.verify'] }).click();
  await expect(section.getByText(codes[0], { exact: true })).toBeVisible();
  await expect(section.locator('[data-data-state="stale"]')).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('fixture denied')) },
      configurable: true,
    }),
  );
  await section.getByRole('button', { name: enMessages['mfa.copy'] }).click();
  await expect(section.getByText(enMessages['mfa.copyFailed'])).toBeVisible();
  await expect(section.getByText(enMessages['mfa.copied'])).toHaveCount(0);
  await context.setOffline(true);
  await context.setOffline(false);
  await expect(section.getByText(codes[0], { exact: true })).toBeVisible();
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      href: location.href,
    }),
  );
  expect(storage).not.toContain(seed.secret);
  expect(storage).not.toContain(codes[0]);
});
for (const type of ['setup', 'verify', 'regenerate', 'disable'])
  test(`MFA: ${type} uncertain completion needs status; pending prevents duplicate or dismissal`, async ({
    page,
    context,
  }) => {
    const state = await fixture(page);
    if (['regenerate', 'disable'].includes(type)) state.bodies.mfa = enabled;
    await open(page, 'mfa');
    const section = area(page, 'mfa');
    if (type === 'verify') await enroll(page);
    else {
      await section.getByRole('button', { name: enMessages[`mfa.${type}`], exact: true }).click();
      if (type !== 'setup')
        await page.getByRole('alertdialog').getByLabel(enMessages['mfa.code']).fill('123456');
      if (type === 'disable')
        await page
          .getByRole('alertdialog')
          .getByLabel(enMessages['mfa.password'], { exact: true })
          .fill('fixture-password');
    }
    state.slowWrite = true;
    state.writeStatus = 503;
    const submit =
      type === 'verify'
        ? section.getByRole('button', { name: enMessages['mfa.verify'] })
        : page
            .getByRole('alertdialog')
            .getByRole('button', { name: enMessages['account.confirm'] });
    await submit.click();
    await expect(submit).toBeDisabled();
    if (type !== 'verify') {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('alertdialog')).toBeVisible();
    }
    await expect.poll(() => !!state.releaseWrite).toBe(true);
    state.slowWrite = false;
    state.releaseWrite();
    await expect(page.getByText(enMessages['mfa.uncertain'])).toBeVisible();
    await expect(submit).toBeDisabled();
    await context.setOffline(true);
    await context.setOffline(false);
    const path =
      type === 'verify'
        ? '/api/auth/mfa/verify-setup/'
        : type === 'regenerate'
          ? '/api/auth/mfa/regenerate-backup-codes/'
          : `/api/auth/mfa/${type}/`;
    expect(state.writes[path]).toBe(1);
    state.bodies.mfa =
      type === 'disable' ? disabled : type === 'setup' ? { ...disabled, pending: true } : enabled;
    await page.getByRole('button', { name: enMessages['account.checkStatus'] }).click();
    await expect(page.getByText(enMessages['mfa.uncertain'])).toHaveCount(0);
    if (['verify', 'regenerate'].includes(type))
      await expect(section.getByText(enMessages['mfa.lostCodes'])).toBeVisible();
    expect(state.writes[path]).toBe(1);
  });
for (const family of ['consents', 'processing', 'exports', 'deletion', 'immediate'])
  test(`${family}: malformed mutation preserves state and never replays on reconnect`, async ({
    page,
    context,
  }) => {
    const state = await fixture(page);
    state.malformedWrite = true;
    if (family === 'immediate') state.role = 'client';
    await open(page, family);
    const section = area(page, family);
    if (family === 'consents' || family === 'processing') await section.getByRole('switch').click();
    else if (family === 'exports')
      await section.getByRole('button', { name: enMessages['privacy.requestExport'] }).click();
    else {
      await section
        .getByRole('button', {
          name: enMessages[
            family === 'immediate' ? 'privacy.immediateTitle' : 'privacy.requestDeletion'
          ],
          exact: true,
        })
        .click();
      const dialog = page.getByRole('alertdialog');
      await dialog.getByLabel(enMessages['privacy.reason']).fill('fixture reason');
      await dialog.getByLabel(enMessages['privacy.typeDelete']).fill('DELETE');
      await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
      await expect(dialog.getByLabel(enMessages['privacy.reason'])).toHaveValue('fixture reason');
    }
    await expect(
      page.getByText(
        enMessages[family === 'immediate' ? 'privacy.immediateUnknown' : 'account.uncertain'],
      ),
    ).toBeVisible();
    await expect(page.getByText(enMessages['account.saved'])).toHaveCount(0);
    await expect(page.getByText(enMessages['privacy.deletionAccepted'])).toHaveCount(0);
    await context.setOffline(true);
    await context.setOffline(false);
    expect(Object.values(state.writes).reduce((a, b) => a + b, 0)).toBe(1);
  });
test('privacy: queued deletion survives remount; cancellation reconciles unknown result without another write', async ({
  page,
}) => {
  const state = await fixture(page);
  state.bodies.deletion = { request: deletion };
  state.writeStatus = 503;
  await open(page, 'deletion');
  const section = area(page, 'deletion');
  await section.getByRole('button', { name: enMessages['privacy.cancelDeletion'] }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  state.bodies.deletion = { request: { ...deletion, status: 'cancelled', cancelled_at: stamp } };
  await dialog.getByRole('button', { name: enMessages['account.checkStatus'] }).click();
  await expect(dialog).toHaveCount(0);
  await expect(section.getByText(/Cancelled/)).toBeVisible();
  expect(state.writes['/api/privacy/delete-account/cancel/']).toBe(1);
});
for (const family of ['mfa', 'processing'])
  test(`${family}: context switch aborts obsolete read and hides previous data`, async ({
    page,
  }) => {
    const state = await fixture(page);
    await open(page, family);
    const section = area(page, family);
    await expect(
      section.getByRole('button', { name: enMessages['recovery.refresh'] }),
    ).toBeEnabled();
    state.slowRead = family;
    await section.getByRole('button', { name: enMessages['recovery.refresh'] }).click();
    await expect.poll(() => !!state.releaseRead).toBe(true);
    const release = state.releaseRead;
    state.slowRead = null;
    state.user = 2;
    state.workspace = 9;
    state.bodies[family] =
      family === 'mfa'
        ? enabled
        : { workspaces: [{ id: 9, name: 'New workspace', is_processing_paused: true }] };
    await page.evaluate(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'social-stats.session-changed',
          newValue: 'fixture-new',
        }),
      ),
    );
    await page
      .getByRole('button', { name: family === 'mfa' ? /Account & Security/ : /Data & Privacy/ })
      .click();
    await expect(
      area(page, family).getByText(family === 'mfa' ? enMessages['mfa.enabled'] : 'New workspace', {
        exact: true,
      }),
    ).toBeVisible();
    release();
    await expect(
      area(page, family).getByText(
        family === 'mfa' ? enMessages['mfa.disabled'] : 'Workspace fixture',
        { exact: true },
      ),
    ).toHaveCount(0);
  });
for (const family of ['mfa', 'deletion', 'immediate'])
  for (const [language, theme, width] of [
    ['en', 'light', 1440],
    ['fa', 'dark', 360],
  ])
    test(`${family}: ${language}/${width} keyboard focus, reduced motion and safe evidence`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      const state = await fixture(page, language, theme);
      if (family === 'immediate') state.role = 'client';
      const copy = language === 'fa' ? faMessages : enMessages;
      await open(page, family);
      const section = area(page, family, copy);
      const trigger = section.getByRole('button', {
        name: copy[
          family === 'mfa'
            ? 'mfa.setup'
            : family === 'deletion'
              ? 'privacy.requestDeletion'
              : 'privacy.immediateTitle'
        ],
        exact: true,
      });
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByRole('button', { name: copy['recovery.cancel'] })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      if (family !== 'immediate') {
        state.errors[family] = 503;
        await section.getByRole('button', { name: copy['recovery.refresh'] }).click();
        await expect(section.locator('[data-data-state="stale"]')).toBeVisible();
      }
      await expect(page.locator('[data-mfa-sensitive]')).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `e2e/evidence/account-recovery/${family}-after-${language}-${theme}-${width}.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
for (const family of ['mfa', 'consents', 'deletion', 'immediate'])
  for (const status of [401, 403, 404, 429, 503])
    test(`${family}: mutation ${status} has no false success and retains recoverable input`, async ({
      page,
    }) => {
      const state = await fixture(page);
      state.writeStatus = status;
      if (family === 'mfa') state.bodies.mfa = enabled;
      if (family === 'immediate') state.role = 'client';
      await open(page, family);
      const section = area(page, family);
      if (family === 'consents') await section.getByRole('switch').click();
      else {
        await section
          .getByRole('button', {
            name: enMessages[
              family === 'mfa'
                ? 'mfa.disable'
                : family === 'deletion'
                  ? 'privacy.requestDeletion'
                  : 'privacy.immediateTitle'
            ],
            exact: true,
          })
          .click();
        const dialog = page.getByRole('alertdialog');
        if (family === 'mfa') {
          await dialog
            .getByLabel(enMessages['mfa.password'], { exact: true })
            .fill('fixture-password');
          await dialog.getByLabel(enMessages['mfa.code']).fill('123456');
        } else {
          await dialog.getByLabel(enMessages['privacy.reason']).fill('fixture reason');
          await dialog.getByLabel(enMessages['privacy.typeDelete']).fill('DELETE');
        }
        await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
      }
      if (status === 401) await expect(page).toHaveURL(/\/login/);
      else {
        const failureKey =
          status === 503
            ? family === 'mfa'
              ? 'mfa.uncertain'
              : family === 'immediate'
                ? 'privacy.immediateUnknown'
                : 'account.uncertain'
            : status === 429
              ? 'account.rateLimited'
              : 'account.writeFailed';
        await expect(page.getByText(enMessages[failureKey], { exact: true })).toBeVisible();
        await expect(page.getByText('private-token')).toHaveCount(0);
        await expect(page.getByText(enMessages['account.saved'])).toHaveCount(0);
        await expect(page.getByText(enMessages['privacy.deletionAccepted'])).toHaveCount(0);
        if (![403, 404].includes(status) && family !== 'consents')
          await expect(
            page
              .getByRole('alertdialog')
              .getByLabel(enMessages[family === 'mfa' ? 'mfa.password' : 'privacy.reason'], {
                exact: true,
              }),
          ).toHaveValue(family === 'mfa' ? 'fixture-password' : 'fixture reason');
      }
      await expect.poll(() => Object.values(state.writes).reduce((a, b) => a + b, 0)).toBe(1);
    });
test('privacy: validated consent/processing/export results survive failed subsequent reads', async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page, 'consents');
  for (const family of ['consents', 'processing', 'exports']) {
    state.errors[family] = 503;
    const section = area(page, family);
    if (family === 'exports')
      await section.getByRole('button', { name: enMessages['privacy.requestExport'] }).click();
    else await section.getByRole('switch').click();
    await expect(section.locator('[data-data-state="stale"]')).toBeVisible();
    if (family === 'consents') await expect(section.getByRole('switch')).not.toBeChecked();
    if (family === 'processing') await expect(section.getByRole('switch')).toBeChecked();
    if (family === 'exports') {
      await expect(section.getByText(/#4/)).toBeVisible();
      await expect(section.locator('[data-data-state="empty"]')).toHaveCount(0);
    }
  }
});
test('privacy: successful schedule/cancel locks slow submissions and restores focus', async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page, 'deletion');
  const section = area(page, 'deletion');
  await section.getByRole('button', { name: enMessages['privacy.requestDeletion'] }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel(enMessages['privacy.typeDelete']).fill('DELETE');
  state.slowWrite = true;
  await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
  await expect(dialog.locator('[data-data-state="refreshing"]')).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect(dialog.getByRole('button', { name: enMessages['recovery.cancel'] })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect.poll(() => !!state.releaseWrite).toBe(true);
  state.slowWrite = false;
  state.releaseWrite();
  await expect(dialog).toHaveCount(0);
  await expect(section.getByRole('heading', { level: 4 })).toBeFocused();
  await section.getByRole('button', { name: enMessages['privacy.cancelDeletion'] }).click();
  await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
  await expect(dialog).toHaveCount(0);
  await expect(section.getByText(/Cancelled/)).toBeVisible();
  expect(state.writes['/api/privacy/delete-account/']).toBe(1);
  expect(state.writes['/api/privacy/delete-account/cancel/']).toBe(1);
});
test('MFA: malformed code issuance cannot show an empty backup list or complete enrollment', async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page, 'mfa');
  const section = await enroll(page);
  state.malformedWrite = true;
  await section.getByRole('button', { name: enMessages['mfa.verify'] }).click();
  await expect(section.getByText(enMessages['mfa.uncertain'])).toBeVisible();
  await expect(section.getByLabel(enMessages['mfa.code'])).toHaveValue('123456');
  await expect(section.getByText(enMessages['mfa.saveCodes'])).toHaveCount(0);
});
test('privacy: context switch rejects a late deletion mutation and discards its private draft', async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page, 'deletion');
  await area(page, 'deletion')
    .getByRole('button', { name: enMessages['privacy.requestDeletion'] })
    .click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel(enMessages['privacy.reason']).fill('old-context reason');
  await dialog.getByLabel(enMessages['privacy.typeDelete']).fill('DELETE');
  state.slowWrite = true;
  await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
  await expect.poll(() => !!state.releaseWrite).toBe(true);
  state.user = 2;
  state.workspace = 9;
  await page.evaluate(() =>
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'social-stats.session-changed', newValue: 'fixture-new' }),
    ),
  );
  await page.getByRole('button', { name: /Data & Privacy/ }).click();
  await expect(area(page, 'deletion').getByText(enMessages['privacy.noDeletion'])).toBeVisible();
  state.releaseWrite();
  await expect(
    area(page, 'deletion').getByText(enMessages['privacy.deletionAccepted']),
  ).toHaveCount(0);
  await expect(page.locator('input[value="old-context reason"]')).toHaveCount(0);
  await expect(area(page, 'deletion').getByText(enMessages['privacy.noDeletion'])).toBeVisible();
});

test('immediate deletion: failed logout retries only logout after a verified deletion', async ({
  page,
}) => {
  const state = await fixture(page);
  state.role = 'client';
  state.logoutStatus = 503;
  await open(page, 'immediate');
  await area(page, 'immediate')
    .getByRole('button', { name: enMessages['privacy.immediateTitle'], exact: true })
    .click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel(enMessages['privacy.typeDelete']).fill('DELETE');
  await dialog.getByRole('button', { name: enMessages['account.confirm'] }).click();
  await expect(dialog.getByText(enMessages['privacy.logoutFailed'])).toBeVisible();
  await expect(dialog.getByRole('button', { name: enMessages['account.confirm'] })).toBeDisabled();
  state.logoutStatus = 0;
  await dialog.getByRole('button', { name: enMessages['privacy.signOut'] }).click();
  await expect(page).toHaveURL(/\/(?:login)?(?:\?.*)?$/);
  expect(state.writes['/api/profile/delete-account/']).toBe(1);
  expect(state.logouts).toBe(2);
});

for (const family of ['mfa', 'deletion'])
  for (const [language, theme, width] of [
    ['en', 'light', 1440],
    ['fa', 'dark', 360],
  ])
    test(`${family}: safe initial failure evidence ${language}/${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 950 });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      const state = await fixture(page, language, theme);
      const copy = language === 'fa' ? faMessages : enMessages;
      if (family === 'mfa') state.errors.mfa = 503;
      else
        for (const key of ['exports', 'consents', 'processing', 'deletion'])
          state.errors[key] = 503;
      await open(page, family);
      const section = area(page, family, copy);
      await expect(section.locator('[data-data-state="error"]')).toBeVisible();
      await expect(page.locator('[data-mfa-sensitive]')).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `e2e/evidence/account-recovery/${family}-after-initial-${language}-${theme}-${width}.png`,
        fullPage: true,
      });
    });
for (const family of ['mfa', 'deletion'])
  test(`${family}: initial offline has no guessed state and reconnect performs only reads`, async ({
    page,
    context,
  }) => {
    const state = await fixture(page);
    await page.goto('/admin/account-settings');
    await expect(page.getByLabel('First name', { exact: true })).toHaveValue('Fixture');
    await context.setOffline(true);
    await page
      .getByRole('button', { name: family === 'mfa' ? /Account & Security/ : /Data & Privacy/ })
      .click();
    const section = area(page, family);
    await expect(section.locator('[data-data-state="offline"]').first()).toBeVisible();
    await expect(section.locator('[data-data-state="empty"]')).toHaveCount(0);
    await expect(section.getByText(enMessages['mfa.disabled'])).toHaveCount(0);
    await context.setOffline(false);
    await expect(section.locator('[data-data-state="offline"]')).toHaveCount(0);
    expect(Object.keys(state.writes)).toHaveLength(0);
  });
