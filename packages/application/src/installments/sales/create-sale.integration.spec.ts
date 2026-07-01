import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaSaleIdempotencyStore,
  PrismaSaleRepository,
  PrismaService,
  PrismaTenantCustomerRepository,
  PrismaTenantPlanReader,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import { CreateSaleUseCase, type CreateSaleInput } from './create-sale.use-case.js';

const hasDatabase = Boolean(process.env.DATABASE_URL) || process.env.CI === 'true';

type DemoShopSeed = {
  tenantId: string;
  staffId: string;
  branchId: string;
  customerId: string;
  ownerContext: CreateSaleInput['staffContext'];
};

function futureDueDate(daysFromNow = 30): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

function buildCreateSaleUseCase(
  prisma: PrismaService,
  outbox: Pick<PrismaOutboxPublisher, 'publish'> = new PrismaOutboxPublisher(prisma),
): CreateSaleUseCase {
  return new CreateSaleUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaTenantCustomerRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantPlanReader(prisma),
    new PrismaSaleIdempotencyStore(prisma),
    new PrismaAuditService(prisma),
    outbox,
  );
}

async function loadDemoShopSeed(prisma: PrismaService): Promise<DemoShopSeed> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'demo-shop', deletedAt: null },
    include: {
      branches: { where: { deletedAt: null, isActive: true }, take: 1 },
      staff: { where: { deletedAt: null }, take: 1 },
      tenantCustomers: { where: { deletedAt: null }, take: 1 },
    },
  });

  if (!tenant?.branches[0] || !tenant.staff[0] || !tenant.tenantCustomers[0]) {
    throw new Error('demo-shop seed data required (branch, staff, tenant customer)');
  }

  const branchId = tenant.branches[0].id;
  const staffId = tenant.staff[0].id;

  return {
    tenantId: tenant.id,
    staffId,
    branchId,
    customerId: tenant.tenantCustomers[0].id,
    ownerContext: {
      staffId,
      dataScope: 'all',
      assignedBranchIds: [branchId],
      activeBranchId: null,
    },
  };
}

