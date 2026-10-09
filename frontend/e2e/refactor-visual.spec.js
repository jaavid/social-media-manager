import { test, expect } from '@playwright/test';
import { setupComposer, compose } from './composer-fixture';
import { setupBot, inspectBot } from './bot-fixture';
import { settingsFixture } from './settings-fixture';
import { enMessages, faMessages } from '../src/i18n/messages';

async function stableImage(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.mouse.move(0, 0);
}

for (const language of ['fa', 'en']) for (const theme of ['light', 'dark']) for (const width of [360, 768, 1440]) {
  test(`composer ${language} ${theme} ${width}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2030-06-12T12:00:00Z'));
    await page.setViewportSize({ width, height: 1600 });
    await page.emulateMedia({ colorScheme: theme });
    const state = await setupComposer(page, { language, theme });
    await compose(page, language);
    await stableImage(page);
    await expect(page).toHaveURL(/\/dashboard\/composer$/);
    await expect(page.getByRole('heading', { name: language === 'fa' ? 'نگارش پست' : 'Composer', exact: true })).toBeVisible();
    expect(state.writes).toEqual([]);
    await expect(page).toHaveScreenshot(`editor-${language}-${theme}-${width}.png`, { fullPage: true });
    state.failSave = true;
    await page.getByRole('button', { name: language === 'fa' ? 'ذخیره پیش‌نویس' : 'Save Draft', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: language === 'fa' ? 'ورودی شما حفظ شده' : 'Your input is preserved' })).toBeVisible();
    expect(state.writes).toHaveLength(1);
    await expect(page).toHaveScreenshot(`failed-save-${language}-${theme}-${width}.png`, { fullPage: true });
  });
}

for (const { language, theme, width } of [{ language: 'fa', theme: 'dark', width: 360 }, { language: 'en', theme: 'light', width: 1440 }]) {
  test(`settings ${language} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1600 });
    await settingsFixture(page, 'business', language, theme);
    await page.goto('/admin/workspace/7/settings');
    await page.getByRole('tab').last().click();
    await expect(page.locator('input[value="Fixture"]')).toBeVisible();
    await stableImage(page);
    await expect(page).toHaveScreenshot(`business-${language}-${width}.png`, { fullPage: true });
  });
  test(`bot ${language} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setupBot(page, language, theme);
    const inspector = await inspectBot(page, width, 'json', language === 'fa' ? faMessages : enMessages);
    await expect(inspector.locator('textarea')).toBeVisible();
    await stableImage(page);
    await expect(page).toHaveScreenshot(`inspector-${language}-${width}.png`);
  });
  test(`management ${language} ${theme} ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1600 });
    await settingsFixture(page, 'business', language, theme);
    await page.goto('/admin/management');
    await expect(page.getByRole('heading', { name: 'Access Management' })).toBeVisible();
    await expect(page.getByText('Loading')).toHaveCount(0);
    await stableImage(page);
    await expect(page).toHaveScreenshot(`management-${language}-${width}.png`, { fullPage: true });
  });
}
