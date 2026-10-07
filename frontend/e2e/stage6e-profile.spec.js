import { test, expect } from '@playwright/test';
import { enMessages, faMessages } from '../src/i18n/messages';
async function setup(page, language = 'en', theme = 'light') {
  const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  await page.context().addCookies([
    { name: 'socialstats.language', value: language, url: base },
    { name: 'theme', value: theme, url: base },
  ]);
  await page.addInitScript(() =>
    localStorage.setItem(
      'socialstats_cookie_choice',
      JSON.stringify({ version: '2024-11-01', choices: { essential: true, functional: true } }),
    ),
  );
  await page.routeWebSocket('**/ws/**', (socket) => socket.close());
  const state = {
    readStatus: 0,
    malformed: false,
    saveStatus: 503,
    writes: [],
    slow: false,
    release: null,
  };
  let profile = {
    id: 1,
    first_name: 'Fixture',
    last_name: 'User',
    avatar: '/favicon.ico',
    email: 'fixture@example.test',
  };
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/session/'))
      return route.fulfill({ json: { authenticated: true, csrfToken: 'fixture-csrf' } });
    if (path.endsWith('/auth/me/'))
      return route.fulfill({
        json: {
          id: 1,
          role: 'superadmin',
          account_type: 'legacy',
          workspace_id: 7,
          client_id: 7,
          email: profile.email,
          permissions: {},
        },
      });
    if (path === '/api/profile/') {
      if (request.method() === 'GET') {
        if (state.slow)
          await new Promise((done) => {
            state.release = done;
          });
        if (state.readStatus)
          return route.fulfill({
            status: state.readStatus,
            json: { error: 'private-profile-token' },
          });
        return route.fulfill({ json: state.malformed ? {} : profile });
      }
      state.writes.push(request.postData());
      if (state.saveStatus)
        return route.fulfill({
          status: state.saveStatus,
          json: { error: 'private-profile-token' },
        });
      profile = { ...profile, first_name: 'Edited', avatar: null };
      return route.fulfill({
        json: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar: profile.avatar,
        },
      });
    }
    return route.fulfill({ json: [] });
  });
  return state;
}
for (const language of ['fa', 'en'])
  for (const theme of ['light', 'dark', 'system'])
    for (const width of [360, 768, 1440])
      test(`profile ${language}/${theme}/${width}: validation, confirmation and recovery`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 950 });
        await page.emulateMedia({
          colorScheme: theme === 'system' ? 'dark' : theme,
          reducedMotion: 'reduce',
        });
        const c = language === 'fa' ? faMessages : enMessages,
          state = await setup(page, language, theme);
        await page.goto('/admin/account-settings');
        if (process.env.STAGE6E_BASELINE) {
          await expect(page.locator('input:not([type="file"])').first()).toHaveValue('Fixture');
          await page.screenshot({
            path: `e2e/evidence/stage6e/profile-before-${language}-${theme}-${width}.png`,
          });
          return;
        }
        const first = page.getByLabel(c['profile.first'], { exact: true });
        await expect(first).toHaveValue('Fixture');
        await first.fill('');
        await first.press('Tab');
        await expect(first).toHaveAttribute('aria-invalid', 'true');
        const save = page.getByRole('button', { name: c['profile.save'], exact: true });
        await expect(save).toBeDisabled();
        await first.fill('Edited');
        const remove = page.getByRole('button', { name: c['profile.remove'], exact: true });
        await remove.click();
        const dialog = page.getByRole('alertdialog');
        await expect(
          dialog.getByRole('button', { name: c['profile.cancel'], exact: true }),
        ).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(remove).toBeFocused();
        expect(state.writes).toHaveLength(0);
        await remove.click();
        await dialog.getByRole('button', { name: c['profile.confirmRemove'], exact: true }).click();
        await expect(page.getByText(c['profile.removalPending'])).toBeVisible();
        expect(state.writes).toHaveLength(0);
        await save.click();
        await expect(page.getByText(c['profile.saveFailed'])).toBeVisible();
        await expect(first).toHaveValue('Edited');
        await expect(page.getByText('private-profile-token')).toHaveCount(0);
        await expect(page.getByRole('region', { name: c['profile.title'] }).getByRole('alert')).toBeFocused();
        state.readStatus = 503;
        await page.getByRole('button', { name: c['profile.refresh'], exact: true }).click();
        await expect(page.getByText(c['profile.refreshFailed'])).toBeVisible();
        await expect(first).toHaveValue('Edited');
        if (
          (language === 'fa' && theme === 'dark' && width === 360) ||
          (language === 'en' && theme === 'light' && width === 1440)
        )
          await page.screenshot({
            path: `e2e/evidence/stage6e/profile-after-${language}-${theme}-${width}.png`,
          });
        state.readStatus = 0;
        state.saveStatus = 0;
        await save.click();
        await expect(page.getByText(c['profile.saved'], { exact: true })).toBeVisible();
        expect(state.writes).toHaveLength(2);
        expect(state.writes[1]).toContain('remove_avatar');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      });
for (const failure of [403, 404, 429, 503, 'malformed'])
  test(`initial profile ${failure} remains error until retry`, async ({ page }) => {
    const state = await setup(page);
    state.readStatus = typeof failure === 'number' ? failure : 0;
    state.malformed = failure === 'malformed';
    await page.goto('/admin/account-settings');
    await expect(page.getByRole('region', { name: enMessages['profile.title'] }).getByRole('alert')).toBeVisible();
    await expect(page.getByLabel(enMessages['profile.first'], { exact: true })).toHaveCount(0);
    await expect(page.getByText(enMessages['profile.saved'], { exact: true })).toHaveCount(0);
    state.readStatus = 0;
    state.malformed = false;
    await page.getByRole('button', { name: enMessages['profile.retry'], exact: true }).click();
    await expect(page.getByLabel(enMessages['profile.first'], { exact: true })).toHaveValue(
      'Fixture',
    );
  });
test('slow profile, offline refresh/reconnect and denial preserve or hide correctly', async ({
  page,
}) => {
  const state = await setup(page);
  state.slow = true;
  await page.goto('/admin/account-settings');
  await expect(page.getByText(enMessages['profile.loading'])).toBeVisible();
  await expect.poll(() => !!state.release).toBe(true);
  state.slow = false;
  state.release();
  const first = page.getByLabel(enMessages['profile.first'], { exact: true });
  await expect(first).toHaveValue('Fixture');
  await first.fill('Keep offline');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: enMessages['profile.refresh'], exact: true }).click();
  await expect(page.getByText(enMessages['profile.refreshFailed'])).toBeVisible();
  await expect(first).toHaveValue('Keep offline');
  expect(state.writes).toHaveLength(0);
  await page.context().setOffline(false);
  await expect(page.getByText(enMessages['profile.refreshFailed'])).toHaveCount(0);
  await expect(first).toHaveValue('Keep offline');
  state.readStatus = 403;
  await page.getByRole('button', { name: enMessages['profile.refresh'], exact: true }).click();
  await expect(first).toHaveCount(0);
  await expect(page.getByText(enMessages['profile.denied'])).toBeVisible();
});
