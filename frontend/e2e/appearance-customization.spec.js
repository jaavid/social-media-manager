import { test, expect } from '@playwright/test';
const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

test('saved system-dark appearance is restored from inline head script', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.context().addCookies([{ name: 'theme', value: 'system', url: base }]);
  await page.addInitScript(() => {
    localStorage.setItem('ravinta.appearance.v1', JSON.stringify({
      dark: { primary: '#bce272', onPrimary: '#102b29', page: '#132824', card: '#224036', text: '#ffffff' },
      light: { primary: '#123d3a', onPrimary: '#ffffff', page: '#f7f9f8', card: '#ffffff', text: '#172a28' },
      textScale: 110, radiusScale: 110, spacing: 4, density: 'compact', motion: 'reduced',
    }));
  });
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-density', 'compact');
  const colors = await page.evaluate(() => Object.fromEntries(
    ['--brand-primary', '--surface-page', '--brand-primary-hover'].map(token =>
      [token, getComputedStyle(document.documentElement).getPropertyValue(token).trim()])
  ));
  expect(colors['--brand-primary']).toBe('#bce272');
  expect(colors['--surface-page']).toBe('#132824');
  expect(colors['--brand-primary-hover']).toMatch(/^#[0-9a-f]{6}$/i);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim()
  )).toBe('#123d3a');
});

test('without saved appearance the browser keeps canonical brand hover tokens', async ({ page }) => {
  await page.context().addCookies([{ name: 'theme', value: 'light', url: base }]);
  await page.goto('/login');
  const hover = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--brand-primary-hover').trim());
  expect(hover).toBe('#1a514b');
});
