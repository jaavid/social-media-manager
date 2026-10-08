import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections';

async function setup(page, language = 'en', theme = 'light') {
  const wire = connectionFixture(); wire.providers[0].capabilities.inbox = 'supported';
  const rows = [{ id: 1, client: 7, platform: 'contract_example', social_account: 10, contact_name: 'Inbox fixture', type: 'dm', messages: [] }];
  const state = { wire, rows, failure: null, replyFailure: null, writes: 0 };
  const origin = test.info().project.use.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: origin }, { name: 'theme', value: theme, url: origin }]);
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'client', account_type: 'legacy', client_id: 7, workspace_id: 7, email: 'fixture@example.test', permissions: {} } });
    if (path.includes('/connections/')) return route.fulfill({ json: state.wire });
    if (path.includes('/inbox/conversations/')) {
      if (path.endsWith('/reply/')) { state.writes++; return state.replyFailure === 'timeout' ? route.abort('timedout') : route.fulfill({ status: state.replyFailure || 201, json: state.replyFailure ? { code: 'rate_limited' } : { id: 99 } }); }
      if (state.failure === 'malformed') return route.fulfill({ json: {} });
      if (state.failure) return route.fulfill({ status: state.failure, json: { code: 'unavailable' } });
      return route.fulfill({ json: /\/\d+\/$/.test(path) ? state.rows[0] : state.rows });
    }
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.goto('/dashboard/analytics/inbox'); return state;
}
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark', 'system']) for (const width of [360, 768, 1440]) {
  test(`${language}/${theme}/${width}: generic Inbox and reply recovery`, async ({ page }) => {
    if (process.env.STAGE6_BASELINE) test.setTimeout(90000);
    await page.setViewportSize({ width, height: 950 }); await page.emulateMedia({ colorScheme: theme === 'system' ? 'dark' : theme, reducedMotion: 'reduce' });
    const state = await setup(page, language, theme);
    if (process.env.STAGE6_BASELINE) {
      await expect(page.getByRole('button', { name: /Inbox fixture/ })).toBeVisible();
      await page.screenshot({ path: `e2e/evidence/stage6/inbox-before-${language}-${theme}-${width}.png`, fullPage: true }); return;
    }
    await page.getByRole('combobox', { name: language === 'fa' ? 'حساب / مقصد' : 'Account / destination' }).selectOption('10');
    await page.getByRole('button', { name: /Inbox fixture/ }).click();
    const reply = page.getByLabel(language === 'fa' ? 'پاسخ' : 'Reply', { exact: true });
    await reply.fill('Recoverable fixture input'); state.replyFailure = 429;
    const send = page.getByRole('button', { name: language === 'fa' ? 'ارسال' : 'Send', exact: true });
    await send.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('alert').filter({ hasText: language === 'fa' ? 'ورودی شما حفظ شده' : 'Your input is preserved' })).toBeFocused();
    await expect(reply).toHaveValue('Recoverable fixture input'); expect(state.writes).toBe(1);
    await page.screenshot({ path: `e2e/evidence/stage6/inbox-after-${language}-${theme}-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    state.replyFailure = null; await send.click(); await expect(reply).toHaveValue(''); expect(state.writes).toBe(2);
  });
}
test('initial/background errors never become empty and capability removal disables flow', async ({ page }) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  const state = await setup(page); state.failure = 'malformed';
  await page.getByRole('combobox', { name: 'Account / destination' }).selectOption('10');
  await expect(page.getByRole('alert').filter({ hasText: 'Content could not be loaded.' })).toBeVisible(); await expect(page.getByText('No conversations yet.')).toHaveCount(0);
  state.failure = null; await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: /Inbox fixture/ })).toBeVisible();
  for (const status of [429, 500, 503]) {
    state.failure = status; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Previous results are retained and may be stale.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Inbox fixture/ })).toBeVisible();
  }
  state.failure = 403; await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('button', { name: /Inbox fixture/ })).toHaveCount(0);
});
for (const failure of [403, 404, 429, 500, 503]) test(`initial ${failure} has a recovery state and no false empty`, async ({ page }) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  const state = await setup(page); state.failure = failure;
  await page.getByRole('combobox', { name: 'Account / destination' }).selectOption('10');
  await expect(page.locator('[data-data-state]').filter({ hasText: /Content could not|Access is restricted|no longer available/ })).toBeVisible();
  await expect(page.getByText('No conversations yet.')).toHaveCount(0);
  state.failure = null; await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: /Inbox fixture/ })).toBeVisible();
});
test('ambiguous reply retains text and never automatically replays', async ({ page }) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  const state = await setup(page);
  await page.getByRole('combobox', { name: 'Account / destination' }).selectOption('10');
  await page.getByRole('button', { name: /Inbox fixture/ }).click();
  await page.getByLabel('Reply', { exact: true }).fill('Keep ambiguous input'); state.replyFailure = 'timeout';
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'The delivery outcome is unknown.' })).toBeFocused();
  await expect(page.getByLabel('Reply', { exact: true })).toHaveValue('Keep ambiguous input');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled(); expect(state.writes).toBe(1);
  await page.screenshot({ path: 'e2e/evidence/stage6/inbox-ambiguous-recovery.png', fullPage: true });
});
