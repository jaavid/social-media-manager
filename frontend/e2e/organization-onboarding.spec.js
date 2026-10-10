import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });

const organization = { id: 1, name: 'Negative Five', owner_user: 1, my_role: 'owner', requires_approval: true };
const spaces = [{ id: 10, company: 'Negative Five' }, { id: 11, company: 'Sky Den' }, { id: 12, company: 'School' }];
async function fixtures(page, { user = { id: 1, email: 'owner@example.com', role: 'client', account_type: 'end_user', workspace_id: 10, permissions: {} }, role = 'owner' } = {}) {
  const writes = [];
  await page.addInitScript(() => localStorage.setItem('socialstats_cookie_choice', JSON.stringify({
    version: '2024-11-01', choices: { essential: true, functional: true, analytics: false, marketing: false },
  })));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (method === 'POST') writes.push({ path, body: route.request().postDataJSON() });
    if (path.endsWith('/auth/session/')) return route.fulfill({ json: { authenticated: Boolean(user), csrfToken: 'fixture' } });
    if (path.endsWith('/auth/me/')) return route.fulfill(user ? { json: user } : { status: 401, json: {} });
    if (path.endsWith('/organizations/')) return route.fulfill({ json: [{ ...organization, my_role: role }] });
    if (path.endsWith('/organizations/1/workspaces/')) return route.fulfill({ json: spaces });
    if (path.endsWith('/organizations/1/members/')) return route.fulfill({ json: [] });
    if (path.endsWith('/organizations/1/invitations/')) return route.fulfill({ json: method === 'POST' ? { id: 1, email_sent: true } : [] });
    if (path.endsWith('/organization-team/invitation/')) return route.fulfill({ json: { email: 'designer@example.com', organization_name: 'Negative Five', workspaces: [spaces[1]] } });
    if (path.endsWith('/organization-team/invitations/')) return route.fulfill({ json: [] });
    if (path.endsWith('/auth/signup/')) return route.fulfill({ status: 201, json: { email_sent: true } });
    return route.fulfill({ json: [] });
  });
  return writes;
}

test('one signup URL retains an invitation through the old route', { tag: '@smoke' }, async ({ page }) => {
  const writes = await fixtures(page, { user: null });
  await page.goto('/auth/end-user/signup?team_invite=fixture');
  await expect(page).toHaveURL(/\/signup\?team_invite=fixture$/);
  await expect(page.getByLabel(/ایمیل/, { exact: false }).first()).toHaveValue('designer@example.com');
  await page.getByLabel('نام کامل', { exact: true }).fill('Designer');
  await page.getByLabel('گذرواژه', { exact: true }).fill('A-secure-test-pass-483');
  await page.getByLabel('تکرار گذرواژه', { exact: true }).fill('A-secure-test-pass-483');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /ایجاد حساب|ساخت حساب|ثبت نام|ثبت‌نام/ }).click();
  await expect(page.getByRole('heading', { name: 'صندوق ورودی خود را بررسی کنید' })).toBeVisible();
  expect(writes.find(write => write.path.endsWith('/auth/signup/')).body.team_invite).toBe('fixture');
  expect(writes.filter(write => write.path.includes('/organizations/'))).toHaveLength(0);
});

test('owner invites a designer to one brand through the product panel', { tag: '@smoke' }, async ({ page }) => {
  const writes = await fixtures(page);
  await page.goto('/u/organizations');
  await expect(page.getByRole('heading', { name: 'دعوت همکار' })).toBeVisible();
  await page.getByLabel('ایمیل همکار').fill('designer@example.com');
  await page.getByRole('checkbox', { name: 'Sky Den', exact: true }).check();
  await page.getByRole('button', { name: 'ارسال دعوت' }).click();
  await expect(page.getByRole('status')).toHaveText('دعوت ارسال شد.');
  expect(writes.find(write => write.path.endsWith('/organizations/1/invitations/')).body).toEqual({
    email: 'designer@example.com', organization_role: 'member', workspace_grants: [{ workspace_id: 11, preset: 'designer' }],
  });
  if (process.env.RAVINTA_SCREENSHOTS_DIR) {
    fs.mkdirSync(process.env.RAVINTA_SCREENSHOTS_DIR, { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${process.env.RAVINTA_SCREENSHOTS_DIR}/organization-team-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { name: 'مجموعه، برندها و تیم' })).toBeVisible();
    await page.screenshot({ path: `${process.env.RAVINTA_SCREENSHOTS_DIR}/organization-team-mobile.png` });
  }
});

test('member sees assigned brands without owner controls', async ({ page }) => {
  await fixtures(page, { role: 'member' });
  await page.goto('/u/organizations');
  await expect(page.getByRole('heading', { name: 'برندهای Negative Five' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'دعوت همکار' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'افزودن برند' })).toHaveCount(0);
});
