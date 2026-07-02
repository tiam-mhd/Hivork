import { expect, test } from '@playwright/test';

import { API_URL } from '../playwright.config';

const DEMO_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';

async function loginAsOwner(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext,
) {
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

test.describe('phase 04 contract enterprise smoke', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('settings save + terminate/close/archive contract smoke', async ({ page, request }) => {
    await loginAsOwner(page, request);

    await page.goto('/admin/settings/installments');
    await expect(page.getByRole('heading', { name: 'تنظیمات اقساط' })).toBeVisible();
    await page.getByLabel('نوع جریمه').selectOption('percent_daily');
    await page.getByLabel('نرخ جریمه (bps)').fill('50');
    await page.getByRole('button', { name: 'ذخیره تنظیمات' }).click();
    await expect(page.getByText('تنظیمات اقساط با موفقیت ذخیره شد.')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('پیش‌نمایش شماره قرارداد')).toBeVisible();

    await page.goto('/admin/sales/new');
    const customerInput = page.getByRole('combobox');
    await customerInput.click();
    await customerInput.fill('مشتری نمونه');
    await page.getByRole('option').first().click();

    await page.getByLabel('مبلغ کل').fill('3000000');
    await page.getByLabel('مبلغ کل').blur();
    await page.getByLabel('پیش‌پرداخت').fill('0');
    await page.getByLabel('پیش‌پرداخت').blur();
    await page.getByLabel('تعداد اقساط').fill('2');
    await page.getByLabel('فاصله اقساط (روز)').fill('30');
    await page.getByLabel('تاریخ قسط اول').click();
    await page.locator('dialog').getByRole('button', { name: 'تأیید' }).click();
    await page.getByRole('button', { name: 'ادامه به تأیید →' }).click();
    await page.getByRole('button', { name: 'ثبت نهایی فروش' }).click();
    await expect(page).toHaveURL(/\/admin\/sales\/[0-9a-f-]{36}/, { timeout: 20_000 });

    await page.getByRole('button', { name: 'فسخ قرارداد' }).click();
    await page.getByLabel('دلیل فسخ').fill('فسخ قراردادی برای تست دود');
    await page.getByLabel('فسخ قرارداد را تایید می‌کنم.').check();
    const confirmPhrase = (await page.locator('dialog p.rounded.bg-muted').textContent())?.trim();
    if (!confirmPhrase) {
      throw new Error('Terminate confirmation phrase not found');
    }
    await page.getByLabel('برای تایید، عبارت زیر را وارد کنید').fill(confirmPhrase);
    await page.getByRole('button', { name: 'تایید فسخ' }).click();
    await expect(page.getByText('قرارداد با موفقیت فسخ شد.')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'بستن قرارداد' }).click();
    await page.getByLabel('دلیل بستن').fill('بستن پس از فسخ در تست');
    await page.getByRole('button', { name: 'بستن قرارداد' }).click();
    await expect(page.getByText('قرارداد بسته شد.')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'آرشیو قرارداد' }).click();
    await page.getByLabel('دلیل آرشیو').fill('آرشیو نهایی در smoke test');
    await page.getByRole('button', { name: 'آرشیو قرارداد' }).last().click();
    await expect(page.getByText('قرارداد بایگانی شد.')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('این قرارداد بایگانی شده است و امکان ویرایش آن وجود ندارد.')).toBeVisible();
  });
});
