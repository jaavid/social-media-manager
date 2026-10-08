import { test, expect } from '@playwright/test';

async function session(page, { language = 'en', theme = 'light', accountType = 'legacy', role = 'superadmin', respond } = {}) {
  await page.context().addCookies(['socialstats.language', 'theme'].map(name => ({ name, value: name === 'theme' ? theme : language, url: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000' })));
  await page.addInitScript(({ language, theme }) => {
    localStorage.setItem('access_token', 'test-token');
    localStorage.setItem('socialstats.language', language);
    localStorage.setItem('theme', theme);
    localStorage.setItem('socialstats_cookie_choice', JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }));
  }, { language, theme });
  await page.route('**/api/**', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.endsWith('/auth/me/')) return route.fulfill({ json: { id: 1, role, account_type: accountType, client_id: 7, workspace_id: 7, primary_agency_slug: 'fixture-agency', permissions: {} } });
    if (url.pathname.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: true, csrfToken: 'e2e-csrf' } });
    return respond?.(route, url, request) || route.fulfill({ json: [] });
  });
  await page.routeWebSocket('**/ws/**', socket => socket.close());
}
const preferenceData = enabled => ({
  events: [{ id: 'post_published', label: 'Post published' }],
  channels: [{ id: 'in_app', label: 'In-app' }, { id: 'email', label: 'Email' }],
  matrix: [{ event_type: 'post_published', in_app: true, email: enabled }],
});

for (const width of [360, 390]) for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) {
  test(`mobile layout ${width}/${language}/${theme}: toolbar, lists, invitation and AI targets`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await session(page, { language, theme, respond: (route, url) => {
      if (url.pathname.endsWith('/workspaces/')) return route.fulfill({ json: [] });
      if (url.pathname.endsWith('/whatsapp/contacts/')) return route.fulfill({ json: [] });
    } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    for (const path of ['/admin/analytics/media', '/admin/messaging/contacts', '/admin/workspaces', '/contact']) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, path).toBe(false);
      if (path === '/admin/workspaces') {
        const email = page.locator('input[type=email]');
        await expect(email).toBeVisible();
        const rect = await email.boundingBox();
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(width);
      }
      if (path.startsWith('/admin')) {
        const ai = page.locator('.ai-floating-trigger'), tabs = page.locator('.mobile-bottom-nav a');
        await expect(ai).toBeVisible();
        const aiBox = await ai.boundingBox();
        for (const tab of await tabs.all()) {
          const box = await tab.boundingBox();
          if (!box) continue;
          expect(aiBox.y + aiBox.height <= box.y || aiBox.y >= box.y + box.height).toBe(true);
          expect(await tab.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
        }
      }
      if (width === 390 && language === 'fa' && theme === 'dark') {
        await page.screenshot({ path: testInfo.outputPath(path.split('/').filter(Boolean).join('-') + '.png') });
      }
    }
    expect(errors).toEqual([]);
  });
}

test('queue modal traps focus, closes with Escape and restores the trigger', async ({ page }) => {
  await session(page);
  await page.goto('/admin/analytics/queues');
  const trigger = page.getByRole('button', { name: 'New Queue', exact: true });
  await trigger.focus(); await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'New queue' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
});

test('queue items reorder through the UI and survive reload', async ({ page }) => {
  let items = [{ id: 1, content: 'First waiting post', sort_order: 1, status: 'waiting' }, { id: 2, content: 'Second waiting post', sort_order: 2, status: 'waiting' }];
  const queue = { id: 11, name: 'Morning', items_count: 2, waiting_count: 2, platforms: ['facebook'] };
  await session(page, { respond: (route, url, request) => {
    if (url.pathname.endsWith('/queues/11/reorder/')) {
      const order = request.postDataJSON().order;
      items = order.map(id => items.find(item => item.id === id));
      return route.fulfill({ json: { ok: true, reordered: 2 } });
    }
    if (url.pathname.endsWith('/queues/11/')) return route.fulfill({ json: { ...queue, items_list: items } });
    if (url.pathname.endsWith('/queues/')) return route.fulfill({ json: [queue] });
  } });
  await page.goto('/admin/analytics/queues');
  await expect(page.getByRole('list', { name: 'Waiting posts' }).locator('li').first()).toContainText('First waiting post');
  await page.getByRole('button', { name: 'Move down · First waiting post' }).click();
  await expect(page.getByRole('list', { name: 'Waiting posts' }).locator('li').first()).toContainText('Second waiting post');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Waiting posts' }).locator('li').first()).toContainText('Second waiting post');
});

test('unsaved composer recovers after internal navigation and reload', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await session(page);
  await page.goto('/admin/analytics/composer');
  await page.locator('textarea').first().fill('Important unsaved draft');
  await page.goto('/admin/analytics/calendar');
  await page.goto('/admin/analytics/composer');
  await expect(page.locator('textarea').first()).toHaveValue('Important unsaved draft');
  await page.reload();
  await expect(page.locator('textarea').first()).toHaveValue('Important unsaved draft');
});

