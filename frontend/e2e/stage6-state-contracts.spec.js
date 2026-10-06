import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections';
const paths = {
  reports: '/admin/analytics/reports',
  dashboard: '/admin/workspace/7',
  editor: '/admin/bot-flows/1/edit',
};
async function setup(page, family, language = 'en', theme = 'light', failure = null) {
  const wire = connectionFixture();
  const provider = wire.providers[0];
  provider.capabilities.analytics = 'supported';
  provider.contract.analytics = {
    sync_available: true,
    metrics: [
      { key: 'views', title_en: 'Views', title_fa: 'بازدید', unit: 'count', period: 'snapshot' },
    ],
  };
  const state = {
    failure,
    saveFailure: null,
    slow: false,
    empty: false,
    datasetCount: 1,
    reads: 0,
    writes: 0,
  };
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
  const flow = { id: 1, name: 'Scoped flow fixture', nodes: [], edges: [], is_active: false };
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
          email: 'fixture@example.test',
          permissions: {},
        },
      });
    if (path.includes('/connections/')) return route.fulfill({ json: wire });
    if (path === '/api/workspaces/')
      return route.fulfill({
        json: [{ id: 7, name: 'Fixture workspace', company: 'Fixture workspace' }],
      });
    const targeted =
      (family === 'reports' && path.includes('/shared-reports/')) ||
      (family === 'dashboard' && path.includes('/posts/')) ||
      (family === 'editor' && path === '/api/bot-flows/1/');
    if (targeted) {
      if (request.method() !== 'GET') {
        state.writes++;
        return route.fulfill({
          status: state.saveFailure || 200,
          json: state.saveFailure
            ? { code: 'unavailable' }
            : { ...flow, ...request.postDataJSON() },
        });
      }
      state.reads++;
      if (state.slow) await new Promise((resolve) => setTimeout(resolve, 800));
      if (state.failure === 'network') return route.abort('failed');
      if (state.failure === 'malformed') return route.fulfill({ json: {} });
      if (state.failure)
        return route.fulfill({
          status: state.failure,
          headers: { 'x-request-id': '0123456789abcdef0123456789abcdef' },
          json: { code: 'unavailable' },
        });
      return route.fulfill({
        json:
          family === 'editor'
            ? flow
            : family === 'reports'
              ? [
                  {
                    id: 1,
                    client: 7,
                    date_from: '2026-10-01',
                    date_until: '2026-10-06',
                    is_active: true,
                    is_expired: false,
                    token: '01234567-89ab-cdef-0123-456789abcdef',
                  },
                ]
              : {
                  results: state.empty
                    ? []
                    : [
                        {
                          id: 1,
                          social_account: 10,
                          platform: 'contract_example',
                          caption: 'Scoped published fixture',
                          published_at: '2026-10-01T10:00:00Z',
                          post_type: 'text',
                        },
                      ],
                  total: state.empty ? 0 : 1,
                  dataset_count: state.datasetCount,
                  has_more: false,
                },
      });
    }
    if (path.includes('/summary/'))
      return route.fulfill({
        json: {
          client: { id: 7, name: 'Fixture workspace', company: 'Fixture workspace' },
          totals: {},
          by_platform: [],
        },
      });
    if (path.includes('/oauth/status/'))
      return route.fulfill({ json: { contract_example: { status: 'active' } } });
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', (socket) => socket.close());
  await page.goto(paths[family]);
  return state;
}
for (const family of ['reports', 'dashboard', 'editor'])
  for (const language of ['fa', 'en'])
    for (const theme of ['light', 'dark', 'system'])
      for (const width of [360, 768, 1440])
        test(`${family}/${language}/${theme}/${width}: visual and recoverable failure`, async ({
          page,
        }) => {
          await page.setViewportSize({ width, height: 950 });
          await page.emulateMedia({
            colorScheme: theme === 'system' ? 'dark' : theme,
            reducedMotion: 'reduce',
          });
          const state = await setup(page, family, language, theme);
          await expect.poll(() => state.reads).toBeGreaterThan(0);
          if (process.env.STAGE6_BASELINE) {
            await page.screenshot({
              path: `e2e/evidence/stage6/${family}-before-${language}-${theme}-${width}.png`,
              fullPage: true,
            });
            return;
          }
          if (family === 'editor') {
            const input = page.getByLabel(language === 'fa' ? 'نام جریان' : 'Flow name');
            await input.fill('Preserved editor fixture');
            state.saveFailure = 503;
            await page.getByRole('button', { name: 'Save', exact: true }).click();
            await expect(
              page
                .getByRole('alert')
                .filter({
                  hasText: language === 'fa' ? 'تغییرات شما حفظ' : 'Your changes are preserved',
                }),
            ).toBeFocused();
            await expect(input).toHaveValue('Preserved editor fixture');
            expect(state.writes).toBe(1);
          } else {
            await expect(
              page.getByText(
                family === 'reports'
                  ? language === 'fa'
                    ? 'فعال'
                    : 'Active'
                  : 'Scoped published fixture',
                { exact: true },
              ),
            ).toBeVisible();
            state.failure = 503;
            await page
              .getByRole('button', {
                name: language === 'fa' ? 'به‌روزرسانی' : 'Refresh',
                exact: true,
              })
              .click();
            await expect(page.locator('[data-data-state="stale"]')).toBeVisible();
            await expect(
              page.getByText(
                family === 'reports'
                  ? language === 'fa'
                    ? 'فعال'
                    : 'Active'
                  : 'Scoped published fixture',
                { exact: true },
              ),
            ).toBeVisible();
          }
          await page.screenshot({
            path: `e2e/evidence/stage6/${family}-after-${language}-${theme}-${width}.png`,
            fullPage: true,
          });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        });
