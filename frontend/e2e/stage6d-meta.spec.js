import { test, expect } from '@playwright/test';
import { enMessages, faMessages } from '../src/i18n/messages';
async function prepare(page, language = 'en', theme = 'light') {
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
  const state = { failure: null, kind: 'accounts', delay: false, writes: [] };
  const flow = {
    id: 1,
    client: 7,
    name: 'Meta scoped flow',
    nodes: [],
    edges: [],
    trigger_type: 'ctwa_ad',
    trigger_config: { ad_account_id: 'act_10', campaign_ids: ['11'], ad_ids: ['111'] },
    is_active: false,
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (path.endsWith('/auth/session/'))
      return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
    if (path.endsWith('/auth/me/'))
      return route.fulfill({
        json: {
          id: 1,
          role: 'superadmin',
          account_type: 'legacy',
          workspace_id: 7,
          client_id: 7,
          permissions: {},
        },
      });
    if (path === '/api/bot-flows/1/') {
      if (request.method() !== 'GET') {
        state.writes.push(request.postDataJSON());
        return route.fulfill({ json: { ...flow, ...request.postDataJSON() } });
      }
      return route.fulfill({ json: flow });
    }
    if (path.includes('/meta-ads/')) {
      const kind = path.split('/').filter(Boolean).at(-1);
      if (!process.env.STAGE6D_BASELINE) expect(url.searchParams.get('workspace_id')).toBe('7');
      if (state.kind === kind && state.delay) await new Promise((done) => setTimeout(done, 700));
      if (state.kind === kind && state.failure) {
        if (state.failure === 'network') return route.abort('failed');
        return route.fulfill({
          status: typeof state.failure === 'number' ? state.failure : 200,
          json: state.failure === 'malformed' ? {} : { error: 'private-meta-credential' },
        });
      }
      const account = url.searchParams.get('ad_account_id') || 'act_10',
        campaign = url.searchParams.get('campaign_id') || '11';
      const rows =
        kind === 'accounts'
          ? [
              { id: 'act_10', name: 'Account A' },
              { id: 'act_20', name: 'Account B' },
            ]
          : kind === 'campaigns'
            ? [
                {
                  id: account === 'act_10' ? '11' : '22',
                  name: account === 'act_10' ? 'Campaign A' : 'Campaign B',
                  account_id: account.slice(4),
                },
              ]
            : [
                {
                  id: campaign === '11' ? '111' : '222',
                  name: campaign === '11' ? 'Ad A' : 'Ad B',
                  campaign_id: campaign,
                  is_ctwa: true,
                },
              ];
      return route.fulfill({
        json: {
          connected: true,
          workspace_id: 7,
          ad_account_id: account,
          campaign_id: campaign,
          partial: false,
          [kind]: rows,
        },
      });
    }
    return route.fulfill({ json: [] });
  });
  return state;
}
async function open(page) {
  await page.goto('/admin/bot-flows/1/edit');
  await page.getByRole('button', { name: /^(Publish|انتشار)$/ }).click();
  return page.getByRole('dialog');
}
for (const language of ['fa', 'en'])
  for (const theme of ['light', 'dark', 'system'])
    for (const width of [360, 768, 1440])
      test(`meta controls ${language}/${theme}/${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 950 });
        await page.emulateMedia({
          colorScheme: theme === 'system' ? 'dark' : theme,
          reducedMotion: 'reduce',
        });
        const state = await prepare(page, language, theme),
          copy = language === 'fa' ? faMessages : enMessages;
        const dialog = await open(page);
        if (process.env.STAGE6D_BASELINE) {
          await expect(dialog.getByText('Ad A', { exact: true })).toBeVisible();
          await page.screenshot({
            path: `e2e/evidence/stage6d/meta-before-${language}-${theme}-${width}.png`,
          });
          return;
        }
        await expect(dialog.getByLabel(/Ad A/)).toBeChecked();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const publish = dialog.getByRole('button', {
          name: copy['editor.publishAction'],
          exact: true,
        });
        await expect(publish).toBeEnabled();
        state.kind = 'ads';
        state.failure = 503;
        await dialog
          .getByRole('button', { name: copy['meta.refresh'], exact: true })
          .last()
          .click();
        await expect(dialog.getByText(copy['meta.stale'])).toBeVisible();
        await expect(dialog.getByLabel(/Ad A/)).toBeChecked();
        await expect(publish).toBeEnabled();
        expect(state.writes).toHaveLength(0);
        await expect(page.getByText('private-meta-credential')).toHaveCount(0);
        if (
          (language === 'fa' && theme === 'dark' && width === 360) ||
          (language === 'en' && theme === 'light' && width === 1440)
        )
          await page.screenshot({
            path: `e2e/evidence/stage6d/meta-after-${language}-${theme}-${width}.png`,
          });
        state.failure = null;
        await dialog.getByRole('button', { name: copy['meta.retry'], exact: true }).click();
        await expect(dialog.getByText(copy['meta.stale'])).toHaveCount(0);
        await dialog.getByLabel(copy['meta.filter']).fill('no-such-ad');
        await expect(dialog.getByText(copy['meta.noResults'])).toBeVisible();
        await dialog.getByLabel(copy['meta.filter']).fill('');
        await dialog.getByLabel(/Ad A/).focus();
        await page.keyboard.press('Space');
        await expect(dialog.getByLabel(/Ad A/)).not.toBeChecked();
        await page.keyboard.press('Space');
        await expect(dialog.getByLabel(/Ad A/)).toBeChecked();
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('button', { name: /^(Publish|انتشار)$/ })).toBeFocused();
      });
for (const kind of ['accounts', 'campaigns', 'ads'])
  for (const failure of [403, 404, 429, 503, 'malformed', 'network'])
    test(`meta ${kind} initial ${failure} and recovery`, async ({ page }) => {
      const state = await prepare(page);
      state.kind = kind;
      state.failure = failure;
      const dialog = await open(page);
      await expect(
        dialog
          .locator('[data-data-state]')
          .filter({
            hasText:
              enMessages[
                `meta.${failure === 403 ? 'forbidden' : failure === 404 ? 'not-found' : failure === 'malformed' || failure === 429 ? 'error' : 'unavailable'}`
              ],
          })
          .first(),
      ).toBeVisible();
      await expect(dialog.getByText(enMessages['meta.disconnected'])).toHaveCount(0);
      await expect(dialog.getByText(enMessages['meta.empty'])).toHaveCount(0);
      await expect(
        dialog.getByRole('button', { name: 'Publish flow', exact: true }),
      ).toBeDisabled();
      state.failure = null;
      await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(dialog.getByLabel(/Ad A/)).toBeChecked();
      await expect(dialog.getByRole('button', { name: 'Publish flow', exact: true })).toBeEnabled();
      expect(state.writes).toHaveLength(0);
    });
test('meta slow scope switch and offline recovery', async ({ page }) => {
  const state = await prepare(page),
    dialog = await open(page);
  await expect(dialog.getByLabel(/Ad A/)).toBeChecked();
  state.kind = 'campaigns';
  state.delay = true;
  await dialog.getByRole('button', { name: 'Refresh', exact: true }).nth(1).click();
  await dialog.getByLabel('Ad accounts').selectOption('act_20');
  await expect(dialog.getByLabel('Campaign A')).toHaveCount(0);
  await expect(dialog.getByLabel('Campaign B')).toBeVisible();
  await dialog.getByLabel('Campaign B').check();
  await expect(dialog.getByLabel(/Ad B/)).toBeVisible();
  await expect(dialog.getByLabel(/Ad A/)).toHaveCount(0);
  await page.context().setOffline(true);
  await dialog.getByRole('button', { name: 'Refresh', exact: true }).last().click();
  await expect(dialog.locator('[data-data-state="offline"]')).toBeVisible();
  await page.context().setOffline(false);
  await expect(dialog.locator('[data-data-state="offline"]')).toHaveCount(0);
  await expect(dialog.getByLabel(/Ad B/)).toBeVisible();
});