test('Recent page selection navigates and closes without runtime errors', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await session(page);
  await page.goto('/admin/analytics/media');
  await expect(page.getByRole('heading', { name: 'Media Library', exact: true })).toBeVisible();
  await page.keyboard.press('Control+k');
  const calendar = page.locator('[cmdk-item]').filter({ hasText: 'Content Calendar' });
  await calendar.click(); await expect(page).toHaveURL(/\/calendar$/);
  await page.keyboard.press('Control+k');
  const recent = page.locator('[cmdk-group]').filter({ has: page.locator('[cmdk-group-heading]', { hasText: 'Recent' }) });
  await recent.locator('[cmdk-item]').filter({ hasText: 'Content Calendar' }).click();
  await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('end-user Persian notifications save flat API values and Billing is unavailable', async ({ page }) => {
  let email = false, write;
  await session(page, { language: 'fa', role: 'client', accountType: 'end_user', respond: (route, url, request) => {
    if (url.pathname.endsWith('/notifications/preferences/')) {
      if (request.method() === 'PUT') { write = request.postDataJSON(); email = write.matrix[0].enabled; return route.fulfill({ json: { updated: 1 } }); }
      return route.fulfill({ json: preferenceData(email) });
    }
  } });
  await page.goto('/u/notifications');
  const checkbox = page.getByRole('checkbox', { name: 'انتشار پست · ایمیل' });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check(); await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByRole('button', { name: 'بدون تغییر' })).toBeDisabled();
  expect(write).toEqual({ matrix: [{ event_type: 'post_published', channel: 'email', enabled: true }] });
  await page.reload(); await expect(checkbox).toBeChecked();
  await expect(page.locator('a[href="/u/billing"]')).toHaveCount(0);
  await expect(page.locator('aside')).toContainText('فضای کاری من');
});

test('account settings saves to the shared server matrix and webhooks cannot claim success', async ({ page }) => {
  let email = false, writes = 0;
  await session(page, { respond: (route, url, request) => {
    if (url.pathname.endsWith('/notifications/preferences/')) {
      if (request.method() === 'PUT') { writes++; email = request.postDataJSON().matrix.find(row => row.channel === 'email').enabled; return route.fulfill({ json: { updated: 2 } }); }
      return route.fulfill({ json: preferenceData(email) });
    }
  } });
  await page.goto('/admin/account-settings');
  await page.locator('main').getByRole('button', { name: 'Notifications', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Post published · Email' }).check();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  await page.reload(); await page.locator('main').getByRole('button', { name: 'Notifications', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Post published · Email' })).toBeChecked();
  await page.getByRole('button', { name: /Webhooks/ }).click();
  await expect(page.getByText('Webhook delivery is not available yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
});

for (const status of [401, 429, 503]) test(`login ${status} has a distinct recoverable error`, async ({ page }) => {
  await session(page, { respond: (route, url) => {
    if (url.pathname.endsWith('/auth/login/')) return route.fulfill({ status, json: { detail: 'Controlled failure' } });
  } });
  const hydrated = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/auth/sso/'));
  await page.goto('/login');
  await hydrated;
  await page.locator('input[type=email]').fill('fixture@example.test');
  await page.locator('input[type=password]').fill('password');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  const message = status === 401 ? 'ایمیل یا رمز عبور نادرست است' : status === 429 ? 'تعداد تلاش‌ها زیاد است' : 'سرویس ورود در دسترس نیست';
  await expect(page.getByText(message, { exact: false })).toBeVisible();
  await expect(page.locator('input[type=email]')).toHaveValue('fixture@example.test');
});

test('protected links preserve query and hash in the login return path', async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ status: path.endsWith('/auth/me/') ? 401 : 200, json: path.endsWith('/auth/session/') ? { authenticated: false, csrfToken: 'test' } : {} });
  });
  await page.goto('/admin/analytics/calendar?view=list#posts');
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get('next')).toBe('/admin/analytics/calendar?view=list#posts');
});

test('CSV errors never become downloads; success preserves current filters', async ({ page }) => {
  let fail = true, downloads = 0, exportURL;
  await session(page, { role: 'client', accountType: 'end_user', respond: (route, url) => {
    if (url.pathname.endsWith('/activity/')) return route.fulfill({ json: { rows: [] } });
    if (url.pathname.endsWith('/activity/export.csv')) {
      exportURL = url;
      return fail ? route.fulfill({ status: 500, json: { detail: 'Controlled failure' } }) : route.fulfill({ contentType: 'text/csv', body: 'id,description\n1,Fixture\n' });
    }
  } });
  page.on('download', () => downloads++);
  await page.goto('/u/activity');
  await page.getByRole('button', { name: 'Agency', exact: true }).click();
  await page.getByRole('button', { name: 'Export CSV' }).click();
  await expect(page.getByText('Could not download CSV')).toBeVisible();
  await page.getByRole('button', { name: 'Close toast' }).click();
  expect(downloads).toBe(0);
  fail = false;
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  expect(exportURL.searchParams.get('actor_type')).toBe('agency');
});

