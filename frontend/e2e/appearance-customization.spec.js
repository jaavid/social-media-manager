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

test('density changes shared button, card, badge metrics and preserves touch target sizes', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/login');
  const metrics = async density => page.evaluate(nextDensity => {
    document.documentElement.dataset.density = nextDensity;
    const root = getComputedStyle(document.documentElement);
    return Object.fromEntries(['--density-button-md', '--density-card-md', '--density-badge-inline-md']
      .map(key => [key, parseFloat(root.getPropertyValue(key))]));
  }, density);
  const comfortable = await metrics('comfortable');
  const compact = await metrics('compact');
  expect(compact['--density-card-md']).toBeLessThan(comfortable['--density-card-md']);
  expect(compact['--density-badge-inline-md']).toBeLessThan(comfortable['--density-badge-inline-md']);
  expect(compact['--density-button-md']).toBeLessThan(comfortable['--density-button-md']);
  // Verify the compiled utility classes actually consume the custom properties,
  // not merely that the properties change on the root.
  const rendered = await page.evaluate(() => {
    const element = document.createElement('div');
    element.className = 'p-[var(--density-card-md)]';
    document.body.appendChild(element);
    const measure = density => {
      document.documentElement.dataset.density = density;
      return parseFloat(getComputedStyle(element).paddingTop);
    };
    const metrics = [measure('comfortable'), measure('compact')];
    element.remove();
    return metrics;
  });
  expect(rendered[1]).toBeLessThan(rendered[0]);
});

test('compact controls preserve 44px targets in an actual coarse-pointer browser', { tag: '@smoke' }, async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/login');
    const result = await page.evaluate(() => {
      document.documentElement.dataset.density = 'compact';
      const style = getComputedStyle(document.documentElement);
      return {
        coarse: matchMedia('(pointer: coarse)').matches,
        button: parseFloat(style.getPropertyValue('--density-button-md')),
        icon: parseFloat(style.getPropertyValue('--density-icon-control')),
        control: parseFloat(style.getPropertyValue('--appearance-control-height')),
      };
    });
    expect(result.coarse).toBe(true);
    expect(result.button).toBeGreaterThanOrEqual(44);
    expect(result.icon).toBeGreaterThanOrEqual(44);
    expect(result.control).toBeGreaterThanOrEqual(44);
  } finally {
    await context.close();
  }
});
