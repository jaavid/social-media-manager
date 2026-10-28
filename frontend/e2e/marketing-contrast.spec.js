import { test, expect } from '@playwright/test';

for (const theme of ['light', 'dark']) for (const path of ['/', '/customers', '/product/ai', '/integrations']) {
  test(`marketing link-button contrast ${theme} ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.context().addCookies([{ name: 'theme', value: theme, url: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000' }]);
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('header nav').first()).toBeVisible();
    const buttons = page.locator('a[class*="text-[var(--text-on-brand)]"], header nav > a, header nav > button');
    expect(await buttons.count()).toBeGreaterThan(1);
    let ratios;
    // Hydration and theme-color transitions can briefly expose intermediate colors.
    // Assert the same WCAG threshold on the settled rendered state; a persistent
    // contrast regression still fails, with CSS colors included for diagnosis.
    await expect(async () => {
      ratios = await buttons.evaluateAll(elements => {
      // Chromium computes CSS Color 4 values as oklch()/color(srgb) too.
      // Decode every CSS color into actual sRGB rather than extracting the
      // first three numbers from a string and accidentally reporting 1:1.
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const pixel = css => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data].map(v => v / 255);
      };
      const composite = (front, back) => {
        const alpha = front[3] + back[3] * (1 - front[3]);
        if (!alpha) return [0, 0, 0, 0];
        return [0, 1, 2].map(i => (front[i] * front[3] + back[i] * back[3] * (1 - front[3])) / alpha).concat(alpha);
      };
      const luminance = rgba => rgba.slice(0, 3)
        .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      const contrast = (front, back) => {
        const values = [luminance(front), luminance(back)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      const backdrop = element => {
        let color = [1, 1, 1, 1]; // Default white root canvas
        const nodes = [];
        for (let node = element; node && node.nodeType === 1; node = node.parentElement) nodes.unshift(node);
        for (const node of nodes) color = composite(pixel(getComputedStyle(node).backgroundColor), color);
        return color;
      };
      return elements.map(element => {
        const style = getComputedStyle(element);
        const background = backdrop(element);
        const gradients = style.backgroundImage.match(/(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/g) || [];
        const samples = gradients.length ? gradients.map(stop => composite(pixel(stop), background)) : [background];
        const foreground = composite(pixel(style.color), background);
        return { text: element.textContent.trim(), color: style.color,
          background: style.backgroundColor, ratios: samples.map(sample => contrast(foreground, sample)) };
      });
      });
      for (const button of ratios) for (const ratio of button.ratios) {
        expect(ratio, `${button.text} (color=${button.color}, background=${button.background})`).toBeGreaterThanOrEqual(4.5);
      }
    }).toPass({ timeout: 12000 });
    console.log(`${theme} ${path}: minimum CTA contrast ${Math.min(...ratios.flatMap(button => button.ratios)).toFixed(2)}:1`);
    const navigation = page.locator('header nav').first();
    const bounds = await navigation.locator(':scope > a, :scope > button').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { center: rect.y + rect.height / 2, height: rect.height };
    }));
    expect(bounds.length).toBe(5);
    for (const item of bounds) {
      expect(Math.abs(item.center - bounds[0].center)).toBeLessThan(1);
      expect(item.height).toBe(bounds[0].height);
    }
    if (path === '/') {
      await expect(page.getByText('دموی ۹۰ ثانیه‌ای را ببینید')).toBeVisible();
      await expect(page.getByText('نگار احمدی', { exact: true }).first()).toBeAttached();
      await expect(page.getByText('https://ravinta.ir', { exact: true }).first()).toBeAttached();
      expect(await page.locator('body').innerText()).not.toMatch(/پریا|دیوالی|دهه 90|جوانه اجتماعی|پرداخت هندی|localhost:3000/);
    }
    if (process.env.MARKETING_SCREENSHOTS && ['/', '/customers'].includes(path)) {
      await page.screenshot({ path: `${process.env.MARKETING_SCREENSHOTS}/${path === '/' ? 'home' : 'customers'}-${theme}.png`,
        ...(path === '/customers' ? { clip: { x: 0, y: 0, width: 1440, height: 530 } } : {}) });
    }
  });
}

test('Persian marketing navigation and CTA remain usable on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/customers');
  await page.getByRole('button', { name: 'باز کردن منو', exact: true }).click();
  const signup = page.getByRole('link', { name: 'شروع رایگان', exact: true }).filter({ visible: true }).first();
  await expect(signup).toBeVisible();
  const size = await signup.boundingBox();
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(size.height).toBeGreaterThanOrEqual(44);
  if (process.env.MARKETING_SCREENSHOTS) await page.screenshot({ path: `${process.env.MARKETING_SCREENSHOTS}/customers-mobile.png` });
});
