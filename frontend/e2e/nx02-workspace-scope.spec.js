import { test, expect } from '@playwright/test';

test('admin workspace selector and route navigation scope badge requests', { tag: '@smoke' }, async ({ page }) => {
  // Socket readiness + 2 notification retries can exceed the 30s default.
  test.setTimeout(90_000);
  const counts = [];
  const liveSockets = new Set();
  const sendFixture = message => {
    for (const socket of liveSockets) {
      try { socket.send(JSON.stringify(message)); } catch { liveSockets.delete(socket); }
    }
  };
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
  await page.routeWebSocket('**/ws/**', socket => {
    liveSockets.add(socket);
    socket.onClose(() => liveSockets.delete(socket));
  });
  await page.goto('/admin/analytics');
  const selector = page.locator('header.ds-topbar [data-workspace-context] select');
  await expect(page.locator('header.ds-topbar [data-workspace-context]')).toHaveCount(1);
  await expect(page.locator('aside.ds-feature-sidebar [data-workspace-context]')).toHaveCount(0);
  await expect(selector).toBeVisible();
  expect(counts).toEqual([]);
  await selector.selectOption('42');
  await expect.poll(() => counts.at(-1)).toBe(42);
  await expect.poll(() => liveSockets.size, { timeout: 15000 }).toBeGreaterThan(0);
  // The legacy <select> is a transient navigation control; the scoped
  // counts request, not the option value after navigation, is authoritative.
  // The mocked WebSocket route can be created before the client effect has
  // registered its subscriber. Retry the *fixture notification*, not a write.
  await expect(async () => {
    sendFixture({ type: 'composer.post_failed', client_id: '42', data: { title: 'Active workspace event' } });
    await expect(page.getByText('Publish failed: Active workspace event', { exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await selector.selectOption('99');
  await expect.poll(() => counts.at(-1)).toBe(99);
  // For every attempt, send the rejected event and a *unique* permitted
  // sentinel on the same active socket. Observing the sentinel proves that
  // the foreign-event absence isn't merely a disconnected transport.
  let sentinelSequence = 0;
  await expect(async () => {
    const socket = Array.from(liveSockets).at(-1);
    expect(socket).toBeDefined();
    const title = `Current workspace event ${++sentinelSequence}`;
    socket.send(JSON.stringify({ type: 'composer.post_failed', client_id: 42, data: { title: 'Foreign workspace event' } }));
    socket.send(JSON.stringify({ type: 'composer.post_failed', workspace_id: 99, data: { title } }));
    await expect(page.getByText(`Publish failed: ${title}`, { exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });
  await expect(page.getByText('Publish failed: Foreign workspace event', { exact: true })).toHaveCount(0);
  await page.goto('/admin/analytics/analytics?workspace=42');
  await expect.poll(() => counts.at(-1)).toBe(42);
  await selector.selectOption('99');
  await expect(page).toHaveURL(/workspace=99/);
  await expect.poll(() => counts.at(-1)).toBe(99);
  await selector.selectOption('70');
  await expect(page).toHaveURL(/\/admin\/workspace\/70$/);
  await expect.poll(() => counts.at(-1)).toBe(70);
  await page.goto('/admin/workspaces');
  await expect(page).toHaveURL(/\/admin\/workspaces$/);
  const previous = counts.length;
  await page.waitForTimeout(500);
  expect(counts.length).toBe(previous);
});
