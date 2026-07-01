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

test.describe('reminders settings page', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('owner can open reminders settings form', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/settings/reminders');

    await expect(page.getByRole('heading', { name: 'تنظیمات یادآور' })).toBeVisible();
    await expect(page.getByText('تنظیمات یادآور در سطح tenant اعمال می‌شود.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ذخیره' })).toBeVisible();
  });

  test('save shows success toast', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/settings/reminders');

    await page.getByLabel('ساعت ارسال').fill('10:30');
    await page.getByRole('button', { name: 'ذخیره' }).click();

    await expect(page.getByText('تغییرات از فردا اعمال می‌شود')).toBeVisible({ timeout: 15_000 });
  });
});
