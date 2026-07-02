import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateSaleUseCase,
  GetTenantCustomerUseCase,
  ListTenantCustomersUseCase,
  MergeTenantCustomersUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantCustomerMergeRepository } from './tenant-customer-merge.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ensureTestGlobalCustomer } from './test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

class InMemoryMergeIdempotencyStore {
  private readonly records = new Map<string, { requestHash: string; response: unknown }>();

  async find(tenantId: string, idempotencyKey: string) {
    const raw = this.records.get(`${tenantId}:${idempotencyKey}`);
    return raw ?? null;
  }

  async store(tenantId: string, idempotencyKey: string, requestHash: string, response: unknown) {
    this.records.set(`${tenantId}:${idempotencyKey}`, { requestHash, response });
  }
}

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describeIfDb('MergeTenantCustomersUseCase (integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const idempotency = new PrismaSaleIdempotencyStore(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);
  const mergeRepository = new PrismaTenantCustomerMergeRepository(prisma);
  const mergeIdempotency = new InMemoryMergeIdempotencyStore();
  const getTenantCustomer = new GetTenantCustomerUseCase(tenantCustomers, sales);
  const listCustomers = new ListTenantCustomersUseCase(tenantCustomers);

  const createSale = new CreateSaleUseCase(
    unitOfWork,
    sales,
    installments,
    tenantCustomers,
    branches,
    tenantPlans,
    idempotency,
    audit,
    outbox,
  );

  const mergeCustomers = new MergeTenantCustomersUseCase(
    tenantCustomers,
    sales,
    mergeRepository,
    unitOfWork,
    audit,
    mergeIdempotency as never,
    getTenantCustomer,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('merges source into target, reassigns sales, and soft-deletes source', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });
    if (!tenant?.branches[0] || !tenant.staff[0]) {
      throw new Error('demo-shop seed data required');
    }

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: tenant.branches[0].id,
    };

    const sourcePhone = `0916${String(Date.now()).slice(-7)}`;
    const targetPhone = `0917${String(Date.now() + 1).slice(-7)}`;
    const sourceGlobal = await ensureTestGlobalCustomer(prisma, sourcePhone, 'Merge Source');
    const targetGlobal = await ensureTestGlobalCustomer(prisma, targetPhone, 'Merge Target');

    const sourceLink = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: sourceGlobal.id,
        tags: ['source-tag'],
        notes: 'source notes',
        totalPurchaseRial: 500_000n,
      },
    });

    const targetLink = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: targetGlobal.id,
        tags: ['target-tag'],
        notes: 'target notes',
        totalPurchaseRial: 1_000_000n,
      },
    });

    await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: sourceLink.id,
      branchId: tenant.branches[0].id,
      title: 'Merge Source Sale',
      totalAmountRial: 500_000n,
      downPaymentRial: 0n,
      installmentCount: 1,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      staffContext,
    });

    const result = await mergeCustomers.execute({
      tenantId: tenant.id,
      sourceTenantCustomerId: sourceLink.id,
      targetTenantCustomerId: targetLink.id,
      reason: 'duplicate customer profile',
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      staffContext,
    });

    expect(result.mergedSalesCount).toBe(1);
    expect(result.customer.id).toBe(targetLink.id);
    expect(result.customer.tags).toEqual(expect.arrayContaining(['source-tag', 'target-tag']));
    expect(result.customer.totalPurchaseRial).toBe(1_500_000n);

    const sourceAfter = await tenantCustomers.findActiveById(sourceLink.id, tenant.id);
    expect(sourceAfter).toBeNull();

    const listed = await listCustomers.execute({
      tenantId: tenant.id,
      staffContext,
    });
    expect(listed.items.some((item) => item.id === sourceLink.id)).toBe(false);
    expect(listed.items.some((item) => item.id === targetLink.id)).toBe(true);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'customer.merge',
        entityId: targetLink.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).toBeTruthy();

    await prisma.tenantCustomer.update({
      where: { id: targetLink.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.updateMany({
      where: { id: { in: [sourceGlobal.id, targetGlobal.id] } },
      data: { deletedAt: new Date() },
    });
  });
});
