import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaNotificationDispatcher,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaPaymentReceiptRepository,
  PrismaSaleRepository,
  PrismaService,
  PrismaStaffRepository,
  PrismaTenantRepository,
  PrismaTenantSequenceRepository,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
  PuppeteerPdfExportService,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { ConfirmPaymentUseCase } from './confirm-payment.use-case.js';
import { GeneratePaymentReceiptUseCase } from './generate-payment-receipt.use-case.js';
import { RecordCashManualPaymentUseCase } from './record-cash-manual-payment.use-case.js';
import { SendPaymentReceiptUseCase } from './send-payment-receipt.use-case.js';

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

describeIfDb('Payment receipt (IFP-095 integration)', () => {
  const prisma = new PrismaService();
  const pdfExport = new PuppeteerPdfExportService();
  const recordPayment = new RecordCashManualPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );
  const confirmPayment = new ConfirmPaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );
  const generateReceipt = new GeneratePaymentReceiptUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaStaffRepository(prisma),
    new PrismaTenantRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaPaymentReceiptRepository(prisma),
    new PrismaTenantSequenceRepository(prisma),
    pdfExport,
  );
  const sendReceipt = new SendPaymentReceiptUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaSaleRepository(prisma),
    new PrismaStaffRepository(prisma),
    new PrismaTenantRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    new PrismaPaymentReceiptRepository(prisma),
    new PrismaTenantSequenceRepository(prisma),
    new PrismaNotificationDispatcher(prisma),
    new PrismaAuditService(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedConfirmedPayment() {
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

    await prisma.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId: tenant.id,
          module: 'installments',
          key: 'default_reminder_channels',
        },
      },
      create: {
        tenantId: tenant.id,
        module: 'installments',
        key: 'default_reminder_channels',
        value: ['sms', 'bale'],
        createdById: staff.id,
        updatedById: staff.id,
      },
      update: {
        value: ['sms', 'bale'],
        updatedById: staff.id,
      },
    });

    const sale = await prisma.sale.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: customer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 10_000_000n,
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
        amountRial: 10_000_000n,
        status: 'PENDING',
      },
    });

    const recorded = await recordPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: installment.amountRial,
      staffContext: staffContext(branch.id, staff.id),
    });

    const attemptRow = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: recorded.paymentAttempt.id },
    });
    const installmentRow = await prisma.installment.findUniqueOrThrow({
      where: { id: installment.id },
    });

    await confirmPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: recorded.paymentAttempt.id,
      expectedAttemptVersion: attemptRow.version,
      expectedInstallmentVersion: installmentRow.version,
      staffContext: staffContext(branch.id, staff.id),
    });

    return { tenant, branch, staff, attemptId: recorded.paymentAttempt.id };
  }

  it('generates PDF for confirmed payment', async () => {
    const { tenant, branch, staff, attemptId } = await seedConfirmedPayment();

    const result = await generateReceipt.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: attemptId,
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.buffer.length).toBeGreaterThan(100);
    expect(result.filename).toContain('payment-receipt-');
    expect(result.receiptNumber).toBeTruthy();

    const receiptRow = await prisma.paymentReceipt.findFirst({
      where: { tenantId: tenant.id, paymentAttemptId: attemptId },
    });
    expect(receiptRow?.receiptNumber).toBe(result.receiptNumber);
  });

  it('queues notification on send', async () => {
    const { tenant, branch, staff, attemptId } = await seedConfirmedPayment();

    const result = await sendReceipt.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      paymentAttemptId: attemptId,
      channels: ['sms'],
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.receiptNumber).toBeTruthy();
    expect(result.dispatched).toHaveLength(1);
    expect(result.dispatched[0]?.status).toBe('queued');
    expect(result.idempotent).toBe(false);

    const log = await prisma.notificationLog.findUniqueOrThrow({
      where: { id: result.dispatched[0]!.notificationLogId },
    });
    expect(log.status).toBe('queued');
    expect(log.channel).toBe('sms');

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'receipt.send',
        entityId: attemptId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('rejects receipt for pending payment', async () => {
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
        totalAmountRial: 5_000_000n,
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
        amountRial: 5_000_000n,
        status: 'PENDING',
      },
    });

    const recorded = await recordPayment.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      method: 'cash',
      amountRial: installment.amountRial,
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      generateReceipt.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        paymentAttemptId: recorded.paymentAttempt.id,
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_NOT_CONFIRMED',
      httpStatus: 409,
    });
  });
});
