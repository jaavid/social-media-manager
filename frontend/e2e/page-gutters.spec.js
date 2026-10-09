import { test, expect } from '@playwright/test';

for (const language of ['fa', 'en']) for (const width of [1440, 390]) {
  test(`page gutters ${language} ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.context().addCookies([{ name: 'socialstats.language', value: language, url: 'http://127.0.0.1:3000' }]);
    await page.addInitScript(language => {
      localStorage.setItem('access_token', 'fixture-token');
      localStorage.setItem('socialstats.language', language);
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
    }, language);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'client', account_type: 'legacy', workspace_id: 7, client_id: 7, permissions: {} } });
      return route.fulfill({ json: [] });
    });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    for (const slug of ['posts', 'queues', 'automations', 'media']) {
      await page.goto(`/dashboard/${slug}`);
      const title = page.locator('main h1').first();
      await expect(title).toBeVisible();
      const main = await page.locator('main').boundingBox();
      const heading = await title.boundingBox();
      const gutter = language === 'fa' ? main.x + main.width - heading.x - heading.width : heading.x - main.x;
      expect(gutter).toBeGreaterThanOrEqual(width === 390 ? 11 : 31);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (slug === 'queues' && language === 'fa') await expect(page.getByText('انتشار خودکار و دوره‌ای محتواهای آماده از صف')).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${slug}.png`), fullPage: true });
    }
  });
}
