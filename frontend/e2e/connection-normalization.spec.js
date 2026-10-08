import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections';
import { enMessages as en, faMessages as fa } from '../src/i18n/messages';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`${language}/${theme}/${width}: connection field contract and keyboard dismissal`, async ({ page }, info) => {
    const messages = language === 'fa' ? fa : en;
    const wire = connectionFixture();
    const provider = wire.providers[0];
    provider.contract.auth.fields[0].normalization = 'trim';
    provider.contract.auth.fields[1].normalization = 'trim';
    provider.contract.auth.fields.push({ key: 'password', title_en: 'Public fixture password', title_fa: 'رمز نمونهٔ عمومی', secret: true, required: true, normalization: 'preserve' });
    const base = new URL(info.project.use.baseURL).origin;
    await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }, { name: 'theme', value: theme, url: base }]);
    await page.addInitScript(locale => {
      localStorage.setItem('socialstats.language', locale);
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
    }, language);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let writes = 0, contractMatches = false;
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    await page.route('**/api/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
      if (path === '/api/auth/me/') return route.fulfill({ json: { id: 1, role: 'client', account_type: 'end_user', client_id: 7, workspace_id: 7, email: 'fixture@example.test', permissions: {} } });
      if (path === '/api/end-user/me/') return route.fulfill({ json: { workspace: { id: 7 } } });
      if (path.includes('/connections/') && request.method() === 'POST') {
        writes++;
        const body = request.postDataJSON();
        contractMatches = body.token === 'public-fixture' && body.destination_id === 'destination' && body.password === ' intentional public fixture  ';
        return route.fulfill({ status: 201, json: { success: true, account_id: 10 } });
      }
      if (path.includes('/connections/')) return route.fulfill({ json: wire });
      return route.fulfill({ json: [] });
    });
    await page.goto('/u/connections');
    const trigger = page.getByRole('button', { name: messages['connections.add'], exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    const fields = dialog.locator('input');
    await expect(fields.nth(0)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await fields.nth(0).fill(' public-fixture  ');
    await fields.nth(1).fill(' destination  ');
    await fields.nth(2).fill(' intentional public fixture  ');
    await dialog.getByRole('button', { name: messages['connections.submit'], exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(writes).toBe(1);
    expect(contractMatches).toBe(true);
    expect(new URL(page.url()).search).toBe('');
    await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
  });
}
