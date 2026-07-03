import { afterAll, describe, expect, it } from 'vitest';

import { CreateSaleUseCase, ListPaymentTransactionsUseCase } from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaBranchReader } from './branch.repository.js';
import { PrismaInstallmentRepository } from './installment.repository.js';
import { PrismaPaymentLedgerRepository } from './payment-ledger.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaSaleIdempotencyStore } from './sale-idempotency.store.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaTenantPlanReader } from './tenant-plan.reader.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

function futureDueDate(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 5);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describeIfDb('ListPaymentTransactionsUseCase (IFP-103 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const ledger = new PrismaPaymentLedgerRepository(prisma);
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
  const listTransactions = new ListPaymentTransactionsUseCase(ledger);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedDemoSale() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 1 },
        tenantCustomers: { where: { deletedAt: null }, take: 1 },
      },
    });

    const branch = tenant.branches[0];
    const staff = tenant.staff[0];
    const customer = tenant.tenantCustomers[0];
    if (!branch || !staff || !customer) {
      throw new Error('demo-shop seed data required');
    }

    const staffContext = {
      staffId: staff.id,
      dataScope: 'all' as const,
      assignedBranchIds: [branch.id],
      activeBranchId: branch.id,
    };

    const sale = await createSale.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: customer.id,
      branchId: branch.id,
      totalAmountRial: 3_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01'),
      intervalDays: 30,
      staffContext,
    });

    const installment = await prisma.installment.findFirstOrThrow({
      where: { saleId: sale.id, tenantId: tenant.id, deletedAt: null },
      orderBy: { sequenceNumber: 'asc' },
    });

    return { tenant, branch, staff, staffContext, sale, installment };
  }

  async function createLedgerEntry(input: {
    tenantId: string;
    branchId: string;
    staffId: string;
    saleId: string;
    installmentId: string;
    amountRial: bigint;
    occurredAt: Date;
    paymentMethod: string;
  }) {
    return prisma.paymentLedgerEntry.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial: input.amountRial,
        status: 'POSTED',
        occurredAt: input.occurredAt,
        paymentMethod: input.paymentMethod,
        saleId: input.saleId,
        installmentId: input.installmentId,
        createdById: input.staffId,
        updatedById: input.staffId,
      },
    });
  }

  it('lists posted ledger entries with customer and sale embeds', async () => {
    const { tenant, branch, staff, staffContext, sale, installment } = await seedDemoSale();

    await createLedgerEntry({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      installmentId: installment.id,
      amountRial: 1_500_000n,
      occurredAt: new Date('2026-07-02T10:00:00.000Z'),
      paymentMethod: 'cash',
    });

    const result = await listTransactions.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      staffContext,
      limit: 20,
      saleId: sale.id,
    });

    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items[0]?.status).toBe('posted');
    expect(result.items[0]?.paymentMethod).toBe('cash');
    expect(result.items[0]?.customer?.displayName).toBeTruthy();
    expect(result.items[0]?.sale?.id).toBe(sale.id);
    expect(result.items[0]?.installment?.sequenceNumber).toBe(1);
  });

  it('filters by paymentMethod', async () => {
    const { tenant, branch, staff, staffContext, sale, installment } = await seedDemoSale();

    await createLedgerEntry({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      installmentId: installment.id,
      amountRial: 500_000n,
      occurredAt: new Date('2026-07-03T10:00:00.000Z'),
      paymentMethod: 'bank_transfer',
    });

    const filtered = await listTransactions.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      staffContext,
      limit: 20,
      saleId: sale.id,
      paymentMethod: 'bank_transfer',
    });

    expect(filtered.items.every((row) => row.paymentMethod === 'bank_transfer')).toBe(true);
  });

  it('paginates with stable cursor', async () => {
    const { tenant, branch, staff, staffContext, sale, installment } = await seedDemoSale();

    await createLedgerEntry({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      installmentId: installment.id,
      amountRial: 100_000n,
      occurredAt: new Date('2026-07-04T12:00:00.000Z'),
      paymentMethod: 'cash',
    });
    await createLedgerEntry({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      installmentId: installment.id,
      amountRial: 200_000n,
      occurredAt: new Date('2026-07-04T11:00:00.000Z'),
      paymentMethod: 'cash',
    });
    await createLedgerEntry({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      saleId: sale.id,
      installmentId: installment.id,
      amountRial: 300_000n,
      occurredAt: new Date('2026-07-04T10:00:00.000Z'),
      paymentMethod: 'cash',
    });

    const page1 = await listTransactions.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      staffContext,
      limit: 2,
      saleId: sale.id,
    });

    expect(page1.items).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).toBeTruthy();

    const page2 = await listTransactions.execute({
      tenantId: tenant.id,
      actorId: staff.id,
      staffContext,
      limit: 2,
      saleId: sale.id,
      cursor: page1.nextCursor ?? undefined,
    });

    expect(page2.items.length).toBeGreaterThanOrEqual(1);
    expect(page1.items[0]?.id).not.toBe(page2.items[0]?.id);
  });

  it('returns empty for cross-tenant sale filter', async () => {
    const { tenant, staff, staffContext, sale } = await seedDemoSale();
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });

    if (!otherTenant) {
      return;
    }

    const result = await listTransactions.execute({
      tenantId: otherTenant.id,
      actorId: staff.id,
      staffContext,
      limit: 20,
      saleId: sale.id,
    });

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});
