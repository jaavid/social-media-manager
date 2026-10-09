import { test, expect } from '@playwright/test';
import { setupBot as setup, inspectBot as inspect, leaveBot as leave } from './bot-fixture';
import { enMessages, faMessages } from '../src/i18n/messages';
for (const language of ['fa', 'en']) for (const theme of ['light', 'dark', 'system']) for (const width of [360, 768, 1440])
  test(`node controls ${language}/${theme}/${width}: validation, switching and recovery`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ colorScheme: theme === 'system' ? 'dark' : theme, reducedMotion: 'reduce' });
    const copy = language === 'fa' ? faMessages : enMessages, state = await setup(page, language, theme);
    let inspector = await inspect(page, width, 'json', copy);
    if (process.env.STAGE6D_BASELINE) {
      await expect(inspector.locator('textarea')).toBeVisible();
      await page.screenshot({ path: `e2e/evidence/stage6d/node-before-${language}-${theme}-${width}.png` });
      return;
    }
    const json = inspector.getByLabel(copy['bot.rawJson']);
    await json.fill('{bad');
    await json.press('Tab');
    await expect(json).toHaveAttribute('aria-invalid', 'true');
    const errorId = await json.getAttribute('aria-describedby');
    await expect(inspector.locator(`[id="${errorId}"]`)).toContainText(copy['bot.invalidJson']);
    await leave(page, width);
    const save = page.getByRole('button', { name: /^(Save|ذخیره)$/ });
    await expect(save).toBeDisabled();
    expect(state.writes).toHaveLength(0);
    inspector = await inspect(page, width, 'wait', copy);
    const hours = inspector.getByLabel(copy['bot.field.hours']);
    await expect(hours).toHaveValue('2');
    await hours.fill('-');
    await expect(hours).toHaveAttribute('aria-invalid', 'true');
    await hours.fill('6');
    await leave(page, width);
    inspector = await inspect(page, width, 'json', copy);
    await expect(inspector.getByLabel(copy['bot.rawJson'])).toHaveValue('{bad');
    await expect(inspector.getByLabel(copy['bot.rawJson'])).toHaveCSS('direction', 'ltr');
    await inspector.getByLabel(copy['bot.rawJson']).fill('{"keep":9}');
    await inspector.getByLabel(copy['bot.rawJson']).press('Tab');
    await leave(page, width);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(copy['editor.saveFailed'])).toBeVisible();
    expect(state.writes.at(-1).nodes.find(node => node.id === 'json').data).toEqual({ keep: 9 });
    expect(state.writes.at(-1).nodes.find(node => node.id === 'wait').data.hours).toBe(6);
    await expect(page.getByText('private-controls-token')).toHaveCount(0);
    inspector = await inspect(page, width, 'json', copy);
    await expect(inspector.getByLabel(copy['bot.rawJson'])).toHaveValue('{"keep":9}');
    if ((language === 'fa' && theme === 'dark' && width === 360) || (language === 'en' && theme === 'light' && width === 1440))
      await page.screenshot({ path: `e2e/evidence/stage6d/node-after-${language}-${theme}-${width}.png` });
    await leave(page, width);
    state.failure = null;
    await page.getByRole('button', { name: copy['analytics.report.retry'], exact: true }).click();
    await expect(page.getByText(copy['editor.saveFailed'])).toHaveCount(0);
    inspector = await inspect(page, width, 'text', copy);
    const message = inspector.getByLabel(copy['bot.field.message']);
    await expect(message).toHaveAttribute('required', '');
    await expect(message).toHaveValue('Hi {{contact.name}}');
    const remove = inspector.getByRole('button', { name: copy['editor.deleteNode'], exact: true });
    await remove.click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm.getByRole('button', { name: copy['reports.cancel'], exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(remove).toBeFocused();
    await leave(page, width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
for (const language of ['fa', 'en']) for (const width of [360, 1440])
  test(`trigger controls ${language}/${width}: config preserved on failure`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const copy = language === 'fa' ? faMessages : enMessages, state = await setup(page, language);
    state.failure = null;
    await page.getByRole('button', { name: /^(Publish|انتشار)$/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    state.failure = 503;
    if (process.env.STAGE6D_BASELINE) {
      await expect(dialog.getByText('hello', { exact: true })).toBeVisible();
      await page.screenshot({ path: `e2e/evidence/stage6d/trigger-before-${language}-${width}.png` });
      return;
    }
    const draft = dialog.getByLabel(copy['bot.keywordsDraft']);
    await draft.fill('preserved');
    const publish = dialog.getByRole('button', { name: copy['editor.publishAction'], exact: true });
    await expect(publish).toBeDisabled();
    await draft.press('Enter');
    await dialog.getByLabel(copy['bot.field.match_type']).selectOption('exact');
    await dialog.getByLabel(copy['bot.caseSensitive']).focus();
    await page.keyboard.press('Space');
    await publish.click();
    await expect(dialog.getByText(copy['editor.publishFailed'])).toBeVisible();
    expect(state.publishWrites).toBe(0);
    expect(state.writes.at(-1).trigger_config).toEqual({ keywords: ['hello', 'preserved'], match_type: 'exact', case_sensitive: true });
    await expect(dialog.getByText('preserved', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel(copy['bot.caseSensitive'])).toBeChecked();
    await page.screenshot({ path: `e2e/evidence/stage6d/trigger-after-${language}-${width}.png` });
    state.failure = null;
    await publish.click();
    await expect(dialog.getByText(copy['editor.approvalQueued'])).toBeVisible();
    await expect(publish).toBeDisabled();
    expect(state.publishWrites).toBe(1);
  });
test('confirmed deletion removes only selected node and returns focus to canvas', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 950 });
  const state = await setup(page), inspector = await inspect(page, 360, 'wait', enMessages);
  await inspector.getByRole('button', { name: enMessages['editor.deleteNode'], exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: enMessages['editor.deleteNode'], exact: true }).click();
  await expect(page.locator('.react-flow__node[data-id="wait"]')).toHaveCount(0);
  await expect(page.locator('.react-flow__node[data-id="json"]')).toBeVisible();
  await expect(page.getByLabel(enMessages['bot.canvas'])).toBeFocused();
  expect(state.writes).toHaveLength(0);
});

test('immediate confirmation Escape preserves the tablet inspector across repeated openings', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 950 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const state = await setup(page, 'en', 'dark');
  state.failure = null;
  const inspector = await inspect(page, 768, 'wait', enMessages);
  const remove = inspector.getByRole('button', { name: enMessages['editor.deleteNode'], exact: true });
  for (let attempt = 0; attempt < 20; attempt++) {
    await remove.click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation.getByRole('button', { name: enMessages['reports.cancel'], exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(confirmation).toHaveCount(0);
    await expect(inspector).toBeVisible();
    await expect(remove).toBeFocused();
  }
  await expect(page.locator('.react-flow__node[data-id="wait"]')).toBeVisible();
});
