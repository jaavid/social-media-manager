import { mockComposerConnections } from './composer-fixture';
import { test, expect } from '@playwright/test';

for (const role of ['client', 'superadmin']) {
  test(`${role}: queue failure preserves editor and retry only enqueues`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1400 });
    const writes = [];
    let failEnqueue = true;
    const post = { title: '', status: 'draft', scheduled_at: null, id: 900, client: 7, content: 'Content intended for the queue', media_type: 'text', target_platforms: ['facebook'], media_urls: [], platform_overrides: {} };
    await page.context().addCookies([{ name: 'socialstats.language', value: 'en', url: 'http://127.0.0.1:3000' }]);
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'test-token');
      localStorage.setItem('socialstats.language', 'en');
      localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
    });
    await page.route('**/api/**', route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (['POST', 'PATCH', 'PUT'].includes(request.method()) && path.includes('/composer/posts/')) writes.push({ path, payload: request.postDataJSON() });
      if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role, account_type: 'legacy', client_id: 7, workspace_id: 7, email: 'queue@example.test', permissions: {} } });
      if (path.endsWith('/add_to_queue/')) return route.fulfill({ status: failEnqueue ? 400 : 201, json: failEnqueue ? { detail: 'Queue temporarily unavailable' } : { id: 12 } });
      if (path.includes('/composer/posts/')) return route.fulfill({ json: post });
      if (path.includes('/composer/queues/')) return route.fulfill({ json: [{ id: 11, client: 7, name: 'Evening Facebook', platforms: ['facebook'], is_active: true }] });
      if (path.includes('/oauth/status/') || path.includes('/bot-channels/')) return route.fulfill({ json: { facebook: { status: 'active', connected: true } } });
      return route.fulfill({ json: [] });
    });
    await page.routeWebSocket('**/ws/**', socket => socket.close());
    await mockComposerConnections(page);
    await page.goto(`/${role === 'client' ? 'dashboard' : 'admin'}/analytics/composer`);
    await page.getByRole('button', { name: 'Facebook', exact: true }).first().click();
    await page.locator('textarea').first().fill(post.content);
    await page.getByRole('button', { name: 'Add to Queue', exact: true }).click();
    const action = page.getByRole('button', { name: 'Add to Queue', exact: true }).first();
    await expect(action).toBeDisabled();
    await page.getByLabel('Destination queue').selectOption('11');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('composer-queue-selected.png'), fullPage: false });
    await action.click();
    await expect(page.getByText('The operation could not be completed. Your input is preserved.', { exact: true })).toBeVisible();
    await expect(page.locator('textarea').first()).toHaveValue(post.content);
    await expect(page.getByLabel('Destination queue')).toHaveValue('11');
    await expect(page.getByRole('button', { name: 'Publish Now', exact: true })).toHaveCount(0);
    failEnqueue = false;
    await action.click();
    await expect.poll(() => writes.filter(write => write.path.endsWith('/add_to_queue/')).length).toBe(2);
    expect(writes.filter(write => write.path === '/api/composer/posts/')).toHaveLength(1);
    expect(writes.filter(write => /\/(publish_now|schedule)\/$/.test(write.path))).toEqual([]);
    expect(writes.filter(write => write.path.endsWith('/add_to_queue/')).map(write => write.payload)).toEqual([{ queue_id: 11 }, { queue_id: 11 }]);
  });
}
