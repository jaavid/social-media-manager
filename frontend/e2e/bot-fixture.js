import { expect } from '@playwright/test';
export async function setupBot(page, language = 'en', theme = 'light') {
  const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }, { name: 'theme', value: theme, url: base }]);
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })));
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  const state = { failure: 503, writes: [], publishWrites: 0 };
  let flow = { id: 1, client: 7, name: 'Controls fixture', trigger_type: 'keyword', trigger_config: { keywords: ['hello'], match_type: 'contains' }, is_active: false,
    nodes: [
      { id: 'json', type: 'extension_json', position: { x: 0, y: 0 }, data: { keep: 1, remove: true } },
      { id: 'wait', type: 'wait_delay', position: { x: 270, y: 0 }, data: { hours: 2, minutes: 3, seconds: 4 } },
      { id: 'text', type: 'message_text', position: { x: 540, y: 0 }, data: { text: 'Hi {{contact.name}}' } },
    ], edges: [] };
  await page.route('**/api/**', route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
    if (path.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role: 'superadmin', account_type: 'legacy', workspace_id: 7, client_id: 7, permissions: {} } });
    if (path === '/api/bot-flows/1/') {
      if (request.method() === 'GET') return route.fulfill({ json: flow });
      state.writes.push(request.postDataJSON());
      if (state.failure) return route.fulfill({ status: state.failure, json: { error: 'private-controls-token' } });
      flow = { ...flow, ...request.postDataJSON() }; return route.fulfill({ json: flow });
    }
    if (path === '/api/bot-flows/1/publish/') { state.publishWrites++; return route.fulfill({ status: 202, json: { requires_approval: true } }); }
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin/bot-flows/1/edit');
  return state;
}
export async function inspectBot(page, width, id, copy) {
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  if (width < 1280) {
    await page.getByRole('button', { name: copy['editor.inspector'], exact: true }).click();
    return page.getByRole('dialog');
  }
  return page.locator('aside').last();
}
export async function leaveBot(page, width) { if (width < 1280) await page.keyboard.press('Escape'); }
