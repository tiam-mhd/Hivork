import { afterAll, describe, expect, it } from 'vitest';

import { ApplicationError, CreateSaleUseCase, CustomerScoringHandler } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaTenantSettingsRepository } from '../settings/prisma-tenant-settings.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ensureTestGlobalCustomer } from './test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describeIfDb('Customer scoring + blacklist (integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const settings = new PrismaTenantSettingsRepository(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const idempotency = new PrismaSaleIdempotencyStore(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const scoringHandler = new CustomerScoringHandler(tenantCustomers, settings, unitOfWork);

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

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('blocks sale creation for blacklisted customers', async () => {
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

    const phone = `0919${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Blacklisted Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        isBlacklisted: true,
        status: 'blacklisted',
        blacklistReason: 'test blacklist',
        blacklistedAt: new Date(),
      },
    });

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: tenant.branches[0].id,
    };

    await expect(
      createSale.execute({
        tenantId: tenant.id,
        actorId: tenant.staff[0].id,
        idempotencyKey: crypto.randomUUID(),
        tenantCustomerId: link.id,
        branchId: tenant.branches[0].id,
        title: 'Blocked sale',
        totalAmountRial: 500_000n,
        downPaymentRial: 0n,
        installmentCount: 1,
        firstDueDate: futureDueDate(),
        contractDate: new Date('2026-07-01'),
        staffContext,
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_BLACKLISTED',
    } satisfies Partial<ApplicationError>);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('drops score on installment.overdue outbox event and may auto-blacklist', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        staff: { where: { deletedAt: null }, take: 1 },
      },
    });
    if (!tenant?.staff[0]) {
      throw new Error('demo-shop seed data required');
    }

    await settings.upsert({
      tenantId: tenant.id,
      module: 'installments',
      key: 'customer_auto_blacklist_score_threshold',
      value: 95,
      updatedById: tenant.staff[0].id,
    });

    const phone = `0920${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Scoring Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        creditScore: 100,
        overdueCount: 0,
      },
    });

    const eventId = crypto.randomUUID();

    await scoringHandler.handle({
      id: eventId,
      tenantId: tenant.id,
      eventType: 'installment.overdue',
      aggregateId: crypto.randomUUID(),
      aggregateType: 'installment',
      payload: {
        tenantId: tenant.id,
        tenantCustomerId: link.id,
        installmentId: crypto.randomUUID(),
        saleId: crypto.randomUUID(),
      },
    });

    const updated = await tenantCustomers.findFullDetailById(link.id, tenant.id);
    expect(updated?.creditScore).toBe(90);
    expect(updated?.overdueCount).toBe(1);
    expect(updated?.isBlacklisted).toBe(true);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: tenant.staff[0].id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });
});
