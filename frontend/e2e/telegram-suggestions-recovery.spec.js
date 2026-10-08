import { test, expect } from '@playwright/test';
import { connectionFixture } from '../src/services/__fixtures__/connections';
import { enMessages, faMessages } from '../src/i18n/messages';
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const row = (account = 10) => ({ id: account, client: 7, account, account_name: 'Public account', sender_name: 'Public sender', content: `Public proposal ${account}`, media: {}, proposal: {}, state: 'received', provider_state: 'pending', draft: null, created_at: '2026-10-08T10:00:00Z', updated_at: '2026-10-08T10:00:00Z' });
async function fixture(page, language, theme) {
  const origin = new URL(test.info().project.use.baseURL || process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').origin;
  await page.context().addCookies([{name:'socialstats.language',value:language,url:origin},{name:'theme',value:theme,url:origin}]);
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({version:'2024-11-01',choices:{essential:true,functional:true}})));
  const wire = connectionFixture();
  wire.providers[0].contract.ui_extensions = ['telegram_engagement']; wire.providers[0].capabilities.inbox = 'supported';
  const state = { failure: null, writes: 0, accepted: false };
  await page.routeWebSocket('**/ws/**', socket => socket.close());
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/session/')) return route.fulfill({json:{authenticated:true,csrfToken:'public-fixture-csrf'}});
    if (path.endsWith('/auth/me/')) return route.fulfill({json:{id:1,role:'client',account_type:'legacy',client_id:7,workspace_id:7,email:'fixture@example.test',permissions:{}}});
    if (path.includes('/connections/')) return route.fulfill({json:wire});
    if (path.includes('/telegram-suggestions/')) {
      if (route.request().method() === 'POST') { state.writes++; state.accepted = true; state.failure = 503; return route.fulfill({status:200,json:{...row(),state:'accepted_as_draft',draft:17,updated_at:'2026-10-08T10:01:00Z'}}); }
      if (state.failure) return route.fulfill({status:state.failure,json:{code:'unavailable'}});
      return route.fulfill({json:[row()]});
    }
    return route.fulfill({json:[]});
  });
  await page.goto('/dashboard/analytics/inbox');
  await page.getByRole('combobox', {name:language === 'fa' ? 'حساب / مقصد' : 'Account / destination'}).selectOption('10');
  return state;
}
for (const language of ['en','fa']) for (const theme of ['light','dark']) for (const width of [360,768,1440]) test(`suggestion acknowledgment ${language}/${theme}/${width}`, async ({page}) => {
  await page.setViewportSize({width,height:950}); await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  const state = await fixture(page,language,theme); const copy = language === 'fa' ? faMessages : enMessages;
  await expect(page.getByText('Public proposal 10')).toBeVisible();
  const button = page.getByRole('button',{name:language === 'fa' ? 'کپی در پیش‌نویس' : 'Copy to draft'});
  await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.getByText(copy['suggestions.accepted'])).toBeVisible();
  await expect(page.getByText('Public proposal 10')).toBeVisible();
  await expect(page.getByRole('link',{name:language === 'fa' ? 'باز کردن پیش‌نویس' : 'Open editable draft'})).toBeVisible();
  expect(state.writes).toBe(1); await expect(button).toHaveCount(0);
  await expect(page.getByText(copy['recovery.stale'])).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('html').getAttribute('dir')).toBe(language === 'fa' ? 'rtl' : 'ltr');
});
