import { mockComposerConnections } from './composer-fixture';
import { test, expect } from '@playwright/test';

const rich = { is_rtl: true, blocks: [{ type: 'heading', text: 'عنوان خبر', size: 2 }, { type: 'paragraph', text: 'متن فارسی' }, { type: 'pullquote', text: 'نقل قول' }] };
const post = { status: 'draft', scheduled_at: null, id: 1, client: 1, title: 'Telegram review', content: '', media_type: 'rich', target_platforms: ['telegram'], media_urls: [], platform_overrides: { telegram: { social_account_id: 1, rich_message: rich } } };

async function setup(page, onWrite) {
  await page.context().addCookies([{ name: 'socialstats.language', value: 'en', url: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000' }, { name: 'csrftoken', value: 'e2e-csrf', url: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000' }]);
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('socialstats.language', 'en');
  });
  await page.route('**/api/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let json = {};
    if (path.endsWith('/auth/me/')) json = { id: 1, role: 'superadmin', account_type: 'legacy', client_id: 1, workspace_id: 1, email: 'operator@example.test', permissions: {} };
    else if (path.includes('/composer/posts/1/')) {
      if (request.method() === 'PATCH' || request.method() === 'PUT') onWrite?.(request.postDataJSON());
      json = post;
    } else if (path.includes('/social-accounts/')) json = [{ id: 1, client: 1, platform: 'telegram', display_name: 'News', is_active: true }];
    else if (path.includes('/oauth/status/') || path.includes('/bot-channels/')) json = { telegram: { status: 'active' } };
    else if (path.includes('/telegram-suggestions/')) json = [{ id: 1, account: 1, account_name: 'News', sender_name: 'Reader', content: 'Suggested post', state: 'received', provider_state: 'pending', proposal: { price: { amount: 10, currency: 'XTR' } }, media: {} }];
    else if (/\/(workspaces|notifications|alerts|invitations|conversations|queues)\/$/.test(path)) json = [];
    return route.fulfill({ json });
  });
  await mockComposerConnections(page, 1, 'telegram');
  await page.routeWebSocket('**/ws/**', socket => socket.close());
}

test('Telegram Rich Article preserves RTL structured content on save', async ({ page }, testInfo) => {
  let saved;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await setup(page, payload => { saved = payload; });
  await page.goto('/admin/analytics/composer/1');
  await expect(page.getByText('Telegram Rich Article / Slideshow / Collage', { exact: true })).toBeVisible();
  await page.getByLabel('paragraph text').fill('متن جدید');
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  await expect.poll(() => saved?.platform_overrides?.telegram?.rich_message?.blocks?.[1]?.text).toBe('متن جدید');
  expect(saved.media_type).toBe('rich');
  expect(saved.platform_overrides.telegram.rich_message.is_rtl).toBe(true);
  expect(saved.target_platforms).toEqual(['telegram']);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('telegram-composer.png'), fullPage: true });
});

test('Telegram poll composer saves ordered options', async ({ page }) => {
  let saved;
  await setup(page, payload => { saved = payload; });
  await page.goto('/admin/analytics/composer/1');
  await page.getByLabel('Content mode').selectOption('poll');
  await page.getByLabel('Poll question', { exact: true }).fill('Which headline?');
  await page.getByLabel('Poll answers', { exact: true }).fill('First\nSecond');
  await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
  await expect.poll(() => saved?.media_type).toBe('poll');
  expect(saved.platform_overrides.telegram.poll.options).toEqual(['First', 'Second']);
});

test('paid Telegram suggestions display financial terms without an approval button', async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/admin/analytics/inbox');
  await page.getByRole('combobox', { name: 'Account / destination' }).selectOption('1');
  await expect(page.getByText('Suggested post', { exact: true })).toBeVisible();
  await expect(page.getByText(/10 XTR/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve on Telegram', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy to draft', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('telegram-suggestions.png'), fullPage: true });
});
