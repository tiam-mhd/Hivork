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

async function buildImportWorkbook(rows: Array<{ phone: string; name: string }>): Promise<Buffer> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(['phone', 'name', 'local_code', 'notes']);
  for (const row of rows) {
    sheet.addRow([row.phone, row.name, '', '']);
  }
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

test.describe('customer import excel', () => {
  test.beforeAll(async ({ request }) => {
    const health = await request.get(`${API_URL.replace('/api/v1', '')}/health`).catch(() => null);
    test.skip(!health?.ok(), 'API is not running');
  });

  test('uploads valid workbook and shows success summary', async ({ page, request }) => {
    await loginAsOwner(page, request);

    const suffix = String(Date.now()).slice(-7);
    const buffer = await buildImportWorkbook([
      { phone: `0918${suffix}`, name: 'Import Valid 1' },
      { phone: `0919${suffix}`, name: 'Import Valid 2' },
    ]);

    await page.goto('/admin/customers/import');
    await expect(page.getByRole('heading', { name: 'ورود مشتریان از Excel' })).toBeVisible();

    await page.setInputFiles('input[type="file"]', {
      name: 'customers.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    });

    await expect(page.getByText('همه ردیف‌ها با موفقیت وارد شدند.')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('موفق:')).toBeVisible();
  });

  test('shows error row for invalid phone', async ({ page, request }) => {
    await loginAsOwner(page, request);

    const buffer = await buildImportWorkbook([{ phone: '12345', name: 'Bad Phone' }]);

    await page.goto('/admin/customers/import');
    await page.setInputFiles('input[type="file"]', {
      name: 'customers-invalid.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    });

    await expect(page.getByText('ناموفق:')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('شماره موبایل معتبر نیست')).toBeVisible();
  });
});
