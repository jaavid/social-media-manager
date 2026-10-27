import { test, expect } from '@playwright/test';

test('sample agency directory discloses fictional profiles without verified-partner claims', async ({ page }) => {
  await page.goto('/agencies');
  await expect(page.getByRole('note')).toContainText('این یک سناریوی نمایشی است');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('نمونهٔ معرفی آژانس‌ها');
  await expect(page.getByText('هر شریک تأیید شده است', { exact: true })).toHaveCount(0);
  await expect(page.getByText('بیش از 50 آژانس بررسی شده', { exact: false })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('fictional agency detail cannot advertise real reviews in structured data', async ({ page }) => {
  await page.goto('/agencies/bluewave-agency');
  await expect(page.getByRole('note')).toContainText('نتیجهٔ واقعی مشتریان نیستند');
  await expect(page.getByText('نظرهای فرضی در این نمونه')).toBeVisible();
  await expect(page.locator('#jsonld-business')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('fictional customer example and product page make no verified outcome/rating claim', async ({ page }) => {
  await page.goto('/customers/acme-realty');
  await expect(page.getByRole('note')).toContainText('سناریوی نمایشی');
  await expect(page.getByText('نتایج فرضی در این سناریو')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await page.goto('/product/analytics');
  const software = page.locator('#jsonld-software');
  await expect(software).toHaveCount(1);
  expect(await software.textContent()).not.toContain('aggregateRating');
});
