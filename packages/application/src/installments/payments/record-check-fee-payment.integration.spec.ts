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

import { RecordCheckPaymentUseCase } from './record-check-payment.use-case.js';
import { RecordFeePaymentUseCase } from './record-fee-payment.use-case.js';

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

describeIfDb('RecordCheckPaymentUseCase + RecordFeePaymentUseCase (IFP-091 integration)', () => {
  const prisma = new PrismaService();
  const checkUseCase = new RecordCheckPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );
  const feeUseCase = new RecordFeePaymentUseCase(
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

  async function seedPendingInstallment(amountRial = 20_000_000n) {
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

  it('records check payment with pending registration metadata', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const result = await checkUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      checkNumber: '1234567',
      bankName: 'صادرات',
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      sayadId: '1234567890123456',
      note: 'چک دریافتی بابت قسط ۳',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.idempotentReplay).toBe(false);
    expect(result.paymentAttempt.status).toBe('pending');
    expect(result.paymentAttempt.method).toBe('check');
    expect(result.paymentAttempt.methodDetails).toMatchObject({
      checkNumber: '1234567',
      bankName: 'صادرات',
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      checkPendingRegistration: true,
    });
    expect(typeof result.paymentAttempt.methodDetails?.checkId).toBe('string');

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

  it('blocks duplicate check number for the same bank', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await checkUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: 10_000_000n,
      checkNumber: 'CHK-DUP-001',
      bankName: 'ملت',
      dueDate: '1405-12-01',
      drawerName: 'رضا محمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      checkUseCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        amountRial: 10_000_000n,
        checkNumber: 'CHK-DUP-001',
        bankName: 'ملت',
        dueDate: '1405-12-15',
        drawerName: 'رضا محمدی',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'CHECK_NUMBER_DUPLICATE',
      httpStatus: 409,
    });
  });

  it('records fee payment separately from principal allocation', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const feeResult = await feeUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: 500_000n,
      feeType: 'late_fee',
      feeDescription: 'جریمه دیرکرد ۵ روز',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(feeResult.paymentAttempt.method).toBe('fee');
    expect(feeResult.paymentAttempt.methodDetails).toMatchObject({
      feeType: 'late_fee',
      feeDescription: 'جریمه دیرکرد ۵ روز',
    });

    const principalAllocated = await prisma.paymentAttempt.aggregate({
      where: {
        tenantId: tenant.id,
        installmentId: installment.id,
        deletedAt: null,
        status: { in: ['PENDING', 'CONFIRMED'] },
        NOT: {
          metadata: { path: ['method'], equals: 'fee' },
        },
      },
      _sum: { amountRial: true },
    });

    expect(principalAllocated._sum.amountRial ?? 0n).toBe(0n);

    const checkResult = await checkUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      checkNumber: 'CHK-FEE-SEP-001',
      bankName: 'ملی',
      dueDate: '1405-12-01',
      drawerName: 'کاربر تست',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(checkResult.paymentAttempt.method).toBe('check');
  });

  it('rejects fee payment on waived installment', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'WAIVED' },
    });

    await expect(
      feeUseCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        installmentId: installment.id,
        amountRial: 500_000n,
        feeType: 'late_fee',
        feeDescription: 'جریمه',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'INSTALLMENT_ALREADY_WAIVED',
      httpStatus: 409,
    });
  });
});
