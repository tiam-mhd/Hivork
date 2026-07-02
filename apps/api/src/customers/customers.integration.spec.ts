import ExcelJS from 'exceljs';
import { ModuleRegistryService } from '@hivork/module-core';
import { PrismaService } from '@hivork/infrastructure';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../app.module.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { AppConfigService } from '../config/app-config.service.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function probeRedis(url: string): Promise<boolean> {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try {
      await client.quit();
    } catch {
      // ignore
    }
    return false;
  }
}

const redisAvailable = await probeRedis(redisUrl);
const describeIfRuntime = databaseUrl && redisAvailable ? describe : describe.skip;

async function buildImportWorkbook(phones: string[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(['phone', 'name', 'local_code', 'notes']);

  phones.forEach((phone, index) => {
    sheet.addRow([phone, `Import ${index + 1}`, `IMP-${index + 1}`, '']);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describeIfRuntime('CustomersController (integration)', () => {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  const prisma = new PrismaService();
  let baseUrl = '';
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  let server: Awaited<ReturnType<typeof createApp>>['server'];
  let accessToken = '';

  beforeAll(async () => {
    await redis.connect();
    const created = await createApp();
    app = created.app;
    server = created.server;
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api`;

    const ownerPhone = process.env.SEED_OWNER_PHONE ?? '09120000000';

    await request('/v1/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        phone: ownerPhone,
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      }),
    });

    const otpRecord = await redis.get(`otp:staff:${ownerPhone}`);
    const code = JSON.parse(otpRecord!).code as string;

    const verify = await request('/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: ownerPhone,
        code,
        actor: 'staff',
        intent: 'login',
        tenantSlug: 'demo-shop',
      }),
    });

    accessToken = (verify.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    if (redis.status === 'ready') {
      await redis.quit();
    }

    await prisma.$disconnect();

    if (app) {
      await app.close();
    }

    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  async function request(path: string, init?: RequestInit & { token?: string }) {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const body =
      response.status === 204 ? null : await response.json().catch(() => null);

    return { response, body };
  }

  async function requestBinary(path: string, init?: RequestInit & { token?: string }) {
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (init?.token) {
      headers.set('Authorization', `Bearer ${init.token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return { response, buffer };
  }

  it('runs full customer CRUD flow', async () => {
    const phoneSuffix = String(Date.now()).slice(-7);
    const phone = `0915${phoneSuffix}`;

    const create = await request('/v1/customers', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        phone,
        name: 'مشتری API',
        localCode: 'API-1',
        tags: ['vip'],
      }),
    });

    expect(create.response.status).toBe(201);
    const customerId = (create.body as { id: string }).id;
    expect((create.body as { customer: { phone: string } }).customer.phone).toBe(phone);

    const list = await request(`/v1/customers?search=${phone}`, { token: accessToken });
    expect(list.response.status).toBe(200);
    expect(
      (list.body as { data: Array<{ id: string }> }).data.some((row) => row.id === customerId),
    ).toBe(true);

    const detail = await request(`/v1/customers/${customerId}?include=salesSummary`, {
      token: accessToken,
    });
    expect(detail.response.status).toBe(200);
    expect((detail.body as { id: string }).id).toBe(customerId);
    expect((detail.body as { salesSummary?: unknown }).salesSummary).toBeTruthy();

    const patch = await request(`/v1/customers/${customerId}`, {
      method: 'PATCH',
      token: accessToken,
      body: JSON.stringify({
        version: (detail.body as { version: number }).version,
        name: 'مشتری ویرایش‌شده',
        localCode: 'API-2',
      }),
    });
    expect(patch.response.status).toBe(200);
    expect((patch.body as { globalCustomer: { name: string } }).globalCustomer.name).toBe(
      'مشتری ویرایش‌شده',
    );
    expect((patch.body as { localCode: string }).localCode).toBe('API-2');
  });

  it('imports customers and lists them', async () => {
    const suffix = String(Date.now()).slice(-7);
    const phones = [`0916${suffix}`, `0917${suffix}`];
    const fileBuffer = await buildImportWorkbook(phones);
    const idempotencyKey = crypto.randomUUID();

    const form = new FormData();
    form.append('file', new Blob([fileBuffer]), 'customers.xlsx');

    const imported = await request('/v1/customers/import', {
      method: 'POST',
      token: accessToken,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: form,
    });

    expect(imported.response.status).toBe(200);
    expect((imported.body as { data: { successCount: number } }).data.successCount).toBe(2);

    const duplicate = await request('/v1/customers/import', {
      method: 'POST',
      token: accessToken,
      headers: { 'Idempotency-Key': idempotencyKey },
      body: form,
    });
    expect(duplicate.response.status).toBe(200);
    expect((duplicate.body as { data: { successCount: number } }).data.successCount).toBe(2);

    const list = await request(`/v1/customers?search=${phones[0]}`, { token: accessToken });
    expect(list.response.status).toBe(200);
    expect((list.body as { data: unknown[] }).data.length).toBeGreaterThan(0);
  });

  it('returns 404 for cross-tenant customer id', async () => {
    const missing = await request(
      '/v1/customers/00000000-0000-4000-8000-000000000099',
      { token: accessToken },
    );
    expect(missing.response.status).toBe(404);
    expect((missing.body as { code: string }).code).toBe('CUSTOMER_NOT_FOUND');
  });

  it('requires auth for customer routes', async () => {
    const unauthorized = await request('/v1/customers');
    expect(unauthorized.response.status).toBe(401);
  });

  it('requires idempotency key for import', async () => {
    const fileBuffer = await buildImportWorkbook(['09180000001']);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer]), 'customers.xlsx');

    const missingKey = await request('/v1/customers/import', {
      method: 'POST',
      token: accessToken,
      body: form,
    });

    expect(missingKey.response.status).toBe(400);
    expect((missingKey.body as { code: string }).code).toBe('VALIDATION_ERROR');
  });

  it('exports customers as xlsx matching list filter row count', async () => {
    const suffix = String(Date.now()).slice(-7);
    const phones = [`0919${suffix}`, `0920${suffix}`, `0921${suffix}`];
    const fileBuffer = await buildImportWorkbook(phones);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer]), 'customers.xlsx');

    const imported = await request('/v1/customers/import', {
      method: 'POST',
      token: accessToken,
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: form,
    });
    expect(imported.response.status).toBe(200);
    expect((imported.body as { data: { successCount: number } }).data.successCount).toBe(3);

    const search = phones[0].slice(0, 8);
    const list = await request(`/v1/customers?search=${search}`, { token: accessToken });
    expect(list.response.status).toBe(200);
    const listCount = (list.body as { data: unknown[] }).data.length;
    expect(listCount).toBe(3);

    const exported = await requestBinary(
      `/v1/customers/export?format=xlsx&search=${encodeURIComponent(search)}`,
      { token: accessToken },
    );

    expect(exported.response.status).toBe(200);
    expect(exported.response.headers.get('content-type')).toContain('spreadsheetml');
    expect(exported.response.headers.get('x-export-row-count')).toBe(String(listCount));
    expect(exported.response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="customers-\d{4}-\d{2}-\d{2}\.xlsx"$/,
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(exported.buffer);
    const sheet = workbook.worksheets[0];
    expect(sheet).toBeTruthy();
    const dataRowCount = Math.max(0, (sheet?.rowCount ?? 0) - 1);
    expect(dataRowCount).toBe(listCount);
  });

  it('exports customers as pdf with valid buffer', async () => {
    const exported = await requestBinary('/v1/customers/export?format=pdf&limit=5', {
      token: accessToken,
    });

    expect(exported.response.status).toBe(200);
    expect(exported.response.headers.get('content-type')).toBe('application/pdf');
    expect(exported.response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="customers-\d{4}-\d{2}-\d{2}\.pdf"$/,
    );
    expect(exported.buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });

  it('uploads, lists, downloads, and soft-deletes customer documents', async () => {
    const phoneSuffix = String(Date.now()).slice(-7);
    const phone = `0922${phoneSuffix}`;

    const create = await request('/v1/customers', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({
        phone,
        name: 'مشتری با سند',
        localCode: `DOC-${phoneSuffix}`,
      }),
    });
    expect(create.response.status).toBe(201);
    const customerId = (create.body as { id: string }).id;

    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
    ]);
    const form = new FormData();
    form.append('file', new Blob([jpegBuffer], { type: 'image/jpeg' }), 'national-id.jpg');
    form.append('documentType', 'national_id');
    form.append('description', 'کارت ملی');

    const uploaded = await request(`/v1/customers/${customerId}/documents`, {
      method: 'POST',
      token: accessToken,
      body: form,
    });
    expect(uploaded.response.status).toBe(201);
    const documentId = (uploaded.body as { data: { id: string } }).data.id;

    const list = await request(`/v1/customers/${customerId}/documents`, { token: accessToken });
    expect(list.response.status).toBe(200);
    expect((list.body as { data: Array<{ id: string }> }).data).toHaveLength(1);
    expect((list.body as { data: Array<{ id: string }> }).data[0]?.id).toBe(documentId);

    const download = await request(
      `/v1/customers/${customerId}/documents/${documentId}/download`,
      { token: accessToken },
    );
    expect(download.response.status).toBe(200);
    expect((download.body as { data: { url: string } }).data.url).toContain('/api/v1/files/signed-download');

    const removed = await request(`/v1/customers/${customerId}/documents/${documentId}`, {
      method: 'DELETE',
      token: accessToken,
      body: JSON.stringify({ deleteReason: 'test cleanup' }),
    });
    expect(removed.response.status).toBe(200);

    const listAfterDelete = await request(`/v1/customers/${customerId}/documents`, {
      token: accessToken,
    });
    expect(listAfterDelete.response.status).toBe(200);
    expect((listAfterDelete.body as { data: unknown[] }).data).toHaveLength(0);
  });

  it('rejects unsupported customer document mime type', async () => {
    const phoneSuffix = String(Date.now()).slice(-7);
    const phone = `0923${phoneSuffix}`;

    const create = await request('/v1/customers', {
      method: 'POST',
      token: accessToken,
      body: JSON.stringify({ phone, name: 'مشتری سند نامعتبر' }),
    });
    const customerId = (create.body as { id: string }).id;

    const form = new FormData();
    form.append('file', new Blob(['plain-text'], { type: 'text/plain' }), 'notes.txt');
    form.append('documentType', 'other');

    const uploaded = await request(`/v1/customers/${customerId}/documents`, {
      method: 'POST',
      token: accessToken,
      body: form,
    });

    expect(uploaded.response.status).toBe(422);
    expect((uploaded.body as { code: string }).code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('requires auth for customer document upload', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), 'a.jpg');
    form.append('documentType', 'photo');

    const unauthorized = await request(
      '/v1/customers/00000000-0000-4000-8000-000000000001/documents',
      { method: 'POST', body: form },
    );
    expect(unauthorized.response.status).toBe(401);
  });
});

async function createApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  const appConfig = app.get(AppConfigService);

  app.use(cookieParser());
  app.enableCors({ origin: appConfig.corsOrigin, credentials: true });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.get(ModuleRegistryService).bootstrap(app);

  await app.init();
  const server = app.getHttpServer() as import('node:http').Server;

  return { app, server };
}
