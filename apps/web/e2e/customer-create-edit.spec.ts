import { test, expect } from '@playwright/test';

import { API_URL } from '../playwright.config';

const DEMO_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';

function uniqueCustomerPhone(): string {
  const suffix = String(Date.now()).slice(-7);
  return `0912${suffix}`;
}

async function loginAsOwner(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  await request.post(`${API_URL}/auth/otp/request`, {
    data: { phone: DEMO_PHONE, actor: 'staff', intent: 'login' },
  });

  const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const { default: Redis } = await import('ioredis');
  const redis = new Redis(REDIS_URL);
  const record = await redis.get(`otp:staff:${DEMO_PHONE}`);
  await redis.quit();

  if (!record) {
    throw new Error('OTP not available for login');
  }

  const code = JSON.parse(record).code as string;

  await page.goto('/login');
  await page.getByLabel('شماره موبایل برای ورود').fill(DEMO_PHONE);
  await page.getByRole('button', { name: 'ارسال کد تأیید →' }).click();
  for (let i = 0; i < code.length; i += 1) {
    await page.getByLabel(`رقم ${i + 1} از 5 کد تأیید`).fill(code[i]!);
  }
  await page.getByRole('button', { name: 'تأیید و ادامه →' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe('customer create/edit', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('creates customer and shows in list', async ({ page, request }) => {
    await loginAsOwner(page, request);

    const phone = uniqueCustomerPhone();
    const name = `مشتری تست ${Date.now()}`;

    await page.goto('/admin/customers/new');
    await page.getByLabel('شماره موبایل', { exact: false }).fill(phone);
    await page.getByLabel('نام و نام خانوادگی', { exact: false }).fill(name);
    await page.getByRole('button', { name: 'ذخیره مشتری' }).click();

    await expect(page).toHaveURL(/\/admin\/customers/, { timeout: 15_000 });
    await page.getByLabel('جستجو').fill(phone);
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  });

  test('edits customer name', async ({ page, request }) => {
    await loginAsOwner(page, request);

    const phone = uniqueCustomerPhone();
    const originalName = `ویرایش اول ${Date.now()}`;
    const updatedName = `ویرایش دوم ${Date.now()}`;

    await page.goto('/admin/customers/new');
    await page.getByLabel('شماره موبایل', { exact: false }).fill(phone);
    await page.getByLabel('نام و نام خانوادگی', { exact: false }).fill(originalName);
    await page.getByRole('button', { name: 'ذخیره مشتری' }).click();
    await expect(page).toHaveURL(/\/admin\/customers/, { timeout: 15_000 });

    await page.getByLabel('جستجو').fill(phone);
    await page.locator('tr', { hasText: originalName }).click();
    await page.waitForURL(/\/admin\/customers\/.+$/);
    await expect(page.getByRole('heading', { name: originalName })).toBeVisible();

    await page.getByRole('link', { name: 'ویرایش' }).click();
    await page.waitForURL(/\/admin\/customers\/.+\/edit/);

    await page.getByLabel('نام و نام خانوادگی', { exact: false }).fill(updatedName);
    await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();

    await expect(page).toHaveURL(/\/admin\/customers\/.+$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible({ timeout: 10_000 });
  });

  test('row click opens detail page', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/customers');

    const firstViewLink = page.getByRole('link', { name: 'مشاهده' }).first();
    await expect(firstViewLink).toBeVisible({ timeout: 10_000 });
    await firstViewLink.click();
    await expect(page).toHaveURL(/\/admin\/customers\/[0-9a-f-]+$/);
    await expect(page.getByRole('tablist', { name: 'بخش‌های جزئیات مشتری' })).toBeVisible();
  });
});
