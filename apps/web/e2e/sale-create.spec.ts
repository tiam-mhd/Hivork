import { test, expect } from '@playwright/test';

import { API_URL } from '../playwright.config';

const DEMO_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';

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

test.describe('sale create wizard', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('creates sale and redirects to detail URL', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/sales/new');

    await expect(page.getByRole('heading', { name: 'فروش جدید' })).toBeVisible();
    await expect(page.getByText('مرحله ۱ از ۲')).toBeVisible();

    const customerInput = page.getByRole('combobox');
    await customerInput.click();
    await customerInput.fill('مشتری نمونه');
    await page.getByRole('option').first().click();

    await page.getByLabel('مبلغ کل').fill('6000000');
    await page.getByLabel('مبلغ کل').blur();
    await page.getByLabel('پیش‌پرداخت').fill('0');
    await page.getByLabel('پیش‌پرداخت').blur();
    await page.getByLabel('تعداد اقساط').fill('4');
    await page.getByLabel('فاصله اقساط (روز)').fill('30');

    await page.getByLabel('تاریخ قسط اول').click();
    await page.locator('dialog').getByRole('button', { name: 'تأیید' }).click();

    await page.getByRole('button', { name: 'ادامه به تأیید →' }).click();
    await expect(page.getByText('مرحله ۲ از ۲')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('ثبت نهایی فروش')).toBeVisible();

    await page.getByRole('button', { name: 'ثبت نهایی فروش' }).click();
    await expect(page).toHaveURL(/\/admin\/sales\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'اقساط' })).toBeVisible();
  });
});
