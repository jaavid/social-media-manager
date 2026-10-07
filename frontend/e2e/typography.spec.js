import { test, expect } from '@playwright/test';
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'off', video: 'off' });
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`typography ${language} ${theme} ${width}`, async ({ page }) => {
    const errors = [], fonts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', entry => { if (entry.type() === 'error' && /hydrat/i.test(entry.text())) errors.push(entry.text()); });
    page.on('response', response => { if (/\.woff2/.test(response.url())) fonts.push(response); });
    await page.context().addCookies([{ name: 'theme', value: theme, url: base }]);
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
      for (const cell of await specimen.locator('td').all()) expect(await cell.evaluate(el => el.clientHeight >= parseFloat(getComputedStyle(el).lineHeight))).toBe(true);
      expect(await specimen.locator('button').evaluate(el => el.clientHeight >= parseFloat(getComputedStyle(el).lineHeight) + parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom) - 1)).toBe(true);
    }
    expect(fonts.length).toBe(2);
    for (const font of fonts) { expect(font.status()).toBe(200); expect(new URL(font.url()).origin).toBe(base); }
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
    await context.addCookies([{ name: 'socialstats.language', value: language, url: base }]);
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    expect(await page.evaluate(() => [...document.fonts].filter(font => ['arabicFont', 'latinFont'].includes(font.family)).length)).toBe(2);
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toMatch(language === 'fa' ? /^arabicFont/ : /^latinFont/);
    await context.close();
  }
});

for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`active settings typography ${language} ${theme} ${width}`, async ({ page }) => {
    await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }, { name: 'theme', value: theme, url: base }]);
    await page.addInitScript(locale => {
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
      localStorage.setItem('socialstats.language', locale);
    }, language);
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me/') return route.fulfill({ json: { id: 1, role: 'staff', name: 'Typography tester', email: 'team@example.test', account_type: 'legacy', permissions: {} } });
      if (path === '/api/profile/') return route.fulfill({ json: { id: 1, first_name: 'پیش‌نویس', last_name: 'ی ک پ چ ژ گ', email: 'team@example.test', avatar: null } });
      if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'test-csrf' } });
      return route.fulfill({ json: /\/(workspaces|alerts|notifications|invitations)\/$/.test(path) ? [] : {} });
    });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    await page.setViewportSize({ width, height: 900 });
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
    const main = page.locator('main');
    if (!process.env.E2E_UI_BASELINE) expect(await main.evaluate(el => parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(language === 'fa' ? 1.8 : 1.55, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (!process.env.E2E_UI_BASELINE) { const box = await heading.boundingBox(); expect(box.x).toBeGreaterThan(0); expect(box.x + box.width).toBeLessThan(width); }
    await page.screenshot({ path: `e2e/evidence/typography/product-${process.env.E2E_UI_BASELINE ? 'before' : 'after'}-${language}-${theme}-${width}.png`, fullPage: true });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(heading).toBeVisible();
    for (const input of await main.locator('input:not([type=file])').all()) expect(await input.evaluate(el => el.clientHeight >= parseFloat(getComputedStyle(el).lineHeight) + parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom) - 1)).toBe(true);
    if (!process.env.E2E_UI_BASELINE) { const upload = main.getByRole('button', { name: language === 'fa' ? 'انتخاب عکس' : 'Choose photo', exact: true }); await expect(upload).toBeVisible(); expect(await upload.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true); }
    const mobile = page.locator('.ds-mobile-nav');
    if (width === 360) { await mobile.getByRole('link').last().focus(); await expect(mobile.getByRole('link').last()).toBeInViewport(); }
    await page.screenshot({ path: `e2e/evidence/typography/product-${process.env.E2E_UI_BASELINE ? 'before' : 'after'}-${language}-${theme}-${width}-200.png`, fullPage: true });
  });
}

test('local font failure keeps readable fallback and locale specimens can switch', async ({ page }) => {
  await page.route('**/*.woff2', route => route.abort());
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.goto('/design-system');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-typography-catalog]')).toBeVisible();
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Arial');
  for (const locale of ['en', 'fa', 'en']) {
    await page.locator('select').first().selectOption(locale);
    await expect(page.locator('[data-typography-catalog]')).toHaveAttribute('lang', locale);
    expect(await page.locator('[data-typography-catalog]').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

for (const route of ['/', '/product/analytics', '/solutions/agencies']) for (const theme of ['light','dark']) test(`public display/body roles ${route} ${theme}`,async({page})=>{
  await page.context().addCookies([{name:'theme',value:theme,url:base}]);
  await page.route('**/api/**',r=>r.fulfill({json:{}}));await page.goto(route);await page.evaluate(()=>document.fonts.ready);
  const display=page.locator('h1[data-typography="display"]');await expect(display).toBeVisible();expect(await display.evaluate(el=>getComputedStyle(el).fontWeight)).toBe('800');
  const prose=display.locator('..').locator('p').first();await expect(prose).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>{
    const el=document.querySelector('h1[data-typography="display"]')?.parentElement?.querySelector('p');
    if (!el) return null;
    const css=getComputedStyle(el);
    return {weight:css.fontWeight,ratio:Math.round(parseFloat(css.lineHeight)/parseFloat(css.fontSize)*100)/100};
  })).toEqual({weight:'400',ratio:1.8});
});
