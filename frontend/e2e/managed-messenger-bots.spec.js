import { test, expect } from '@playwright/test';
import catalogue from '../src/services/platformCatalogue.generated.json';
import { enMessages as en, faMessages as fa } from '../src/i18n/messages';

for (const language of ['fa', 'en']) {
  test(`${language}: project bot onboarding verifies channel without a user token`, async ({ page }, info) => {
    const messages = language === 'fa' ? fa : en;
    const metadata = catalogue.platforms.find(p => p.key === 'telegram');
    const wire = { version: 1, workspace_id: 7, categories: catalogue.categories,
      providers: [{ ...metadata, readiness: null, permissions: { connect: true }, accounts: [],
        managed_bot: { username: 'ravinta_project_bot', configured: true,
          verification_code: 'ravinta-public-browser-fixture', verification_token: 'signed-public-fixture' } }] };
    const base = new URL(info.project.use.baseURL).origin;
    await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }]);
    await page.addInitScript(locale => {
      localStorage.setItem('socialstats.language', locale);
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
    }, language);
    await page.setViewportSize({ width: language === 'fa' ? 390 : 1280, height: 900 });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    const writes = [];
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
      if (path === '/api/auth/me/') return route.fulfill({ json: { id: 1, role: 'client', account_type: 'end_user', client_id: 7, workspace_id: 7, email: 'fixture@example.test', permissions: {} } });
      if (path === '/api/end-user/me/') return route.fulfill({ json: { workspace: { id: 7 } } });
      if (path.includes('/connections/') && request.method() === 'POST') {
        writes.push(request.postDataJSON());
        return route.fulfill({ status: 403, json: { code: 'permission_denied' } });
      }
      if (path.includes('/connections/')) return route.fulfill({ json: wire });
      return route.fulfill({ json: [] });
    });
    await page.goto('/u/connections');
    await page.getByRole('button', { name: messages['connections.add'], exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('@ravinta_project_bot', { exact: true })).toBeVisible();
    await expect(dialog.getByText('ravinta-public-browser-fixture', { exact: true })).toBeVisible();
    await expect(dialog.locator('input')).toHaveCount(1);
    await expect(dialog.locator('input[type=password]')).toHaveCount(0);
    await dialog.locator('input').fill('@my_channel');
    await expect(dialog.locator('input')).toHaveCSS('direction', 'ltr');
    await info.attach(`managed-bot-${language}`, { body: await dialog.screenshot(), contentType: 'image/png' });
    await dialog.getByRole('button', { name: messages['botConnect.verifyChannel'], exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(messages['botConnect.permissionDenied']);
    expect(writes).toEqual([{ destination_id: '@my_channel', verification_token: 'signed-public-fixture' }]);
    await expect(dialog.locator('input')).toHaveValue('@my_channel');
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
  });
}
