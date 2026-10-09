import { test, expect } from '@playwright/test';

test('admin workspace selector and route navigation scope badge requests', async ({ page }) => {
  const counts = [];
  let liveSocket;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'superadmin', account_type: 'legacy', permissions: {} } });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path.endsWith('/workspaces/')) return route.fulfill({ json: [{ id: 42, name: 'Workspace A', company: 'Workspace A' }, { id: 99, name: 'Workspace B', company: 'Workspace B' }, { id: 70, name: 'Workspace C', company: 'Workspace C' }] });
    const match = path.match(/\/workspaces\/(42|99|70)\/$/);
    if (match) return route.fulfill({ json: { id: Number(match[1]), name: 'Workspace' } });
    if (path.endsWith('/dashboard/counts/')) {
      const id = Number(url.searchParams.get('workspace_id')); counts.push(id);
      return route.fulfill({ json: { workspace_id: id, unread_inbox: id } });
    }
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => { liveSocket = socket; });
  await page.goto('/admin/analytics');
  const selector = page.locator('select').filter({ has: page.locator('option[value="42"]') }).first();
  await expect(selector).toBeVisible();
  expect(counts).toEqual([]);
  await selector.selectOption('42');
  await expect.poll(() => counts.at(-1)).toBe(42);
  await expect.poll(() => Boolean(liveSocket)).toBe(true);
  liveSocket.send(JSON.stringify({ type: 'composer.post_failed', client_id: '42', data: { title: 'Active workspace event' } }));
  await expect(page.getByText('Publish failed: Active workspace event', { exact: true })).toBeVisible();
  await selector.selectOption('99');
  await expect.poll(() => counts.at(-1)).toBe(99);
  liveSocket.send(JSON.stringify({ type: 'composer.post_failed', client_id: 42, data: { title: 'Foreign workspace event' } }));
  liveSocket.send(JSON.stringify({ type: 'composer.post_failed', workspace_id: 99, data: { title: 'Current workspace event' } }));
  await expect(page.getByText('Publish failed: Current workspace event', { exact: true })).toBeVisible();
  await expect(page.getByText('Publish failed: Foreign workspace event', { exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('listbox', { name: 'Workspace', exact: true }).getByRole('option', { name: 'Workspace C', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/workspace\/70$/);
  await expect.poll(() => counts.at(-1)).toBe(70);
  await page.getByRole('combobox', { name: 'Workspace', exact: true }).click();
  await page.getByRole('listbox', { name: 'Workspace', exact: true }).getByRole('option', { name: /All workspaces|همه فضاهای کاری/ }).click();
  await expect(page).toHaveURL(/\/admin\/workspaces$/);
  const previous = counts.length;
  await page.waitForTimeout(500);
  expect(counts.length).toBe(previous);
});
