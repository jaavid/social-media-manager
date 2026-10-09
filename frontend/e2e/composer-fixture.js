import { expect } from '@playwright/test';
import { connectionFixture, connectionAccount } from '../src/services/__fixtures__/connections';
export function legacyComposerConnections(workspaceId = 7, platform = 'facebook') {
  const wire = connectionFixture(workspaceId);
  const provider = wire.providers[0];
  provider.key = platform;
  provider.titles = { en: platform === 'telegram' ? 'Telegram' : 'Facebook', fa: platform === 'telegram' ? 'تلگرام' : 'فیس‌بوک' };
  provider.capabilities = { ...provider.capabilities, publish_image: 'supported', publish_video: 'supported', scheduling: 'supported', inbox: 'supported', comments: platform === 'telegram' ? 'not_available' : 'supported' };
  const mode = name => ({ capability: 'publish_text', constraints: { max_characters: 4096 }, ui_extension: platform === 'telegram' ? 'telegram_composer' : '' });
  provider.contract.publishing_modes = platform === 'telegram' ? Object.fromEntries(['text', 'image', 'video', 'carousel', 'album', 'rich', 'poll'].map(m => [m, mode(m)])) : { text: mode('text') };
  if (platform === 'telegram') provider.contract.ui_extensions = ['telegram_composer', 'telegram_engagement'];
  provider.accounts = [{ ...connectionAccount(workspaceId), id: workspaceId, name: platform === 'telegram' ? 'News' : 'First account' }];
  return wire;
}
export async function mockComposerConnections(page, workspaceId = 7, platform = 'facebook') {
  await page.route(`**/api/workspaces/${workspaceId}/connections/**`, route => route.fulfill({ json: legacyComposerConnections(workspaceId, platform) }));
}

export async function setupComposer(page, { language = 'en', theme = 'light', scheduling = false } = {}) {
  const wire = connectionFixture();
  wire.providers[0].accounts = [connectionAccount(), connectionAccount(11)];
  if (scheduling) wire.providers[0].capabilities.scheduling = 'supported';
  const state = { wire, writes: [], failSave: false, failPublish: null, failQueue: false, failRead: false,
    post: { id: 900, client: 7, title: '', content: '', media_urls: [], media_type: 'text', target_platforms: [], platform_overrides: {}, scheduled_at: null, status: 'draft' } };
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: 'http://127.0.0.1:3000' }, { name: 'theme', value: theme, url: 'http://127.0.0.1:3000' }, { name: 'csrftoken', value: 'e2e-csrf', url: 'http://127.0.0.1:3000' }]);
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('socialstats.language', language); localStorage.setItem('theme', theme);
    localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
  }, { language, theme });
  await page.route('**/api/**', async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'client', account_type: 'legacy', workspace_id: 7, client_id: 7, email: 'fixture@example.test', permissions: {} } });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'e2e-csrf' } });
    if (path.includes('/connections/')) return route.fulfill({ status: state.failRead === 403 ? 403 : state.failRead ? 503 : 200, json: state.failRead ? { code: state.failRead === 403 ? 'permission_denied' : 'unavailable' } : state.wire });
    if (path === '/api/composer/queues/') return route.fulfill({ json: [{ id: 11, client: 7, name: 'Queue fixture', platforms: ['contract_example'], is_active: true }] });
    if (path.includes('/composer/posts/')) {
      if (req.method() !== 'GET') state.writes.push({ path, payload: req.postDataJSON(), key: req.headers()['idempotency-key'] });
      if (path.endsWith('/publish_now/')) {
        if (state.failPublish === 'timeout') return route.abort('timedout');
        if (state.failPublish) return route.fulfill({ status: state.failPublish, json: { code: state.failPublish === 429 ? 'rate_limited' : 'permission_denied' } });
        state.post.status = 'queued'; return route.fulfill({ json: state.post });
      }
      if (path.endsWith('/schedule/')) { state.post.scheduled_at = req.postDataJSON().scheduled_at; state.post.status = 'scheduled'; return route.fulfill({ json: state.post }); }
      if (path.endsWith('/add_to_queue/')) return route.fulfill({ status: state.failQueue ? 400 : 201, json: state.failQueue ? { code: 'invalid_destination' } : { id: 12 } });
      if (req.method() !== 'GET') {
        if (state.failSave) return route.fulfill({ status: 503, json: { code: 'unavailable' } });
        state.post = { ...state.post, ...req.postDataJSON() };
      }
      return route.fulfill({ json: state.post });
    }
    return route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.goto('/dashboard/analytics/composer');
  return state;
}
export async function compose(page, language = 'en') {
  await page.getByRole('button', { name: language === 'fa' ? 'آزمایشی' : 'Contract example', pressed: false }).click();
  await page.getByRole('checkbox', { name: /First account/ }).check();
  await page.getByLabel(language === 'fa' ? 'محتوا' : 'Content', { exact: true }).fill('Private editor content');
}
