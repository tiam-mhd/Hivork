import {
  CreateSaleUseCase,
  GetSaleUseCase,
  ListInstallmentsUseCase,
  ListOverdueInstallmentsUseCase,
  ListOverdueReportUseCase,
  ListTenantCustomersUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaOverdueReportRepository,
  PrismaSaleIdempotencyStore,
  PrismaSaleRepository,
  PrismaService,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaUnitOfWork,
  buildCreateTenantCustomerUseCase,
} from '@hivork/infrastructure';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hasDatabase = Boolean(process.env.DATABASE_URL) || process.env.CI === 'true';

type DemoShopSeed = {
  tenantId: string;
  staffId: string;
  branchId: string;
};

function futureDueDate(daysFromNow = 45): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function ownerContext(staffId: string, branchId: string) {
  return {
    staffId,
    dataScope: 'all' as const,
    assignedBranchIds: [branchId],
    activeBranchId: null,
  };
}

async function loadDemoShopSeed(prisma: PrismaService): Promise<DemoShopSeed> {
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

  return {
    tenantId: tenant.id,
    staffId: tenant.staff[0].id,
    branchId: tenant.branches[0].id,
  };
}

async function markInstallmentOverdueForTest(
  prisma: PrismaService,
  installmentId: string,
  tenantId: string,
): Promise<void> {
  const pastDue = new Date();
  pastDue.setUTCDate(pastDue.getUTCDate() - 7);
  pastDue.setUTCHours(12, 0, 0, 0);

  await prisma.installment.update({
    where: { id: installmentId, tenantId },
    data: { status: 'OVERDUE', dueDate: pastDue },
  });
}

function buildUseCases(prisma: PrismaService) {
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);
  const idempotency = new PrismaSaleIdempotencyStore(prisma);
  const overdueReport = new PrismaOverdueReportRepository(prisma);

  return {
    createCustomer: buildCreateTenantCustomerUseCase(prisma),
    listCustomers: new ListTenantCustomersUseCase(tenantCustomers),
    createSale: new CreateSaleUseCase(
      unitOfWork,
      sales,
      installments,
      tenantCustomers,
      branches,
      tenantPlans,
      idempotency,
      audit,
      outbox,
    ),
    getSale: new GetSaleUseCase(sales, installments),
    listInstallments: new ListInstallmentsUseCase(installments),
    listOverdueInstallments: new ListOverdueInstallmentsUseCase(
      new ListInstallmentsUseCase(installments),
    ),
    listOverdueReport: new ListOverdueReportUseCase(overdueReport),
  };
}

describe.runIf(hasDatabase)('Phase 1 vertical slice (use cases)', () => {
  const prisma = new PrismaService();
  let seed: DemoShopSeed;
  let useCases: ReturnType<typeof buildUseCases>;

  beforeAll(async () => {
    seed = await loadDemoShopSeed(prisma);
    useCases = buildUseCases(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('customer → sale → installments → overdue report', async () => {
    const staffContext = ownerContext(seed.staffId, seed.branchId);
    const phone = `0917${String(Date.now()).slice(-7)}`;
    const marker = `UC-Phase1-${Date.now()}`;

    const createdCustomer = await useCases.createCustomer.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      phone,
      name: 'مشتری UC فاز ۱',
      staffContext,
    });
    const customerId = createdCustomer.customer.id;

    const customers = await useCases.listCustomers.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      staffContext,
      limit: 50,
      sort: 'createdAt:desc',
      search: phone,
    });
    expect(customers.data.some((row) => row.id === customerId)).toBe(true);

    const sale = await useCases.createSale.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: customerId,
      branchId: seed.branchId,
      title: marker,
      totalAmountRial: 12_000_000n,
      downPaymentRial: 2_000_000n,
      installmentCount: 4,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-08-01'),
      intervalDays: 30,
      staffContext,
    });

    expect(sale.installments).toHaveLength(4);
    const installmentSum = sale.installments.reduce((sum, row) => sum + BigInt(row.amountRial), 0n);
    expect(installmentSum + 2_000_000n).toBe(12_000_000n);

    const detail = await useCases.getSale.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      saleId: sale.id,
      staffContext,
    });
    expect(detail.installments).toHaveLength(4);

    const listed = await useCases.listInstallments.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      staffContext,
      saleId: sale.id,
      limit: 10,
      sort: 'sequenceNumber:asc',
    });
    expect(listed.data).toHaveLength(4);

    const targetInstallmentId = listed.data[0]?.id;
    expect(targetInstallmentId).toBeTruthy();

    await markInstallmentOverdueForTest(prisma, targetInstallmentId!, seed.tenantId);

    const overdueInstallments = await useCases.listOverdueInstallments.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      staffContext,
      limit: 20,
    });
    expect(
      overdueInstallments.data.some(
        (row) => row.id === targetInstallmentId && (row.daysOverdue ?? 0) >= 1,
      ),
    ).toBe(true);
    expect(BigInt(overdueInstallments.meta.totalOutstandingRial) > 0n).toBe(true);

    const overdueReport = await useCases.listOverdueReport.execute({
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      staffContext,
      search: phone,
      limit: 10,
    });
    expect(
      overdueReport.data.some(
        (row) => row.customerId === customerId && BigInt(row.totalOverdueRial) > 0n,
      ),
    ).toBe(true);
  });
});
