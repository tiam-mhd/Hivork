import path from 'node:path';

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

test.describe('customer documents gallery', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('uploads image and removes it from gallery', async ({ page, request }) => {
    await loginAsOwner(page, request);

    const phone = uniqueCustomerPhone();
    const name = `مدارک ${Date.now()}`;

    await page.goto('/admin/customers/new');
    await page.getByLabel('شماره موبایل', { exact: false }).fill(phone);
    await page.getByLabel('نام و نام خانوادگی', { exact: false }).fill(name);
    await page.getByRole('button', { name: 'ذخیره مشتری' }).click();
    await expect(page).toHaveURL(/\/admin\/customers/, { timeout: 15_000 });

    await page.getByLabel('جستجو').fill(phone);
    await page.getByRole('link', { name: 'مشاهده' }).first().click();
    await expect(page).toHaveURL(/\/admin\/customers\/.+$/);

    await page.getByRole('tab', { name: 'مدارک' }).click();
    await expect(page.getByText('مدارک ثبت‌شده')).toBeVisible();

    const fixturePath = path.join(process.cwd(), 'e2e', 'fixtures', 'sample-id.jpg');
    await page.locator('input[type="file"]').setInputFiles(fixturePath);
    await page.getByRole('button', { name: 'آپلود مدرک' }).click();

    await expect(page.getByText('sample-id.jpg')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'حذف' }).click();
    await page.getByRole('button', { name: 'حذف' }).last().click();

    await expect(page.getByText('مدرکی ثبت نشده است')).toBeVisible({ timeout: 10_000 });
  });
});
