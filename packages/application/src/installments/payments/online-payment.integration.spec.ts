import {
  MockPaymentGateway,
  MockPaymentGatewayRegistry,
  signMockPaymentGatewayPayload,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
  PrismaOutboxPublisher,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { HandleOnlinePaymentCallbackUseCase } from './handle-online-payment-callback.use-case.js';
import { InitOnlinePaymentUseCase } from './init-online-payment.use-case.js';

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

describeIfDb('Online payment recording (IFP-089 integration)', () => {
  const prisma = new PrismaService();
  const mockGateway = new MockPaymentGateway({
    webhookSecret: 'integration-secret',
    publicApiBaseUrl: 'http://localhost:4000',
    nodeEnv: 'test',
  });
  const gateways = new MockPaymentGatewayRegistry(new Map([[mockGateway.provider, mockGateway]]));
  const initUseCase = new InitOnlinePaymentUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaInstallmentRepository(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaBranchReader(prisma),
    new PrismaTenantSettingsRepository(prisma),
    gateways,
  );
  const callbackUseCase = new HandleOnlinePaymentCallbackUseCase(
    new PrismaUnitOfWork(prisma),
    new PrismaPaymentAttemptRepository(prisma),
    new PrismaTenantSettingsRepository(prisma),
    gateways,
    new PrismaAuditService(prisma),
    new PrismaOutboxPublisher(prisma),
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedPendingInstallment(amountRial = 5_000_000n) {
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

  it('init returns redirect URL and creates pending attempt', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const result = await initUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      returnUrl: 'https://panel.example.com/installments/done',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.redirectUrl).toContain('mock-gateway/pay');
    expect(result.gatewayToken).toBeTruthy();

    const row = await prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: result.paymentAttemptId },
    });
    expect(row.status).toBe('PENDING');
  });

  it('webhook success updates attempt and stays pending', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const init = await initUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      returnUrl: 'https://panel.example.com/installments/done',
      staffContext: staffContext(branch.id, staff.id),
    });

    const payload = {
      transactionId: 'txn-integration-001',
      status: 'success' as const,
      amountRial: installment.amountRial.toString(),
      referenceId: init.paymentAttemptId,
      cardMask: '****9999',
    };
    const signature = signMockPaymentGatewayPayload(payload, 'integration-secret');

    const callback = await callbackUseCase.execute({
      provider: 'mock',
      headers: { 'x-gateway-signature': signature },
      body: payload,
    });

    expect(callback.paymentAttempt.status).toBe('pending');
    expect(callback.paymentAttempt.methodDetails?.gatewayTransactionId).toBe('txn-integration-001');

    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'payment.report',
        entityId: init.paymentAttemptId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).toBeTruthy();
  });

  it('duplicate webhook is idempotent', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const init = await initUseCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      installmentId: installment.id,
      amountRial: installment.amountRial,
      returnUrl: 'https://panel.example.com/installments/done',
      staffContext: staffContext(branch.id, staff.id),
    });

    const payload = {
      transactionId: 'txn-integration-dup',
      status: 'success' as const,
      amountRial: installment.amountRial.toString(),
      referenceId: init.paymentAttemptId,
    };
    const signature = signMockPaymentGatewayPayload(payload, 'integration-secret');
    const headers = { 'x-gateway-signature': signature };

    const first = await callbackUseCase.execute({ provider: 'mock', headers, body: payload });
    const second = await callbackUseCase.execute({ provider: 'mock', headers, body: payload });

    expect(second.idempotentReplay).toBe(true);
    expect(second.paymentAttempt.id).toBe(first.paymentAttempt.id);
  });
});
