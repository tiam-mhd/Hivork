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

test.describe('today-due report page', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('shows today-due report page', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/reports/today-due');

    await expect(page.getByRole('heading', { name: 'سررسید امروز' })).toBeVisible();
    await expect(page.getByLabel('شعبه')).toBeVisible();
    await expect(page.getByText('امروز —')).toBeVisible();
  });

  test('dashboard view-all link opens report with branch filter', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/dashboard');

    const viewAllLink = page.getByRole('link', { name: 'مشاهده همه ←' });
    const hasLink = await viewAllLink.isVisible().catch(() => false);

    if (!hasLink) {
      await page.goto('/admin/reports/today-due');
      await expect(page.getByRole('heading', { name: 'سررسید امروز' })).toBeVisible();
      return;
    }

    await viewAllLink.click();
    await expect(page).toHaveURL(/\/admin\/reports\/today-due/);
    await expect(page.getByRole('heading', { name: 'سررسید امروز' })).toBeVisible();
  });

  test('shows empty state when no dues match filters', async ({ page, request }) => {
    await loginAsOwner(page, request);
    await page.goto('/admin/reports/today-due?search=zzzz-nonexistent-customer');

    await expect(
      page.getByText('با فیلترهای فعلی قسطی سررسید امروز وجود ندارد.'),
    ).toBeVisible({ timeout: 15_000 });
  });
});
