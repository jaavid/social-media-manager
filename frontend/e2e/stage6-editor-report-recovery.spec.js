import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections';
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
}
for (const language of ['fa', 'en'])
  for (const theme of ['light', 'dark', 'system'])
    for (const width of [360, 768, 1440])
      test(`video/${language}/${theme}/${width}: preserved input and shared Composer handoff`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 950 });
        await page.emulateMedia({
          colorScheme: theme === 'system' ? 'dark' : theme,
          reducedMotion: 'reduce',
        });
        await prepare(page, language, theme);
        let failure = 503,
          writes = 0;
        const wire = connectionFixture();
        await page.route('**/api/**', (route) => {
          const path = new URL(route.request().url()).pathname;
          if (path.endsWith('/auth/session/'))
            return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
          if (path.endsWith('/auth/me/'))
            return route.fulfill({
              json: {
                id: 1,
                role: 'client',
                account_type: 'legacy',
                workspace_id: 7,
                client_id: 7,
                permissions: {},
              },
            });
          if (path.includes('/connections/')) return route.fulfill({ json: wire });
          if (path === '/api/workspaces/')
            return route.fulfill({ json: [{ id: 7, name: 'Fixture', company: 'Fixture' }] });
          if (path === '/api/video/upload/') {
            writes++;
            if (!process.env.STAGE6_BASELINE)
              expect(route.request().postDataJSON().workspace_id).toBe(7);
            return route.fulfill({
              status: failure || 201,
              json: failure
                ? { error: 'private token must never appear' }
                : {
                    id: 1,
                    client: 7,
                    file_url: 'https://example.test/video.mp4',
                    mime_type: 'video/mp4',
                    file_size: 128,
                    width: 1920,
                    height: 1080,
                    duration_seconds: 5,
                  },
            });
          }
          if (path === '/api/composer/posts/' && route.request().method() === 'POST')
            return route.fulfill({
              status: 201,
              json: {
                id: 88,
                client: 7,
                title: '',
                content: '',
                media_type: 'video',
                media_urls: ['asset:1'],
                target_platforms: [],
                platform_overrides: {},
                status: 'draft',
                scheduled_at: null,
              },
            });
          if (path === '/api/composer/posts/88/')
            return route.fulfill({
              json: {
                id: 88,
                client: 7,
                title: '',
                content: '',
                media_type: 'video',
                media_urls: ['asset:1'],
                target_platforms: [],
                platform_overrides: {},
                status: 'draft',
                scheduled_at: null,
              },
            });
          return route.fulfill({ json: [] });
        });
        await page.goto('/dashboard/analytics/video');
        const url = page.getByPlaceholder('https://example.com/video.mp4');
        await url.fill('https://example.test/keep.mp4');
        await url.locator('../..').getByRole('button').click();
        if (process.env.STAGE6_BASELINE) {
          await page.screenshot({
            path: `e2e/evidence/stage6/video-before-${language}-${theme}-${width}.png`,
            fullPage: true,
          });
          return;
        }
        await expect(page.locator('[data-data-state="error"]')).toBeFocused();
        await expect(url).toHaveValue('https://example.test/keep.mp4');
        expect(writes).toBe(1);
        await expect(page.getByText('private token must never appear')).toHaveCount(0);
        await page.screenshot({
          path: `e2e/evidence/stage6/video-after-${language}-${theme}-${width}.png`,
          fullPage: true,
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        failure = null;
        await url.locator('../..').getByRole('button').click();
        await expect(page.locator('video')).toBeVisible();
        await page.getByRole('button', { name: 'Captions', exact: true }).click();
        await expect(page.locator('[data-data-state="unavailable"]')).toBeVisible();
        await page.getByRole('main').getByRole('button', { name: 'Publish', exact: true }).click();
        await page
          .getByRole('button', {
            name:
              language === 'fa'
                ? 'بازکردن پیش‌نویس ویدیو در سازندهٔ محتوا'
                : 'Open video draft in Composer',
            exact: true,
          })
          .click();
        await expect(page).toHaveURL(/composer\/88\?workspace=7/);
      });
for (const failure of [401, 403, 404, 429, 500, 503, 'malformed', 'network'])
  test(`public report ${failure}: password preserved, safe recovery and exact metric semantics`, async ({
    page,
  }) => {
    await prepare(page);
    let currentFailure = failure,
      verifies = 0;
    const sync = connectionFixture().providers[0].accounts[0].sync;
    const report = {
      version: 2,
      availability: 'available',
      client: { name: 'Fixture shared report' },
      period: { from: '2026-10-01', until: '2026-10-06' },
      reports: [
        {
          version: 1,
          workspace_id: 7,
          account_id: 10,
          provider: 'contract_example',
          availability: 'available',
          dataset_count: 1,
          period: { since: '2026-10-01', until: '2026-10-06' },
          metrics: [
            {
              key: 'views',
              title_en: 'Actual views',
              title_fa: 'بازدید واقعی',
              unit: 'count',
              period: 'snapshot',
            },
          ],
          sync,
          rows: [
            {
              id: 1,
              date: '2026-10-01',
              observed_at: '2026-10-01T12:00:00Z',
              state: 'available',
              values: { views: 0 },
            },
          ],
          pagination: { page: 1, page_size: 100, count: 1, has_next: false, has_previous: false },
        },
      ],
    };
    await page.route('**/api/**', (route) => {
      const request = route.request(),
        path = new URL(request.url()).pathname;
      if (path.includes('/public/report/')) {
        if (request.method() === 'GET')
          return route.fulfill({
            json: { requires_password: true, client_name: 'Fixture shared report' },
          });
        verifies++;
        if (currentFailure === 'network') return route.abort('failed');
        if (currentFailure === 'malformed') return route.fulfill({ json: {} });
        if (currentFailure)
          return route.fulfill({
            status: currentFailure,
            json: { detail: 'private password must never appear' },
          });
        return route.fulfill({ json: report });
      }
      if (path.endsWith('/auth/session/'))
        return route.fulfill({ json: { authenticated: false, csrfToken: 'fixture-csrf' } });
      return route.fulfill({ json: [] });
    });
    await page.goto('/report/01234567-89ab-cdef-0123-456789abcdef');
    // The existing public/token locale contract stays Persian, even with an English workspace preference.
    const password = page.getByLabel('گذرواژهٔ گزارش', { exact: true });
    await password.fill('Retain this password');
    await page.getByRole('button', { name: 'بازکردن گزارش', exact: true }).click();
    await expect(page.locator('[data-data-state="error"]')).toBeFocused();
    await expect(password).toHaveValue('Retain this password');
    await expect(page.getByRole('table')).toHaveCount(0);
    expect(verifies).toBe(1);
    currentFailure = null;
    await page.getByRole('button', { name: 'بازکردن گزارش', exact: true }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('cell', { name: '۰', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /بازدید واقعی/ })).toBeVisible();
    await page.getByRole('button', { name: 'به‌روزرسانی', exact: true }).click();
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(password).toHaveValue('');
  });
