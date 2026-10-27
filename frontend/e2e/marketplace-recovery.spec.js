import { test, expect } from '@playwright/test';

async function fixture(page, responder) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('socialstats.language', 'fa');
    localStorage.setItem('socialstats_cookie_choice', JSON.stringify({
      version: '2024-11-01', choices: { essential: true, functional: true },
    }));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({
      json: { id: 1, role: 'superadmin', account_type: 'legacy', workspace_id: 7, client_id: 7, permissions: {} },
    });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path.endsWith('/marketplace/featured/')) return route.fulfill({ json: { agencies: [] } });
    if (path.endsWith('/marketplace/categories/')) return route.fulfill({ json: { industries: [], services: [] } });
    if (path.endsWith('/marketplace/agencies/')) return responder(route);
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
}

test('marketplace GET failure is an alert, never an empty search, and retry recovers', async ({ page }) => {
  let reads = 0;
  const writes = [];
  page.on('request', req => { if (req.method() !== 'GET') writes.push(req.url()); });
  await fixture(page, route => {
    reads++;
    if (reads === 1) return route.fulfill({ status: 503, json: { detail: 'Sensitive backend failure' } });
    return route.fulfill({ json: { agencies: [{ id: 10, slug: 'fixture', name: 'Recovered agency', review_count: 0 }], count: 1 } });
  });
  await page.goto('/marketplace');
  await expect(page.getByRole('alert')).toContainText('دریافت فهرست آژانس‌ها ناموفق بود');
  await expect(page.getByText('آژانسی مطابق فیلترها پیدا نشد')).toHaveCount(0);
  await expect(page.getByText('Sensitive backend failure')).toHaveCount(0);
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await expect(page.getByText('Recovered agency')).toBeVisible();
  expect(reads).toBe(2);
  expect(writes.filter(url => url.includes('/marketplace/'))).toEqual([]);
});

test('successful empty marketplace response is a no-results state', async ({ page }) => {
  await fixture(page, route => route.fulfill({ json: { agencies: [], count: 0 } }));
  await page.goto('/marketplace');
  await expect(page.getByText('آژانسی مطابق فیلترها پیدا نشد')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
