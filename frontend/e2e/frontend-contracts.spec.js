import { test, expect } from '@playwright/test';
const origin = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
async function preferences(context, language = 'en', theme = 'light') {
  await context.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true, analytics: false, marketing: false } })));
  await context.addCookies([{ name: 'socialstats.language', value: language, url: origin }, { name: 'theme', value: theme, url: origin }]);
}
test('parallel locales render independent HTML, semantic content and metadata without JavaScript', async ({ browser, request }) => {
  const results = await Promise.all(['fa', 'en'].map(language => request.get('/', { headers: { Cookie: `socialstats.language=${language}` } }).then(response => response.text())));
  expect(results[0]).toContain('lang="fa"'); expect(results[0]).toContain('dir="rtl"');
  expect(results[0]).toContain('سیستم بازاریابی هوشمند'); expect(results[0]).toContain('سیستم بازاریابی برای تیم‌های مدرن');
  expect(results[1]).toContain('lang="en"'); expect(results[1]).toContain('dir="ltr"');
  expect(results[1]).toContain('AI marketing OS'); expect(results[1]).toContain('The marketing OS for modern teams');
  for (const language of ['fa', 'en']) {
    const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' });
    await preferences(context, language);
    const page = await context.newPage(); await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    expect(await page.locator('h1').textContent()).toContain(language === 'fa' ? 'سیستم بازاریابی هوشمند' : 'AI marketing OS');
    await context.close();
  }
});
test('system theme follows OS changes and persists across reload; locale keeps filters and fragment', async ({ page }) => {
  await preferences(page.context(), 'en', 'system');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/design-system?tab=colors#samples');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.locator('select').first().selectOption('fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveURL(/design-system\?tab=colors#samples$/);
  await expect(page.getByRole('heading', { name: 'مرجع سیستم طراحی' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'مرجع سیستم طراحی' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('product typography, radius, shadow, and self-hosted fonts match their tokens', async ({ page }) => {
  await preferences(page.context());
  const externalFonts = []; page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url()); });
  await page.goto('/design-system');
  const samples = await page.evaluate(async () => {
    await document.fonts.ready;
    const sizes = ['sm', 'base', 'lg'].map(size => getComputedStyle(document.querySelector(`[data-sample="${size}"]`)).fontSize);
    const panel = document.querySelector('.app-surface'); const style = getComputedStyle(panel);
    return { sizes, radius: style.borderRadius, shadow: style.boxShadow, token: getComputedStyle(document.documentElement).getPropertyValue('--product-shadow-md').trim(), font: style.fontFamily, fonts: [...document.fonts].map(font => font.status) };
  });
  expect(samples.sizes).toEqual(['13px', '14px', '16px']); expect(samples.radius).toBe('14px');
  expect(samples.shadow).not.toBe('none'); expect(samples.font).toContain('arabicFont'); expect(samples.fonts).toContain('loaded');
  expect(externalFonts).toEqual([]);
  const primary = page.getByRole('button', { name: 'Primary action' });
  expect(await primary.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
});
test('semantic foreground/background and control contrast meets AA in both themes', async ({ page }, testInfo) => {
  const evidence = [];
  for (const theme of ['light', 'dark']) {
    await preferences(page.context(), 'en', theme); await page.goto('/design-system');
    const pairs = await page.evaluate(() => {
      function color(token) {
        const probe = document.createElement('span'); probe.style.color = `var(--${token})`; document.body.append(probe);
        const values = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number); probe.remove(); return values;
      }
      const blend = (fg, bg) => fg.slice(0, 3).map((value, i) => value * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
      const luminance = rgb => rgb.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
      const contrast = (fg, bg) => { const a = luminance(fg), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
      const result = [];
      for (const surface of ['surface-page', 'surface-card', 'surface-elevated', 'surface-sunken', 'surface-hover']) {
        const background = color(surface);
        for (const foreground of ['text-primary', 'text-secondary', 'text-tertiary', 'text-link']) result.push({ foreground, surface, ratio: contrast(color(foreground), background), minimum: 4.5 });
        for (const status of ['success', 'warning', 'danger', 'info']) result.push({ foreground: status, surface: `${status}-bg/${surface}`, ratio: contrast(color(status), blend(color(`${status}-bg`), background)), minimum: 4.5 });
        for (const foreground of ['border-focus', 'control-border']) result.push({ foreground, surface, ratio: contrast(color(foreground), background), minimum: 3 });
      }
      result.push({ foreground: 'destructive-foreground', surface: 'danger', ratio: contrast(color('destructive-foreground'), color('danger')), minimum: 4.5 });
      for (const surface of ['brand-primary', 'brand-primary-hover', 'brand-primary-active']) result.push({ foreground: 'text-on-brand', surface, ratio: contrast(color('text-on-brand'), color(surface)), minimum: 4.5 });
      return result;
    });
    evidence.push({ theme, pairs });
    for (const pair of pairs) expect(pair.ratio, `${theme} ${pair.foreground}/${pair.surface}`).toBeGreaterThanOrEqual(pair.minimum);
  }
  await testInfo.attach('semantic-contrast.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
});
test('dialog/select layer ordering and keyboard focus restore use the shared scale', async ({ page }) => {
  await preferences(page.context()); await page.goto('/design-system');
  const trigger = page.getByRole('button', { name: 'Open dialog' }); await trigger.click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const select = page.getByRole('combobox'); await select.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  const layers = await page.evaluate(() => [getComputedStyle(document.querySelector('.ds-overlay')).zIndex, getComputedStyle(document.querySelector('.ds-dialog')).zIndex, getComputedStyle(document.querySelector('.ds-select-popup')).zIndex]);
  expect(layers).toEqual(['100', '200', '300']);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
});
test('retirement clears only Social Stats caches', async ({ page }) => {
  await page.goto('/privacy');
  await page.evaluate(async () => { await caches.open('socialstats-old-spa'); await caches.open('unrelated-app'); });
  await page.reload();
  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(['unrelated-app']);
});
