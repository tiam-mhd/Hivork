import { afterAll, describe, expect, it } from 'vitest';

import { CancelSaleUseCase, CreateSaleUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describeIfDb('CancelSaleUseCase (integration)', () => {
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

  const cancelSale = new CancelSaleUseCase(unitOfWork, sales, installments, audit);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('cancels sale and writes audit log', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
        tenantCustomers: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!tenant?.branches[0] || !tenant.staff[0] || !tenant.tenantCustomers[0]) {
      throw new Error('demo-shop seed data required');
    }

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: null,
    };

    const created = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: tenant.tenantCustomers[0].id,
      branchId: tenant.branches[0].id,
      totalAmountRial: 3_000_000n,
      downPaymentRial: 0n,
      installmentCount: 3,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const result = await cancelSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      saleId: created.id,
      reason: 'لغو تست یکپارچگی',
      staffContext,
    });

    expect(result.status).toBe('cancelled');

    const saleRow = await prisma.sale.findFirst({
      where: { id: created.id, tenantId: tenant.id },
    });
    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        entityId: created.id,
        action: 'sale.cancel',
      },
    });

    expect(saleRow?.status).toBe('CANCELLED');
    expect(saleRow?.cancelReason).toBe('لغو تست یکپارچگی');
    expect(auditRow).not.toBeNull();
  });

  it('rejects cancel when an installment is paid', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
        tenantCustomers: { where: { deletedAt: null }, take: 1 },
      },
    });

    if (!tenant?.branches[0] || !tenant.staff[0] || !tenant.tenantCustomers[0]) {
      throw new Error('demo-shop seed data required');
    }

    const staffContext = {
      staffId: tenant.staff[0].id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: null,
    };

    const created = await createSale.execute({
      tenantId: tenant.id,
      actorId: tenant.staff[0].id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: tenant.tenantCustomers[0].id,
      branchId: tenant.branches[0].id,
      totalAmountRial: 2_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const firstInstallment = await prisma.installment.findFirst({
      where: { saleId: created.id, tenantId: tenant.id, sequenceNumber: 1 },
    });

    if (!firstInstallment) {
      throw new Error('installment missing');
    }

    await prisma.installment.update({
      where: { id: firstInstallment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        confirmedByStaffId: tenant.staff[0].id,
      },
    });

    await expect(
      cancelSale.execute({
        tenantId: tenant.id,
        actorId: tenant.staff[0].id,
        saleId: created.id,
        reason: 'تلاش لغو با قسط پرداخت‌شده',
        staffContext,
      }),
    ).rejects.toMatchObject({
      code: 'SALE_HAS_PAID_INSTALLMENT',
      httpStatus: 409,
    });

    const saleRow = await prisma.sale.findFirst({
      where: { id: created.id, tenantId: tenant.id },
    });

    expect(saleRow?.status).toBe('ACTIVE');
  });
});
