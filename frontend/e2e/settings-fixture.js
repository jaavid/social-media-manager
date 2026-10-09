import { test } from '@playwright/test';
const stamp = '2026-10-07T10:00:00Z';
export const preferences = { events: [{ id: 'post_published', label: 'Post published' }], channels: [{ id: 'email', label: 'Email' }], matrix: [{ event_type: 'post_published', email: false }] };
export const business = { id: 7, name: 'Fixture', company: 'Synthetic workspace', email: 'fixture@example.test', phone: '', whatsapp_number: '', website: '', gmb_url: '', business_category: '', brand_description: '', usp: '', brand_tone: '', target_audience: '', gender: 'all', business_location: '', business_subcategories: [], target_locations: [], competitors: [], brand_assets: {}, profile_image: null };
export const alert = { id: 4, message: 'Synthetic alert', alert_type: 'sync_failed', is_read: false, created_at: stamp, client_name: 'Synthetic workspace', platform: '' };
const paths = { agency: '/api/profile/agency/', business: '/api/workspaces/7/', preferences: '/api/notifications/preferences/', alerts: '/api/alerts/' };
export async function settingsFixture(page, family, language = 'en', theme = 'light') {
  const base = test.info().project.use.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  const state = { status: 0, malformed: false, writeStatus: 0, malformedWrite: false, writes: 0, writeBody: null, delay: 0, user: 1, workspace: 7, bodies: { agency: { connected: true, agency_name: 'Synthetic agency', agency_email: 'agency@example.test', agency_since: null }, business, preferences, alerts: [alert] } };
  await page.context().addCookies([{ name: 'socialstats.language', value: language, url: base }, { name: 'theme', value: theme, url: base }]);
  await page.addInitScript(locale => { localStorage.setItem('socialstats.language', locale); localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } })); }, language);
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path === '/api/auth/session/') return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture' } });
    if (path === '/api/auth/me/') return route.fulfill({ json: { id: state.user, role: family === 'agency' ? 'client' : 'superadmin', account_type: 'legacy', client_id: state.workspace, workspace_id: state.workspace, email: 'fixture@example.test', permissions: {} } });
    if (path === '/api/public/lookups/') return route.fulfill({ json: {} });
    if (path === '/api/profile/') return route.fulfill({ json: { id: state.user, first_name: 'Fixture', last_name: 'User', email: 'fixture@example.test', avatar: null } });
    if (req.method() !== 'GET' && (path === paths[family] || path === '/api/profile/disconnect-agency/' || /\/alerts\/.*mark.*\/$/.test(path))) {
      state.writes++; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      const dto = family === 'agency' ? { detail: 'Successfully disconnected from agency.', session: true } : family === 'preferences' ? { updated: 1 } : family === 'business' ? state.writeBody || business : { status: 'ok' };
      return route.fulfill(state.writeStatus ? { status: state.writeStatus, json: {} } : { json: state.malformedWrite ? {} : dto });
    }
    if (path === paths[family]) {
      const dto = state.bodies[family]; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      return route.fulfill(state.status ? { status: state.status, json: {} } : { json: state.malformed ? {} : dto });
    }
    return route.fulfill({ json: [] });
  });
  return state;
}