test('media folders stay available and failed fetch offers retry', async ({ page }) => {
  let fail = false;
  const assets = [{ id: 1, folder: 'Alpha', alt_text: 'Alpha image' }, { id: 2, folder: 'Beta', alt_text: 'Beta image' }];
  await session(page, { respond: (route, url) => {
    if (url.pathname.endsWith('/composer/media/')) {
      if (fail) return route.fulfill({ status: 503, json: { detail: 'Controlled outage' } });
      const folder = url.searchParams.get('folder');
      return route.fulfill({ json: folder ? assets.filter(asset => asset.folder === folder) : assets });
    }
  } });
  await page.goto('/admin/analytics/media');
  const folders = page.locator('select').filter({ has: page.locator('option', { hasText: 'All folders' }) });
  await folders.selectOption('Alpha');
  await expect(folders.locator('option', { hasText: 'Beta' })).toHaveCount(1);
  await folders.selectOption('Beta');
  fail = true; await page.reload();
  await expect(page.locator('main [role=alert]')).toContainText('Could not load media');
  await expect(page.getByText('No media yet')).toHaveCount(0);
  fail = false; await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

test('status without historical data displays unknown history and real current outage', async ({ page }) => {
  await session(page, { respond: (route, url) => {
    if (url.pathname.endsWith('/health/services/')) return route.fulfill({ json: { overall: 'outage', services: [{ id: 'api', name: 'API', status: 'outage' }] } });
  } });
  await page.goto('/status');
  await expect(page.getByText('قطعی عمده').first()).toBeVisible();
  await expect(page.getByText('تاریخچهٔ پایش در دسترس نیست')).toHaveCount(1);
  await expect(page.getByText(/100.00|۹۰ روز/)).toHaveCount(0);
  await expect(page.getByText('تاریخچهٔ حوادث در دسترس نیست.')).toBeVisible();
});

test('agency Preview points at the live marketplace profile', async ({ page }) => {
  await session(page, { role: 'client', accountType: 'agency_member', respond: (route, url) => {
    if (url.pathname.endsWith('/agency/fixture-agency/')) return route.fulfill({ json: { slug: 'fixture-agency', name: 'Fixture agency', services: [], industries: [], languages: [] } });
  } });
  await page.goto('/agency/marketplace-profile');
  await expect(page.getByRole('link', { name: 'Preview', exact: true })).toHaveAttribute('href', '/marketplace/fixture-agency');
});

test('AI panel fits the resized mobile viewport and closes back above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await session(page);
  await page.goto('/admin/analytics/media');
  await page.locator('.ai-floating-trigger').click();
  const panel = page.getByRole('dialog', { name: 'Social Stats chat' });
  await expect(panel).toBeVisible();
  await page.setViewportSize({ width: 390, height: 580 });
  const rect = await panel.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y + rect.height).toBeLessThanOrEqual(580);
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
  const trigger = await page.locator('.ai-floating-trigger').boundingBox();
  const nav = await page.locator('.mobile-bottom-nav').boundingBox();
  expect(trigger.y + trigger.height).toBeLessThan(nav.y);
});

for (const language of ['fa', 'en']) {
  test(`end-user main routes localize headings, navigation and actions in ${language}`, async ({ page }) => {
    await session(page, { language, role: 'client', accountType: 'end_user', respond: (route, url) => {
      if (url.pathname.endsWith('/notifications/preferences/')) return route.fulfill({ json: preferenceData(false) });
      if (url.pathname.endsWith('/approvals/pending/')) return route.fulfill({ json: { rows: [{ id: 1, status: 'pending', action_type: 'publish_post', agency_name: 'Fixture agency', preview: 'Fixture content' }] } });
    } });
    await page.goto('/u');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(language === 'fa' ? 'سلام،' : 'Hi,');
    await expect(page.locator('.eu-sidebar')).toContainText(language === 'fa' ? 'فضای کاری من' : 'My workspace');
    await expect(page.locator('a[href="/u/billing"]')).toHaveCount(0);
    for (const [path, english, persian] of [['connections', 'Connections', 'اتصال‌ها'], ['approvals', 'Approvals', 'تأییدها'], ['notifications', 'Notifications', 'اعلان‌ها']]) {
      await page.goto(`/u/${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(language === 'fa' ? persian : english);
      await expect(page.locator('html')).toHaveAttribute('dir', language === 'fa' ? 'rtl' : 'ltr');
      if (path === 'approvals') {
        await expect(page.getByText('Fixture content', { exact: false })).toBeVisible();
        await expect(page.locator('li').filter({ hasText: 'Fixture content' })).toContainText(language === 'fa' ? 'در انتظار' : 'Pending');
      }
      if (path === 'notifications') await expect(page.getByRole('button', { name: language === 'fa' ? 'بدون تغییر' : 'No changes', exact: true })).toBeVisible();
    }
  });
}