for (const family of ['reports', 'dashboard', 'editor'])
  for (const failure of [403, 404, 429, 500, 503, 'malformed', 'network'])
    test(`${family}: initial ${failure} preserves shell and recovers`, async ({ page }) => {
      test.skip(!!process.env.STAGE6_BASELINE);
      const state = await setup(page, family, 'en', 'light', failure);
      await expect(
        page.locator('[data-data-state]').filter({ hasText: /could not/ }),
      ).toBeVisible();
      if (family !== 'editor') await expect(page.getByRole('banner')).toBeVisible();
      await page.screenshot({
        path: `e2e/evidence/stage6/${family}-initial-${failure}.png`,
        fullPage: true,
      });
      state.failure = null;
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(
        family === 'editor'
          ? page.getByLabel('Flow name')
          : page.getByText(family === 'reports' ? 'Active' : 'Scoped published fixture', {
              exact: true,
            }),
      ).toBeVisible();
    });
test('destructive report action confirms, preserves data on failure and restores focus', async ({
  page,
}) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  const state = await setup(page, 'reports');
  const action = page.getByRole('button', { name: 'Deactivate link', exact: true });
  await action.click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(action).toBeFocused();
  await action.click();
  state.saveFailure = 503;
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Deactivate link', exact: true })
    .click();
  await expect(page.getByRole('alertdialog').locator('[data-data-state="error"]')).toBeVisible();
  await expect(page.getByText('Active', { exact: true })).toBeVisible();
  expect(state.writes).toBe(1);
});
test('offline background preserves measurements and reconnect restores reads', async ({ page }) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  await setup(page, 'dashboard');
  await expect(page.getByText('Scoped published fixture')).toBeVisible();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('[data-data-state="offline"]')).toBeVisible();
  await expect(page.getByText('Scoped published fixture')).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.locator('[data-data-state="offline"]')).toHaveCount(0);
});

for (const family of ['reports', 'dashboard', 'editor'])
  test(`${family}: slow response exposes a busy state and 401 removes private scope`, async ({
    page,
  }) => {
    test.skip(!!process.env.STAGE6_BASELINE);
    const state = await setup(page, family);
    state.slow = true;
    await page.reload();
    await expect(page.locator('[data-data-state="loading"]')).toBeVisible();
    await expect(
      family === 'editor'
        ? page.getByLabel('Flow name')
        : page.getByText(family === 'reports' ? 'Active' : 'Scoped published fixture', {
            exact: true,
          }),
    ).toBeVisible();
    state.failure = 401;
    state.slow = false;
    if (family === 'editor') await page.reload();
    else await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page).toHaveURL(/login/);
    await expect(page.getByText('Scoped published fixture')).toHaveCount(0);
    await expect(page.getByLabel('Flow name')).toHaveCount(0);
  });
test('narrow editor palette is keyboard accessible and restores focus through a shared drawer', async ({
  page,
}) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  await page.setViewportSize({ width: 360, height: 950 });
  await setup(page, 'editor');
  await expect(page.getByLabel('Flow name')).toBeVisible();
  const trigger = page.getByRole('button', { name: 'Nodes', exact: true });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
});
test('offline editor preserves draft and a failed save never replays on reconnect', async ({
  page,
}) => {
  test.skip(!!process.env.STAGE6_BASELINE);
  const state = await setup(page, 'editor');
  const input = page.getByLabel('Flow name');
  await input.fill('Preserved offline draft');
  state.saveFailure = 503;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('[data-data-state="error"]')).toBeFocused();
  await page.context().setOffline(true);
  await expect(page.locator('[data-data-state="offline"]')).toBeVisible();
  await expect(input).toHaveValue('Preserved offline draft');
  await page.context().setOffline(false);
  await expect(page.locator('[data-data-state="offline"]')).toHaveCount(0);
  await expect(input).toHaveValue('Preserved offline draft');
  expect(state.writes).toBe(1);
});

for (const count of [0, 1])
  test(`dashboard successful zero-result response distinguishes dataset_count=${count}`, async ({
    page,
  }) => {
    test.skip(!!process.env.STAGE6_BASELINE);
    const state = await setup(page, 'dashboard');
    state.empty = true;
    state.datasetCount = count;
    await page.reload();
    await expect(
      page.locator(`[data-data-state="${count ? 'no-results' : 'empty'}"]`),
    ).toBeVisible();
    await expect(page.locator('[data-data-state="error"]')).toHaveCount(0);
  });
