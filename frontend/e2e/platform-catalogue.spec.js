import { test, expect } from '@playwright/test';
import catalogue from '../src/services/platformCatalogue.generated.json';
for (const width of [1440, 390]) {
  test(`new manifest reaches calendar and writing selectors at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.context().addCookies([{ name: 'socialstats.language', value: 'fa', url: 'http://127.0.0.1:3000' }]);
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fixture-token');
      localStorage.setItem('socialstats.language', 'fa');
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
    });
    const metadata = JSON.parse(JSON.stringify(catalogue));
    const provider = JSON.parse(JSON.stringify(metadata.platforms.find(p => p.key === 'bale')));
    provider.key = 'new_network'; provider.titles = { en: 'New network', fa: 'شبکه جدید' };
    provider.contract.brand = { icon: 'link', color: '#123456' };
    metadata.platforms.push(provider);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'client', account_type: 'legacy', workspace_id: 7, client_id: 7, permissions: {} } });
      if (path.endsWith('/platforms/')) return route.fulfill({ json: metadata });
      return route.fulfill({ json: [] });
    });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    for (const slug of ['calendar', 'caption-writer']) {
      await page.goto(`/dashboard/${slug}`);
      await expect(page.locator('main').getByRole('button', { name: /بله$/ })).toBeVisible();
      const added = page.locator('main').getByRole('button', { name: /شبکه جدید$/ });
      await expect(added).toBeVisible(); await added.click();
      await expect(page.locator('main').getByRole('button', { name: /ایتا$/ })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`${slug}.png`), fullPage: true });
    }
  });
}
