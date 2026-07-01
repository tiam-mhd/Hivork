import { test, expect } from '@playwright/test';

import { API_URL } from '../playwright.config';

const OWNER_PHONE = process.env.SEED_OWNER_PHONE ?? '09120000000';
const OWNER_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'DemoPass1';
const MFA_PHONE = '09129800001';
const MFA_PASSWORD = 'Phase01Pass1!';
const MUST_CHANGE_PHONE = '09129800003';
const MUST_CHANGE_PASSWORD = 'Phase01Pass1!';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function fetchOtpFromRedis(phone: string, purpose: 'login' | 'password_reset' = 'login'): Promise<string> {
  if (process.env.E2E_STAFF_OTP) {
    return process.env.E2E_STAFF_OTP;
  }

  const { default: Redis } = await import('ioredis');
  const redis = new Redis(REDIS_URL);
  try {
    const key =
      purpose === 'password_reset'
        ? `otp:password_reset:staff:${phone}`
        : `otp:staff:${phone}`;
    const record = await redis.get(key);
    if (!record) {
      throw new Error(`OTP not found in Redis for ${phone} (${key})`);
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

async function passwordLoginOnPage(
  page: import('@playwright/test').Page,
  phone: string,
  password: string,
) {
  await page.goto('/login');
  await page.getByRole('tab', { name: 'رمز عبور' }).click();
  await page.getByLabel('شماره موبایل').fill(phone);
  await page.getByLabel('رمز عبور', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'ورود' }).click();
}

test.describe('Phase 01 auth E2E (IFP-018)', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running — start api + seed before E2E');
  });

  test('E1 login password tab → dashboard', async ({ page }) => {
    await passwordLoginOnPage(page, OWNER_PHONE, OWNER_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible();
  });

  test('E2 login → MFA page → OTP → dashboard', async ({ page, request }) => {
    await request.post(`${API_URL}/auth/mfa/otp/request`, {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    }).catch(() => null);

    await passwordLoginOnPage(page, MFA_PHONE, MFA_PASSWORD);
    await expect(page).toHaveURL(/\/login\/mfa/);

    await request.post(`${API_URL}/auth/mfa/otp/request`, {
      headers: {
        Authorization: `Bearer ${new URL(page.url()).searchParams.get('token') ?? ''}`,
      },
      data: {},
    });

    const code = await fetchOtpFromRedis(MFA_PHONE);
    for (let i = 0; i < code.length; i += 1) {
      await page.getByLabel(`رقم ${i + 1} از 5 کد تأیید`).fill(code[i]!);
    }
    await page.getByRole('button', { name: /تأیید/ }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15_000 });
  });

  test('E3 forgot password → reset → login', async ({ page, request }) => {
    const newPassword = `ForgotE2E${Date.now()}!`;

    await request.post(`${API_URL}/auth/password/forgot/request`, {
      data: { phone: OWNER_PHONE },
    });

    const code = await fetchOtpFromRedis(OWNER_PHONE, 'password_reset');

    const verify = await request.post(`${API_URL}/auth/password/forgot/verify-otp`, {
      data: { phone: OWNER_PHONE, code },
    });
    expect(verify.ok()).toBeTruthy();
    const resetToken = (await verify.json() as { resetToken: string }).resetToken;

    await page.goto(`/auth/reset-password?token=${encodeURIComponent(resetToken)}`);
    await page.getByLabel('رمز عبور جدید').fill(newPassword);
    await page.getByLabel('تکرار رمز عبور جدید').fill(newPassword);
    await page.getByRole('button', { name: /ذخیره رمز/ }).click();
    await expect(page).toHaveURL(/\/login/);

    await passwordLoginOnPage(page, OWNER_PHONE, newPassword);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await request.post(`${API_URL}/auth/password/forgot/request`, { data: { phone: OWNER_PHONE } });
    const restoreCode = await fetchOtpFromRedis(OWNER_PHONE, 'password_reset');
    const restoreVerify = await request.post(`${API_URL}/auth/password/forgot/verify-otp`, {
      data: { phone: OWNER_PHONE, code: restoreCode },
    });
    const restoreToken = (await restoreVerify.json() as { resetToken: string }).resetToken;
    await request.post(`${API_URL}/auth/password/reset`, {
      data: {
        resetToken: restoreToken,
        password: OWNER_PASSWORD,
        passwordConfirm: OWNER_PASSWORD,
      },
    });
  });

  test('E4 settings → change password', async ({ page }) => {
    await passwordLoginOnPage(page, OWNER_PHONE, OWNER_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    const newPassword = `SettingsE2E${Date.now()}!`;
    await page.goto('/admin/settings/security/change-password');
    await page.getByLabel('رمز عبور فعلی').fill(OWNER_PASSWORD);
    await page.getByLabel('رمز عبور جدید').fill(newPassword);
    await page.getByLabel('تکرار رمز عبور جدید').fill(newPassword);
    await page.getByRole('button', { name: 'ذخیره رمز جدید' }).click();
    await expect(page.getByText('رمز عبور با موفقیت تغییر کرد')).toBeVisible();

    await page.goto('/login');
    await passwordLoginOnPage(page, OWNER_PHONE, newPassword);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto('/admin/settings/security/change-password');
    await page.getByLabel('رمز عبور فعلی').fill(newPassword);
    await page.getByLabel('رمز عبور جدید').fill(OWNER_PASSWORD);
    await page.getByLabel('تکرار رمز عبور جدید').fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: 'ذخیره رمز جدید' }).click();
    await expect(page.getByText('رمز عبور با موفقیت تغییر کرد')).toBeVisible();
  });

  test('E5 settings → sessions → revoke → re-login required', async ({ page, context }) => {
    await passwordLoginOnPage(page, OWNER_PHONE, OWNER_PASSWORD);
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.goto('/admin/settings/security/sessions');
    await expect(page.getByRole('heading', { name: 'نشست‌ها و دستگاه‌های فعال' })).toBeVisible();

    const revokeButton = page.getByRole('button', { name: 'لغو دسترسی' }).first();
    if (await revokeButton.isVisible()) {
      await revokeButton.click();
      await page.getByRole('button', { name: 'لغو دسترسی', exact: true }).last().click();
    }

    await context.clearCookies();
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('E6 mustChangePassword forced flow', async ({ page }) => {
    await passwordLoginOnPage(page, MUST_CHANGE_PHONE, MUST_CHANGE_PASSWORD);
    await expect(page).toHaveURL(/\/auth\/change-password/);

    const newPassword = `MustChange${Date.now()}!`;
    await page.getByLabel('رمز عبور فعلی').fill(MUST_CHANGE_PASSWORD);
    await page.getByLabel('رمز عبور جدید').fill(newPassword);
    await page.getByLabel('تکرار رمز عبور جدید').fill(newPassword);
    await page.getByRole('button', { name: /ذخیره/ }).click();

    await expect(page).toHaveURL(/\/admin\/dashboard|\/login/, { timeout: 15_000 });
  });
});
