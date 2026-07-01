import { test, expect } from '@playwright/test';

import { API_URL } from '../playwright.config';

const DEMO_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function fetchOtpFromRedis(phone: string): Promise<string> {
  if (process.env.E2E_STAFF_OTP) {
    return process.env.E2E_STAFF_OTP;
  }

  const { default: Redis } = await import('ioredis');
  const redis = new Redis(REDIS_URL);
  try {
    const record = await redis.get(`otp:staff:${phone}`);
    if (!record) {
      throw new Error(`OTP not found in Redis for ${phone}`);
    }
    const parsed = JSON.parse(record) as { code?: string };
    if (!parsed.code) {
      throw new Error('OTP record missing code');
    }
    return parsed.code;
  } finally {
    await redis.quit();
  }
}

test.describe('staff OTP login', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('demo-shop login → dashboard', async ({ page, request }) => {
    await request.post(`${API_URL}/auth/otp/request`, {
      data: { phone: DEMO_PHONE, actor: 'staff', intent: 'login' },
    });

    const code = await fetchOtpFromRedis(DEMO_PHONE);

    await page.goto('/login');
    await page.getByLabel('شماره موبایل برای ورود').fill(DEMO_PHONE);
    await page.getByRole('button', { name: 'ارسال کد تأیید →' }).click();

    for (let i = 0; i < code.length; i += 1) {
      await page.getByLabel(`رقم ${i + 1} از 5 کد تأیید`).fill(code[i]!);
    }

    await page.getByRole('button', { name: 'تأیید و ادامه →' }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible();
  });

  test('429 shows rate limit countdown', async ({ page }) => {
    await page.route('**/api/v1/auth/otp/request', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 'OTP_RATE_LIMITED',
          message: 'Too many OTP requests',
        }),
      });
    });

    await page.goto('/login');
    await page.getByLabel('شماره موبایل برای ورود').fill(DEMO_PHONE);
    await page.getByRole('button', { name: 'ارسال کد تأیید →' }).click();

    await expect(page.getByRole('alert')).toContainText('بیش از حد مجاز');
  });
});