describe.runIf(hasDatabase)('CreateSaleUseCase integration', () => {
  const prisma = new PrismaService();
  let seed: DemoShopSeed;
  let useCase: CreateSaleUseCase;

  beforeAll(async () => {
    seed = await loadDemoShopSeed(prisma);
    useCase = buildCreateSaleUseCase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function baseInput(overrides: Partial<CreateSaleInput> = {}): CreateSaleInput {
    return {
      tenantId: seed.tenantId,
      actorId: seed.staffId,
      idempotencyKey: crypto.randomUUID(),
      tenantCustomerId: seed.customerId,
      branchId: seed.branchId,
      totalAmountRial: 10_000_000n,
      downPaymentRial: 1_000_000n,
      installmentCount: 3,
      firstDueDate: futureDueDate(),
      contractDate: new Date('2026-07-01T12:00:00.000Z'),
      intervalDays: 30,
      staffContext: seed.ownerContext,
      ...overrides,
    };
  }

  it('creates sale with installments, audit, and outbox in one transaction', async () => {
    const input = baseInput();
    const result = await useCase.execute(input);

    expect(result.installments).toHaveLength(3);
    expect(result.status).toBe('active');

    const saleRow = await prisma.sale.findFirst({
      where: { id: result.id, tenantId: seed.tenantId, deletedAt: null },
    });
    const installmentRows = await prisma.installment.findMany({
      where: { saleId: result.id, tenantId: seed.tenantId, deletedAt: null },
      orderBy: { sequenceNumber: 'asc' },
    });
    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: seed.tenantId,
        entityId: result.id,
        action: 'sale.create',
        entityType: 'sale',
      },
    });
    const outboxRow = await prisma.outboxEvent.findFirst({
      where: {
        tenantId: seed.tenantId,
        aggregateId: result.id,
        eventType: 'sale.created',
      },
    });

    expect(saleRow?.status).toBe('ACTIVE');
    expect(installmentRows).toHaveLength(3);

    const installmentSum = installmentRows.reduce((sum, row) => sum + row.amountRial, 0n);
    expect(installmentSum + input.downPaymentRial).toBe(input.totalAmountRial);

    expect(auditRow).toMatchObject({
      actorType: 'staff',
      actorId: seed.staffId,
      newValue: expect.objectContaining({
        saleId: result.id,
        tenantCustomerId: seed.customerId,
        branchId: seed.branchId,
      }),
    });
    expect(outboxRow).toMatchObject({ status: 'pending', eventType: 'sale.created' });
  });

  it('BR-005 — installment bigint sum plus down payment equals total in DB', async () => {
    const input = baseInput({
      totalAmountRial: 10_000_000n,
      downPaymentRial: 1_000_000n,
      installmentCount: 3,
    });

    const result = await useCase.execute(input);
    const installmentRows = await prisma.installment.findMany({
      where: { saleId: result.id, tenantId: seed.tenantId, deletedAt: null },
    });

    const sum = installmentRows.reduce((acc, row) => acc + row.amountRial, 0n);
    expect(sum + 1_000_000n).toBe(10_000_000n);
    expect(sum).toBe(9_000_000n);
  });

  it('duplicate Idempotency-Key returns cached sale without duplicate rows', async () => {
    const idempotencyKey = crypto.randomUUID();
    const input = baseInput({ idempotencyKey });
    const salesBefore = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);

    const salesAfter = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    expect(salesAfter - salesBefore).toBe(1);
  });

  it('same idempotency key with different body throws IDEMPOTENCY_CONFLICT', async () => {
    const idempotencyKey = crypto.randomUUID();
    const shared = baseInput({ idempotencyKey });

    await useCase.execute(shared);

    await expect(
      useCase.execute({
        ...shared,
        totalAmountRial: 11_000_000n,
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('CUSTOMER_NOT_FOUND — no sale row created', async () => {
    const salesBefore = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });

    await expect(
      useCase.execute({
        ...baseInput(),
        tenantCustomerId: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });

    const salesAfter = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    expect(salesAfter).toBe(salesBefore);
  });

  it('BRANCH_NOT_ALLOWED — unknown branch leaves DB unchanged', async () => {
    const salesBefore = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });

    await expect(
      useCase.execute({
        ...baseInput(),
        branchId: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_ALLOWED' });

    const salesAfter = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    expect(salesAfter).toBe(salesBefore);
  });

  it('BRANCH_NOT_ALLOWED — staff branch scope excludes target branch', async () => {
    const salesBefore = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });

    await expect(
      useCase.execute({
        ...baseInput(),
        staffContext: {
          staffId: seed.staffId,
          dataScope: 'branch',
          assignedBranchIds: [crypto.randomUUID()],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_ALLOWED' });

    const salesAfter = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    expect(salesAfter).toBe(salesBefore);
  });

  it('rolls back sale and installments when outbox publish fails', async () => {
    const failingUseCase = buildCreateSaleUseCase(prisma, {
      publish: async () => {
        throw new Error('outbox failure');
      },
    });

    const idempotencyKey = crypto.randomUUID();
    const salesBefore = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    const installmentsBefore = await prisma.installment.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });

    await expect(
      failingUseCase.execute(
        baseInput({
          idempotencyKey,
          totalAmountRial: 2_000_000n,
          downPaymentRial: 0n,
          installmentCount: 2,
        }),
      ),
    ).rejects.toThrow('outbox failure');

    const salesAfter = await prisma.sale.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    const installmentsAfter = await prisma.installment.count({
      where: { tenantId: seed.tenantId, deletedAt: null },
    });
    const idempotencyRow = await prisma.idempotencyRecord.findUnique({
      where: { tenantId_key: { tenantId: seed.tenantId, key: idempotencyKey } },
    });

    expect(salesAfter).toBe(salesBefore);
    expect(installmentsAfter).toBe(installmentsBefore);
    expect(idempotencyRow).toBeNull();
  });

  it('rejects with ApplicationError for application-level failures', async () => {
    await expect(
      useCase.execute({
        ...baseInput(),
        tenantCustomerId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
