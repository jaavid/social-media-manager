import { test, expect } from '@playwright/test';
import { legacyComposerConnections } from './composer-fixture';
import { connectionFixture, connectionAccount } from '../src/services/__fixtures__/connections';

async function setup(page, { language = 'en', theme = 'light', scheduling = false } = {}) {
  const wire = connectionFixture();
  wire.providers[0].accounts = [connectionAccount(), connectionAccount(11)];
  if (scheduling) wire.providers[0].capabilities.scheduling = 'supported';
  const state = { wire, writes: [], failSave: false, failPublish: null, failQueue: false, failRead: false,
    post: { id: 900, client: 7, title: '', content: '', media_urls: [], media_type: 'text', target_platforms: [], platform_overrides: {}, scheduled_at: null, status: 'draft' } };
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: 'http://127.0.0.1:3000' }, { name: 'theme', value: theme, url: 'http://127.0.0.1:3000' }, { name: 'csrftoken', value: 'e2e-csrf', url: 'http://127.0.0.1:3000' }]);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('socialstats.language', language); localStorage.setItem('theme', theme);
    localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
  }, { language, theme });
  await page.route('**/api/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'client', account_type: 'legacy', workspace_id: 7, client_id: 7, email: 'fixture@example.test', permissions: {} } });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'e2e-csrf' } });
    if (path.includes('/connections/')) return route.fulfill({ status: state.failRead ? 503 : 200, json: state.failRead ? { code: 'unavailable' } : state.wire });
    if (path === '/api/composer/queues/') return route.fulfill({ json: [{ id: 11, client: 7, name: 'Queue fixture', platforms: ['contract_example'], is_active: true }] });
    if (path.includes('/composer/posts/')) {
      if (req.method() !== 'GET') state.writes.push({ path, payload: req.postDataJSON(), key: req.headers()['idempotency-key'] });
      if (path.endsWith('/publish_now/')) {
        if (state.failPublish === 'timeout') return route.abort('timedout');
        if (state.failPublish) return route.fulfill({ status: state.failPublish, json: { code: state.failPublish === 429 ? 'rate_limited' : 'permission_denied' } });
        state.post.status = 'queued'; return route.fulfill({ json: state.post });
      }
      if (path.endsWith('/schedule/')) { state.post.scheduled_at = req.postDataJSON().scheduled_at; state.post.status = 'scheduled'; return route.fulfill({ json: state.post }); }
      if (path.endsWith('/add_to_queue/')) return route.fulfill({ status: state.failQueue ? 400 : 201, json: state.failQueue ? { code: 'invalid_destination' } : { id: 12 } });
      if (req.method() !== 'GET') {
        if (state.failSave) return route.fulfill({ status: 503, json: { code: 'unavailable' } });
        state.post = { ...state.post, ...req.postDataJSON() };
      }
      return route.fulfill({ json: state.post });
    }
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.goto('/dashboard/analytics/composer');
  return state;
}
async function compose(page, language = 'en') {
  await page.getByRole('button', { name: language === 'fa' ? 'آزمایشی' : 'Contract example', pressed: false }).click();
  await page.getByRole('checkbox', { name: /First account/ }).check();
  await page.getByLabel(language === 'fa' ? 'محتوا' : 'Content', { exact: true }).fill('Private editor content');
}
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark', 'system']) for (const width of [360, 768, 1440]) {
  test(`${language}/${theme}/${width}: editor keyboard, failure preservation and safe save retry`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const state = await setup(page, { language, theme }); await compose(page, language);
    const heading = await page.getByRole('heading', { name: language === 'fa' ? 'نگارش پست' : 'Composer', exact: true }).boundingBox();
    expect(heading.height).toBeLessThan(80);
    await page.getByRole('checkbox', { name: /Second account/ }).check();
    const save = page.getByRole('button', { name: language === 'fa' ? 'ذخیره پیش‌نویس' : 'Save Draft', exact: true });
    state.failSave = true;
    await save.focus(); await page.keyboard.press('Enter');
    const alert = page.getByRole('alert').filter({ hasText: language === 'fa' ? 'ورودی شما حفظ شده' : 'Your input is preserved' });
    await expect(alert).toBeVisible(); await expect(alert).toBeFocused();
    await expect(page.getByLabel(language === 'fa' ? 'محتوا' : 'Content', { exact: true })).toHaveValue('Private editor content');
    await expect(page.getByRole('checkbox', { name: /First account/ })).toBeChecked(); await expect(page.getByRole('checkbox', { name: /Second account/ })).toBeChecked();
    expect(state.writes).toHaveLength(1);
    await page.screenshot({ path: `e2e/evidence/stage5/after-${language}-${theme}-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.locator('html').getAttribute('dir')).toBe(language === 'fa' ? 'rtl' : 'ltr');
    state.failSave = false; await save.click();
    await expect(page).toHaveURL(/composer\/900$/);
    expect(state.writes[0].key).toBe(state.writes[1].key);
    expect(state.writes[1].payload.platform_overrides.contract_example.account_targets).toHaveLength(2);
    expect(errors).toEqual([]);
  });
}
test('standard fixture publishes text; capability removal disables publishing without conversion', async ({ page }) => {
  const state = await setup(page); await compose(page);
  await page.getByRole('button', { name: 'Publish Now', exact: true }).click();
  await expect(page.getByText('Accepted into the queue. Publication is not confirmed.', { exact: true })).toBeVisible();
  expect(state.writes.filter(w => w.path.endsWith('/publish_now/'))).toHaveLength(1);
  expect(state.writes[0].payload.platform_overrides.contract_example.account_targets[0].social_account_id).toBe(10);
  state.wire.providers[0].capabilities.publish_text = 'not_available';
  await page.reload();
  await expect(page.getByText('No publish-capable providers available.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
});
test('timeout remains ambiguous, preserves media/account/editor and never repeats publication', async ({ page }) => {
  const state = await setup(page); await compose(page); state.failPublish = 'timeout';
  await page.getByRole('button', { name: 'Publish Now' }).click();
  await expect(page.getByText(/The outcome is unknown/)).toBeVisible();
  await expect(page.getByLabel('Content', { exact: true })).toHaveValue('Private editor content');
  await expect(page.getByRole('checkbox', { name: /First account/ })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  expect(state.writes.filter(w => w.path.endsWith('/publish_now/'))).toHaveLength(1);
  await page.screenshot({ path: 'e2e/evidence/stage5/recovery-ambiguous.png', fullPage: true });
});
test('scheduling preserves the instant when switching locale in a non-UTC timezone', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Asia/Tehran' }); const page = await context.newPage();
  const state = await setup(page, { scheduling: true }); await compose(page);
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await page.getByLabel('Publication date and time').fill('2030-06-12T18:30');
  await page.getByRole('button', { name: 'Schedule', exact: true }).first().click();
  await expect.poll(() => state.writes.find(w => w.path.endsWith('/schedule/'))?.payload.scheduled_at).toBe('2030-06-12T15:00:00.000Z');
  await context.addCookies([{ name: 'socialstats.language', value: 'fa', url: 'http://127.0.0.1:3000' }]);
  await page.goto('/dashboard/analytics/composer/900');
  await expect(page.getByLabel('تاریخ و ساعت انتشار')).toHaveValue('2030-06-12T18:30');
  await context.close();
});
test('initial network error is recoverable and cannot masquerade as empty accounts', async ({ page }) => {
  const state = await setup(page); state.failRead = true; await page.reload();
  await expect(page.getByText('The operation could not be completed. Your input is preserved.')).toBeVisible();
  await expect(page.getByText('No publish-capable providers available.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Publish Now' })).toBeDisabled();
  state.failRead = false; await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: 'Contract example' })).toBeVisible();
});

test('advanced draft media order, captions and destinations survive failed save and reopen', async ({ page }) => {
  const state = await setup(page);
  state.wire = legacyComposerConnections(7, 'telegram');
  const items = [{ type: 'photo', media: 'https://example.org/second.jpg', caption: 'Second first' }, { type: 'photo', media: 'https://example.org/first.jpg', caption: 'First second' }];
  const options = { social_account_id: 7, destination_id: 'destination-7', media_items: items,
    destination_context: { destination_type: 'forum_supergroup', message_thread_id: 22 }, disable_notification: true };
  state.post = { ...state.post, content: 'Private caption', media_type: 'album', media_urls: [], target_platforms: ['telegram'], platform_overrides: { telegram: options } };
  await page.goto('/dashboard/analytics/composer/900');
  await page.getByLabel('Content', { exact: true }).fill('Edited caption');
  state.failSave = true;
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  await expect(page.getByText(/Your input is preserved/)).toBeVisible();
  expect(state.writes[0].payload.platform_overrides.telegram).toEqual(options);
  expect(state.writes[0].payload.media_urls).toEqual([]);
  await page.reload();
  await expect(page.getByLabel('Content', { exact: true })).toHaveValue('Edited caption');
  await expect(page.getByRole('checkbox', { name: /News/ })).toBeChecked();
  state.failSave = false;
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  await expect(page.getByText('Draft saved.', { exact: true })).toBeVisible();
  expect(state.writes[1].payload.platform_overrides.telegram).toEqual(options);
});
