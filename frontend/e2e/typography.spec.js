import { test, expect } from '@playwright/test';
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`typography ${language} ${theme} ${width}`, async ({ page }) => {
    const errors = [], fonts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', entry => { if (entry.type() === 'error' && /hydrat/i.test(entry.text())) errors.push(entry.text()); });
    page.on('response', response => { if (/\.woff2/.test(response.url())) fonts.push(response); });
    await page.context().addCookies([{ name: 'theme', value: theme, url: 'http://127.0.0.1:3000' }]);
    await page.route('**/api/**', route => route.fulfill({ json: {} }));
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true, analytics: false, marketing: false } })));
    await page.goto('/design-system');
    await page.locator('select').first().selectOption(language);
    await page.evaluate(() => document.fonts.ready);
    const catalog = page.locator('[data-typography-catalog]');
    await expect(catalog).toHaveAttribute('lang', language);
    for (const sample of ['fa', 'en']) {
      const specimen = page.locator(`[data-language-sample=${sample}]`);
      const metrics = await specimen.locator('[data-sample=base]').evaluate(el => {
        const css = getComputedStyle(el);
        return { family: css.fontFamily, ratio: parseFloat(css.lineHeight) / parseFloat(css.fontSize), synthesis: css.fontSynthesis };
      });
      expect(metrics.family).toMatch(sample === 'fa' ? /^arabicFont/ : /^latinFont/);
      expect(metrics.ratio).toBeCloseTo(sample === 'fa' ? 1.8 : 1.55, 1);
      expect(metrics.synthesis).toBe('none');
      expect(await specimen.evaluate((el, face) => document.fonts.check(`700 14px ${face}`, el.textContent), sample === 'fa' ? 'arabicFont' : 'latinFont')).toBe(true);
      for (const weight of [400, 500, 600, 700, 800]) expect(await specimen.locator(`[data-weight="${weight}"]`).evaluate(el => getComputedStyle(el).fontWeight)).toBe(String(weight));
      expect(await specimen.locator('input[type=text]').evaluate(el => getComputedStyle(el).direction)).toBe(sample === 'fa' ? 'rtl' : 'ltr');
      expect(await specimen.locator('input[type=email]').evaluate(el => getComputedStyle(el).direction)).toBe('ltr');
      expect(await specimen.locator('button').evaluate(el => el.clientHeight >= parseFloat(getComputedStyle(el).lineHeight) + parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom) - 1)).toBe(true);
    }
    expect(fonts.length).toBe(2);
    for (const font of fonts) { expect(font.status()).toBe(200); expect(new URL(font.url()).origin).toBe('http://127.0.0.1:3000'); }
    expect(errors).toEqual([]);
    expect(await catalog.locator('h1').evaluate(el => getComputedStyle(el).fontWeight)).toBe('700');
    expect(await catalog.locator('h2').first().evaluate(el => getComputedStyle(el).fontWeight)).toBe('600');
    expect(await catalog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `e2e/evidence/typography/${language}-${theme}-${width}.png`, fullPage: true });
    // CSS zoom exercises Chromium reflow at twice the text and control size.
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    expect(await catalog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `e2e/evidence/typography/${language}-${theme}-${width}-200.png`, fullPage: true });
  });
}
test('font preloads and locale typography exist before hydration', async ({ browser }) => {
  for (const language of ['fa', 'en']) {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await context.addCookies([{ name: 'socialstats.language', value: language, url: 'http://127.0.0.1:3000' }]);
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    expect(await page.evaluate(() => [...document.fonts].filter(font => ['arabicFont', 'latinFont'].includes(font.family)).length)).toBe(2);
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toMatch(language === 'fa' ? /^arabicFont/ : /^latinFont/);
    await context.close();
  }
});

for (const language of ['fa', 'en']) {
  test(`active settings typography ${language}`, async ({ page }) => {
    await page.context().addCookies([{ name: 'socialstats.language', value: language, url: 'http://127.0.0.1:3000' }]);
    await page.addInitScript(locale => {
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('socialstats.language', locale);
    }, language);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me/') return route.fulfill({ json: { id: 1, role: 'staff', name: 'Typography tester', email: 'team@example.test', account_type: 'legacy', permissions: {} } });
      if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'test-csrf' } });
      return route.fulfill({ json: /\/(workspaces|alerts|notifications|invitations)\/$/.test(path) ? [] : {} });
    });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto('/admin/account-settings');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    const heading = page.getByRole('heading', { name: language === 'fa' ? 'تنظیمات' : 'Settings', exact: true });
    await expect(heading).toBeVisible();
    const style = await heading.evaluate(el => {
      const css = getComputedStyle(el);
      return { weight: css.fontWeight, ratio: parseFloat(css.lineHeight) / parseFloat(css.fontSize), family: css.fontFamily };
    });
    expect(style.weight).toBe('700');
    expect(style.ratio).toBeCloseTo(language === 'fa' ? 1.45 : 1.2, 1);
    expect(style.family).toMatch(language === 'fa' ? /^arabicFont/ : /^latinFont/);
  });
}
