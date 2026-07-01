import { test, expect } from '@playwright/test';

import { API_URL } from '../playwright.config';

const DEMO_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';

test.describe('admin layout', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('mobile drawer opens and closes with Escape', async ({ page, request }) => {
    await request.post(`${API_URL}/auth/otp/request`, {
      data: { phone: DEMO_PHONE, actor: 'staff', intent: 'login' },
    });

    const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const { default: Redis } = await import('ioredis');
    const redis = new Redis(REDIS_URL);
    const record = await redis.get(`otp:staff:${DEMO_PHONE}`);
    await redis.quit();
    test.skip(!record, 'OTP not available');

    const code = JSON.parse(record!).code as string;

    await page.goto('/login');
    await page.getByLabel('شماره موبایل برای ورود').fill(DEMO_PHONE);
    await page.getByRole('button', { name: 'ارسال کد تأیید →' }).click();
    for (let i = 0; i < code.length; i += 1) {
      await page.getByLabel(`رقم ${i + 1} از 5 کد تأیید`).fill(code[i]!);
    }
    await page.getByRole('button', { name: 'تأیید و ادامه →' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'باز کردن منو' }).click();
    await expect(page.getByRole('navigation', { name: 'ناوبری پنل فروشنده' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'باز کردن منو' })).toBeVisible();
  });
});
