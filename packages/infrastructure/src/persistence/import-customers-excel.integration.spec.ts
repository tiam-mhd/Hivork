import ExcelJS from 'exceljs';
import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateTenantCustomerUseCase,
  ImportCustomersExcelUseCase,
  ListTenantCustomersUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaGlobalCustomerRepository } from './global-customer.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisCustomerImportIdempotencyStore } from '../redis/redis-customer-import-idempotency.store.js';
import { RedisService } from '../redis/redis.service.js';
import { probeRedis } from '../test/probe-redis.js';

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const redisAvailable = await probeRedis(redisUrl);
const describeIfDb = databaseUrl ? describe : describe.skip;

async function buildImportWorkbook(
  phones: string[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(['phone', 'name', 'local_code', 'notes']);

  phones.forEach((phone, index) => {
    sheet.addRow([phone, `Import ${index + 1}`, `IMP-${index + 1}`, '']);
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describeIfDb('ImportCustomersExcelUseCase (integration)', () => {
  const prisma = new PrismaService();
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const globalCustomers = new PrismaGlobalCustomerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const audit = new PrismaAuditService(prisma);

  const createTenantCustomer = new CreateTenantCustomerUseCase(
    globalCustomers,
    tenantCustomers,
    branches,
    tenantPlans,
    audit,
  );

  const idempotency = redisAvailable
    ? new RedisCustomerImportIdempotencyStore(new RedisService(redisUrl))
    : {
        find: async () => null,
        store: async () => undefined,
      };

  const importUseCase = new ImportCustomersExcelUseCase(
    createTenantCustomer,
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

  it('imports rows and lists created customers', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const suffix = String(Date.now()).slice(-7);
    const phones = Array.from({ length: 3 }, (_, index) =>
      `0912${String(Number(suffix) + index).padStart(7, '0').slice(-7)}`,
    );
    const fileBuffer = await buildImportWorkbook(phones);
    const idempotencyKey = `00000000-0000-4000-8000-${suffix.padStart(12, '0').slice(0, 12)}`;

    const result = await importUseCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      idempotencyKey,
      fileBuffer,
      staffContext,
    });

    expect(result.totalRows).toBe(3);
    expect(result.successCount).toBe(3);
    expect(result.errorCount).toBe(0);

    for (const phone of phones) {
      const listed = await listUseCase.execute({
        tenantId: tenant.id,
        search: phone,
        staffContext,
      });
      expect(listed.items.some((item) => item.globalCustomer.phone === phone)).toBe(true);
    }
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
    const phones = [`0912${suffix}`];
    const fileBuffer = await buildImportWorkbook(phones);
    const idempotencyKey = `00000000-0000-4000-8000-${suffix.padStart(12, '0').slice(0, 12)}`;

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
