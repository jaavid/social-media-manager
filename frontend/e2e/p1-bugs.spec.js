import { mockComposerConnections } from './composer-fixture';
import { test, expect } from '@playwright/test';

async function session(page, { role = 'superadmin', language = 'en', theme = 'light', respond } = {}) {
  await page.context().addCookies([
    { name: 'socialstats.language', value: language, url: 'http://127.0.0.1:3000' },
    { name: 'theme', value: theme, url: 'http://127.0.0.1:3000' },
  ]);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('socialstats.language', language);
    localStorage.setItem('theme', theme);
    localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
  }, { language, theme });
  await page.route('**/api/**', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role, account_type: 'legacy', client_id: 7, workspace_id: 7, permissions: {} } });
    if (url.pathname.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'e2e-csrf' } });
    return respond?.(route, url, request) || route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
}

for (const role of ['client', 'superadmin']) {
  test(`${role}: Save Draft and reload stay in the permitted composer`, async ({ page }) => {
    const post = { title: '', status: 'draft', scheduled_at: null, id: 901, client: 7, content: 'Saved draft content', media_type: 'text', target_platforms: ['facebook'], media_urls: [], platform_overrides: {} };
    await session(page, { role, respond: (route, url) => {
      if (url.pathname.includes('/composer/posts/')) return route.fulfill({ json: post });
      if (url.pathname.includes('/oauth/status/') || url.pathname.includes('/bot-channels/')) return route.fulfill({ json: { facebook: { status: 'active', connected: true } } });
    } });
    const base = `/${role === 'client' ? 'dashboard' : 'admin'}/analytics/composer`;
    await mockComposerConnections(page);
    await page.goto(base);
    await page.getByRole('button', { name: 'Facebook', exact: true }).first().click();
    await page.locator('textarea').first().fill(post.content);
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${base}/901$`));
    await expect(page.locator('textarea').first()).toHaveValue(post.content);
    await page.reload();
    await expect(page.locator('textarea').first()).toHaveValue(post.content);
  });
}

test('Leads opens, switches view and restores it after reload', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await session(page, { respond: (route, url) => {
    if (url.pathname === '/api/leads/') return route.fulfill({ json: [{ id: 1, name: 'Fixture lead', status: 'new', score: 0 }] });
  } });
  await page.goto('/admin/leads');
  await expect(page.getByRole('heading', { name: /Leads/ })).toBeVisible();
  await page.getByRole('button', { name: 'Kanban view' }).click();
  await expect(page.getByText('Qualified', { exact: true }).last()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Qualified', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Table view' }).click();
  expect(errors).toEqual([]);
});

test('Contact provides a real channel without claiming a message was received', async ({ page }, testInfo) => {
  await session(page);
  await page.goto('/contact');
  await expect(page.getByRole('link', { name: 'ثبت مسئله در گیت‌هاب', exact: true })).toHaveAttribute('href', 'https://github.com/jaavid/social-media-manager/issues/new/choose');
  await expect(page.getByText('دریافت پیام از این صفحه هنوز فعال نیست.', { exact: false })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('ما پیام شما را دریافت کردیم');
  await expect(page.locator('body')).not.toContainText('ظرف یک روز کاری');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath('after-contact.png'), fullPage: true });
});

test('Queue add failure keeps text; successful retry closes and refreshes counts', async ({ page }) => {
  let fail = true;
  let count = 0;
  const queue = () => ({ id: 11, client: 7, name: 'Morning queue', items_count: count, waiting_count: count, platforms: ['facebook'], is_active: true });
  await session(page, { respond: (route, url, request) => {
    if (url.pathname.endsWith('/add_items/')) {
      expect(request.postDataJSON()).toEqual({ items: [{ content: 'Keep my queue draft' }] });
      if (fail) return route.fulfill({ status: 500, json: { detail: 'Unavailable' } });
      count++; return route.fulfill({ status: 201, json: { added: 1 } });
    }
    if (url.pathname === '/api/composer/queues/11/') return route.fulfill({ json: queue() });
    if (url.pathname === '/api/composer/queues/') return route.fulfill({ json: [queue()] });
  } });
  await page.goto('/admin/analytics/queues');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await page.getByRole('textbox', { name: 'Post content' }).fill('Keep my queue draft');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText('Your content is preserved');
  await expect(page.getByRole('textbox', { name: 'Post content' })).toHaveValue('Keep my queue draft');
  fail = false;
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Post content' })).toHaveCount(0);
  await expect(page.getByText('1 waiting', { exact: true }).first()).toBeVisible();
});

test('Inbox never offers Bob’s unsent text as a reply to Alice', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const conversations = [{ id: 1, contact_name: 'Bob', platform: 'facebook', type: 'dm', messages: [] }, { id: 2, contact_name: 'Alice', platform: 'facebook', type: 'dm', messages: [] }];
  const writes = [];
  await session(page, { respond: (route, url, request) => {
    if (url.pathname.includes('/inbox/conversations/')) {
      if (request.method() === 'POST') { writes.push(url.pathname); return route.fulfill({ json: {} }); }
      const id = Number(url.pathname.match(/conversations\/(\d+)\//)?.[1]);
      return route.fulfill({ json: id ? conversations.find(item => item.id === id) : conversations });
    }
  } });
  await page.goto('/admin/analytics/inbox');
  await page.locator('textarea').fill('Private reply for Bob');
  await page.getByRole('button', { name: /Alice/ }).click();
  await expect(page.locator('textarea')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /Bob/ }).click();
  await expect(page.locator('textarea')).toHaveValue('');
  expect(writes).toEqual([]);
});

for (const width of [360, 390]) {
  for (const language of ['fa', 'en']) {
    for (const theme of ['light', 'dark']) {
      test(`WhatsApp ${width}px ${language} ${theme}: list → readable thread → back`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        const contact = { id: 5, name: 'Mobile contact', phone: '+15550123456', within_24h_window: true };
        const writes = [];
        await session(page, { language, theme, respond: (route, url, request) => {
          if (url.pathname === '/api/whatsapp/inbox/') return route.fulfill({ json: [{ contact, within_24h: true, unread_count: 0 }] });
          if (url.pathname === '/api/whatsapp/inbox/thread/') return route.fulfill({ json: { contact, messages: [{ id: 10, direction: 'inbound', message_type: 'text', payload: { body: 'Readable mobile message' }, created_at: '2026-10-05T12:00:00Z' }] } });
          if (url.pathname === '/api/whatsapp/send/') { writes.push(request.postDataJSON()); return route.fulfill({ json: { id: 11 } }); }
        } });
        await page.goto('/admin/messaging/inbox');
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(page.locator('html')).toHaveAttribute('lang', language);
        await expect(page.locator('.whatsapp-conversations')).toBeVisible();
        await expect(page.locator('.whatsapp-thread')).not.toBeVisible();
        await page.getByRole('button', { name: /Mobile contact/ }).click();
        await expect(page.getByText('Readable mobile message', { exact: true })).toBeVisible();
        const box = await page.locator('.whatsapp-thread').boundingBox();
        expect(box.width).toBeGreaterThan(width - 80);
        const reply = page.getByRole('textbox', { name: language === 'fa' ? 'متن پاسخ' : 'Reply message' });
        await reply.fill('Mobile reply');
        await reply.focus();
        const send = page.getByRole('button', { name: language === 'fa' ? 'ارسال پیام' : 'Send message' });
        await expect(send).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`after-whatsapp-${width}-${language}-${theme}.png`), fullPage: true });
        await send.click();
        await expect(reply).toHaveValue('');
        expect(writes).toEqual([{ contact_id: 5, type: 'text', payload: { body: 'Mobile reply' } }]);
        // A reduced visual viewport approximates the space available with a keyboard.
        await page.setViewportSize({ width, height: 520 });
        await reply.fill('Another reply');
        await reply.scrollIntoViewIfNeeded();
        await expect(send).toBeVisible();
        await page.getByRole('button', { name: language === 'fa' ? 'بازگشت به گفتگوها' : 'Back to conversations' }).click();
        await expect(page.locator('.whatsapp-conversations')).toBeVisible();
        await page.getByRole('button', { name: /Mobile contact/ }).click();
        await expect(reply).toHaveValue('');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.setViewportSize({ width: 1440, height: 1000 });
        await expect(page.locator('.whatsapp-conversations')).toBeVisible();
        await expect(page.locator('.whatsapp-thread')).toBeVisible();
        await expect(page.locator('.whatsapp-back')).not.toBeVisible();
      });
    }
  }
}
