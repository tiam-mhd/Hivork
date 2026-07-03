import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { RecordBankTransferPaymentUseCase } from './record-bank-transfer-payment.use-case.js';

const databaseUrl = process.env.DATABASE_URL;

async function probeDatabase(): Promise<boolean> {
  if (!databaseUrl) {
    return false;
  }

  const probe = new PrismaService();
  try {
    await probe.$connect();
    await probe.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
}

const dbAvailable = await probeDatabase();
const describeIfDb = dbAvailable ? describe : describe.skip;

function staffContext(branchId: string, staffId: string) {
  return {
    staffId,
    dataScope: 'all' as const,
    assignedBranchIds: [branchId],
    activeBranchId: branchId,
  };
}

describeIfDb('RecordBankTransferPaymentUseCase (IFP-088 integration)', () => {
  const prisma = new PrismaService();
  const useCase = new RecordBankTransferPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPendingInstallment(amountRial = 10_000_000n) {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    const customer = await prisma.tenantCustomer.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    const sale = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: customer.id,
        createdByStaffId: staff.id,
        totalAmountRial: amountRial,
        downPaymentRial: 0n,
        installmentCount: 1,
        firstDueDate: new Date('2026-10-01T12:00:00.000Z'),
        contractDate: new Date('2026-07-01'),
        status: 'ACTIVE',
        createdById: staff.id,
        updatedById: staff.id,
      },
    });

    const installment = await prisma.installment.create({
      data: {
        tenantId: tenant.id,
        saleId: sale.id,
        sequenceNumber: 1,
        dueDate: new Date('2026-10-01T12:00:00.000Z'),
        amountRial,
        status: 'PENDING',
      },
    });

    return { tenant, branch, staff, installment };
  }

  it('records bank transfer payment as pending attempt', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      bankName: 'ملت',
      referenceNumber: '1234567890',
      transferDate: '2026-07-14',
      accountLast4: '4521',
      note: 'واریز به حساب شرکت',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.paymentAttempt.status).toBe('pending');
    expect(result.paymentAttempt.method).toBe('bank_transfer');
    expect(result.paymentAttempt.methodDetails).toMatchObject({
      bankName: 'ملت',
      referenceNumber: '1234567890',
      transferDate: '2026-07-14',
      accountLast4: '4521',
    });

    const row = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: result.paymentAttempt.id },
    });
    expect(row.status).toBe('PENDING');

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'payment.report',
        entityId: result.paymentAttempt.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('blocks duplicate bank reference for a second payment', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: 5_000_000n,
      bankName: 'ملی',
      referenceNumber: 'REF-DUP-001',
      transferDate: '2026-07-14',
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        amountRial: 5_000_000n,
        bankName: 'ملی',
        referenceNumber: 'REF-DUP-001',
        transferDate: '2026-07-15',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_REFERENCE_DUPLICATE',
      httpStatus: 409,
    });
  });

  it('returns same attempt on idempotent retry with duplicate reference', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();
    const idempotencyKey = crypto.randomUUID();

    const first = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      bankName: 'پاسارگاد',
      referenceNumber: 'REF-IDEM-001',
      transferDate: '2026-07-14',
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    const second = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      bankName: 'پاسارگاد',
      referenceNumber: 'REF-IDEM-001',
      transferDate: '2026-07-14',
      idempotencyKey,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(second.idempotentReplay).toBe(true);
    expect(second.paymentAttempt.id).toBe(first.paymentAttempt.id);
  });

  it('rejects future transfer date', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        amountRial: installment.amountRial,
        bankName: 'ملت',
        referenceNumber: 'REF-FUTURE-001',
        transferDate: '2099-01-01',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'TRANSFER_DATE_INVALID',
      httpStatus: 400,
    });
  });
});
