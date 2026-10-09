import { test, expect } from '@playwright/test';

test('admin workspace selector and route navigation scope badge requests', async ({ page }) => {
  const counts = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'superadmin', account_type: 'legacy', permissions: {} } });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path.endsWith('/workspaces/')) return route.fulfill({ json: [{ id: 42, name: 'Workspace A' }, { id: 99, name: 'Workspace B' }] });
    const match = path.match(/\/workspaces\/(42|99)\/$/);
    if (match) return route.fulfill({ json: { id: Number(match[1]), name: 'Workspace' } });
    if (path.endsWith('/dashboard/counts/')) {
      const id = Number(url.searchParams.get('workspace_id')); counts.push(id);
      return route.fulfill({ json: { workspace_id: id, unread_inbox: id } });
    }
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.goto('/admin/analytics');
  const selector = page.locator('select').filter({ has: page.locator('option[value="42"]') }).first();
  await expect(selector).toBeVisible();
  expect(counts).toEqual([]);
  await selector.selectOption('42');
  await expect.poll(() => counts.at(-1)).toBe(42);
  await selector.selectOption('99');
  await expect.poll(() => counts.at(-1)).toBe(99);
  await page.goto('/admin/workspaces');
  const previous = counts.length;
  await page.waitForTimeout(500);
  expect(counts.length).toBe(previous);
});
