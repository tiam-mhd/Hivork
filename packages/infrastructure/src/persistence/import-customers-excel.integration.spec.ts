import ExcelJS from 'exceljs';
import { afterAll, describe, expect, it } from 'vitest';

import {
  CUSTOMER_IMPORT_TEMPLATE_HEADERS,
  ImportCustomersExcelUseCase,
  ListTenantCustomersUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaCustomerCategoryReader } from './customer-category.reader.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisCustomerImportIdempotencyStore } from '../redis/redis-customer-import-idempotency.store.js';
import { RedisService } from '../redis/redis.service.js';
import { probeRedis } from '../test/probe-redis.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { buildCreateTenantCustomerUseCase } from './test-create-tenant-customer.helper.js';
import { ensureTestGlobalCustomer } from './test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const redisAvailable = await probeRedis(redisUrl);
const describeIfDb = databaseUrl ? describe : describe.skip;

async function buildImportWorkbook(
  rows: Array<Record<string, string | undefined>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow([...CUSTOMER_IMPORT_TEMPLATE_HEADERS]);

  for (const row of rows) {
    sheet.addRow(CUSTOMER_IMPORT_TEMPLATE_HEADERS.map((header) => row[header] ?? ''));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describeIfDb('ImportCustomersExcelUseCase (integration)', () => {
  const prisma = new PrismaService();
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const createTenantCustomer = buildCreateTenantCustomerUseCase(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const categories = new PrismaCustomerCategoryReader(prisma);

  const idempotency = redisAvailable
    ? new RedisCustomerImportIdempotencyStore(new RedisService(redisUrl))
    : {
        find: async () => null,
        store: async () => undefined,
      };

  const importUseCase = new ImportCustomersExcelUseCase(
    createTenantCustomer,
    tenantCustomers,
    tenantPlans,
    categories,
    idempotency,
    audit,
  );
  const listUseCase = new ListTenantCustomersUseCase(tenantCustomers);

  const staffContext = {
    staffId: '00000000-0000-0000-0000-000000000001',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('imports rows with enterprise fields and lists created customers', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const category = await prisma.customerCategory.create({
      data: {
        tenantId: tenant.id,
        name: `Import Cat ${Date.now()}`,
        slug: `import-cat-${Date.now()}`,
      },
    });

    const suffix = String(Date.now()).slice(-7);
    const phones = [
      `0912${suffix}`,
      `0913${String(Number(suffix) + 1).padStart(7, '0').slice(-7)}`,
      `0914${String(Number(suffix) + 2).padStart(7, '0').slice(-7)}`,
    ];

    const fileBuffer = await buildImportWorkbook([
      {
        phone: phones[0]!,
        name: 'Import Success 1',
        category: category.slug,
        tags: 'vip,import',
        city: 'تهران',
      },
      {
        phone: phones[1]!,
        name: '',
      },
      {
        phone: 'invalid',
        name: 'Bad Phone',
      },
      {
        phone: phones[2]!,
        name: 'Import Success 2',
        phone2: phones[2]!,
      },
      ...Array.from({ length: 7 }, (_, index) => ({
        phone: `0915${String(Number(suffix) + index + 10).padStart(7, '0').slice(-7)}`,
        name: `Bulk ${index}`,
      })),
    ]);

    const idempotencyKey = `00000000-0000-4000-8000-${suffix.padStart(12, '0').slice(0, 12)}`;

    const result = await importUseCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      idempotencyKey,
      fileBuffer,
      staffContext,
      includeErrorFile: true,
    });

    expect(result.totalRows).toBe(10);
    expect(result.successCount).toBeGreaterThanOrEqual(8);
    expect(result.failedCount).toBeGreaterThanOrEqual(2);
    expect(result.errorFileBase64).toBeTruthy();

    const listed = await listUseCase.execute({
      tenantId: tenant.id,
      search: phones[0]!,
      staffContext,
    });
    expect(listed.data.some((item) => item.globalCustomer.phone === phones[0])).toBe(true);
    expect(
      listed.data.find((item) => item.globalCustomer.phone === phones[0])?.categoryName,
    ).toBe(category.name);

    await prisma.customerCategory.update({
      where: { id: category.id },
      data: { deletedAt: new Date() },
    });
  });

  it('restores soft-deleted tenant customer via import', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0916${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Restore Import Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        deletedAt: new Date(),
        deletedById: staffContext.staffId,
      },
    });

    const fileBuffer = await buildImportWorkbook([
      { phone, name: 'Restore Import Customer' },
    ]);

    const result = await importUseCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      idempotencyKey: `00000000-0000-4000-8001-${String(Date.now()).slice(-12)}`,
      fileBuffer,
      staffContext,
    });

    expect(result.successCount).toBe(1);

    const restored = await prisma.tenantCustomer.findFirst({
      where: { id: link.id, deletedAt: null },
    });
    expect(restored).not.toBeNull();
  });

  it('returns cached result for the same idempotency key and file', async () => {
    if (!redisAvailable) {
      return;
    }

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const suffix = String(Date.now()).slice(-7);
    const phones = [`0917${suffix}`];
    const fileBuffer = await buildImportWorkbook(
      phones.map((phone, index) => ({ phone, name: `Cached ${index + 1}` })),
    );
    const idempotencyKey = `00000000-0000-4000-8002-${suffix.padStart(12, '0').slice(0, 12)}`;

    const first = await importUseCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      idempotencyKey,
      fileBuffer,
      staffContext,
    });

    const second = await importUseCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      idempotencyKey,
      fileBuffer,
      staffContext,
    });

    expect(second).toEqual(first);
  });
});
