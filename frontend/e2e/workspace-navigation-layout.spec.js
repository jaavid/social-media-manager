import { test, expect } from '@playwright/test';
import { legacyComposerConnections } from './composer-fixture';

for (const width of [1440, 390]) {
  test(`workspace controls and short routes at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.context().addCookies([{ name: 'socialstats.language', value: 'fa', url: 'http://127.0.0.1:3000' }]);
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fixture-token');
      localStorage.setItem('socialstats.language', 'fa');
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
    });
    const wire = legacyComposerConnections(7, 'telegram');
    const second = JSON.parse(JSON.stringify(wire.providers[0]));
    second.key = 'bale'; second.titles = { en: 'Bale', fa: 'بله' };
    second.accounts[0].id = 8; second.accounts[0].name = 'اکانت بله';
    second.contract.ui_extensions = [];
    wire.providers.push(second);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'client', account_type: 'legacy', workspace_id: 7, client_id: 7, permissions: {} } });
      if (path.includes('/connections/')) return route.fulfill({ json: wire });
      return route.fulfill({ json: [] });
    });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    await page.goto('/dashboard/analytics/composer?workspace=7');
    await expect(page).toHaveURL(/\/dashboard\/composer\?workspace=7$/);
    const telegram = page.getByRole('button', { name: 'تلگرام', exact: true }).first();
    const bale = page.getByRole('button', { name: 'بله', exact: true }).first();
    await expect(telegram).toBeVisible(); await expect(bale).toBeVisible();
    const firstBox = await telegram.boundingBox(); const secondBox = await bale.boundingBox();
    expect(Math.abs(firstBox.y - secondBox.y)).toBeLessThan(2);
    await telegram.click(); await bale.click();
    await expect(telegram).toHaveAttribute('aria-pressed', 'true');
    await expect(bale).toHaveAttribute('aria-pressed', 'true');
    expect(Math.abs((await telegram.boundingBox()).y - (await bale.boundingBox()).y)).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath('composer.png'), fullPage: true });
    await page.goto('/dashboard/analytics/inbox?workspace=7');
    await expect(page).toHaveURL(/\/dashboard\/inbox\?workspace=7$/);
    const dropdown = page.locator('main select.ds-native-select').filter({ has: page.locator('option[value="7"]') }).first();
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toHaveClass('ds-native-select');
    const bounds = await dropdown.boundingBox(); expect(bounds.height).toBeLessThan(60);
    await dropdown.selectOption('7'); await expect(dropdown).toHaveValue('7');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('inbox.png'), fullPage: true });
  });
}
