import { randomUUID } from 'node:crypto';

import {
  MockPaymentGateway,
  MockPaymentGatewayRegistry,
  PrismaAuditService,
  PrismaBranchReader,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantPlanReader,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

import { InitOnlinePaymentUseCase } from '../installments/payments/init-online-payment.use-case.js';
import { RecordBankTransferPaymentUseCase } from '../installments/payments/record-bank-transfer-payment.use-case.js';
import { RecordCashManualPaymentUseCase } from '../installments/payments/record-cash-manual-payment.use-case.js';
import { RecordCheckPaymentUseCase } from '../installments/payments/record-check-payment.use-case.js';
import { RecordPosPaymentUseCase } from '../installments/payments/record-pos-payment.use-case.js';
import { CreateUnifiedPaymentUseCase } from './create-unified-payment.use-case.js';
import { DEFAULT_PAYMENT_METHOD_CONFIGS, PAYMENT_METHODS_SETTING_KEY } from '@hivork/contracts/settings';
import { ListEnabledPaymentMethodsUseCase } from './list-enabled-payment-methods.use-case.js';
import { WalletPaymentUseCase } from './wallet-payment.use-case.js';

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

describeIfDb('CreateUnifiedPaymentUseCase (IFP-105 integration)', () => {
  const prisma = new PrismaService();
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const recordCashManualPayment = new RecordCashManualPaymentUseCase(
    unitOfWork,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
    outbox,
  );
  const recordBankTransferPayment = new RecordBankTransferPaymentUseCase(
    unitOfWork,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
    outbox,
  );
  const recordPosPayment = new RecordPosPaymentUseCase(
    unitOfWork,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
    outbox,
  );
  const recordCheckPayment = new RecordCheckPaymentUseCase(
    unitOfWork,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
    outbox,
  );
  const mockGateway = new MockPaymentGateway({
    webhookSecret: 'integration-secret',
    publicApiBaseUrl: 'http://localhost:4000',
    nodeEnv: 'test',
  });
  const gateways = new MockPaymentGatewayRegistry(new Map([[mockGateway.provider, mockGateway]]));
  const initOnlinePayment = new InitOnlinePaymentUseCase(
    unitOfWork,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    gateways,
  );
  const walletPayment = new WalletPaymentUseCase();

  const useCase = new CreateUnifiedPaymentUseCase(
    tenantSettings,
    tenantPlans,
    paymentAttempts,
    recordCashManualPayment,
    recordBankTransferPayment,
    recordPosPayment,
    recordCheckPayment,
    initOnlinePayment,
    walletPayment,
  );

  const listMethodsUseCase = new ListEnabledPaymentMethodsUseCase(tenantSettings, tenantPlans);

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

    return { tenant, branch, staff, sale, installment };
  }

  async function upsertPaymentMethodsSetting(
    tenantId: string,
    staffId: string,
    methods: typeof DEFAULT_PAYMENT_METHOD_CONFIGS,
  ) {
    await prisma.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId,
          module: 'installments',
          key: PAYMENT_METHODS_SETTING_KEY,
        },
      },
      create: {
        tenantId,
        module: 'installments',
        key: PAYMENT_METHODS_SETTING_KEY,
        value: { methods },
        createdById: staffId,
        updatedById: staffId,
      },
      update: {
        value: { methods },
        updatedById: staffId,
        deletedAt: null,
      },
    });
  }

  it('dispatches cash payment through unified gateway', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      idempotencyKey: randomUUID(),
      staffContext: staffContext(branch.id, staff.id),
      body: {
        method: 'cash',
        installmentId: installment.id,
        amountRial: installment.amountRial,
        note: 'پرداخت یکپارچه نقدی',
      },
    });

    expect(result.paymentAttempt.method).toBe('cash');
    expect(result.paymentAttempt.status).toBe('pending');
    expect(result.paymentAttempt.amountRial).toBe(installment.amountRial.toString());
    expect(result.redirectUrl).toBeNull();
    expect(result.idempotentReplay).toBe(false);
  });

  it('returns PAYMENT_METHOD_DISABLED when method is tenant-disabled', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const disabledCash = DEFAULT_PAYMENT_METHOD_CONFIGS.map((config) =>
      config.method === 'cash' ? { ...config, enabled: false } : config,
    );
    await upsertPaymentMethodsSetting(tenant.id, staff.id, disabledCash);

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        branchId: branch.id,
        staffId: staff.id,
        idempotencyKey: randomUUID(),
        staffContext: staffContext(branch.id, staff.id),
        body: {
          method: 'cash',
          installmentId: installment.id,
          amountRial: installment.amountRial,
        },
      }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_METHOD_DISABLED',
      httpStatus: 403,
    });
  });

  it('returns redirectUrl for online payment when plan and settings allow', async () => {
    const { tenant, branch, staff, installment } = await seedPendingInstallment();

    const proPlan = await prisma.plan.findFirstOrThrow({ where: { code: 'pro' } });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { planId: proPlan.id },
    });

    const enabledOnline = DEFAULT_PAYMENT_METHOD_CONFIGS.map((config) =>
      config.method === 'online' ? { ...config, enabled: true } : config,
    );
    await upsertPaymentMethodsSetting(tenant.id, staff.id, enabledOnline);

    const result = await useCase.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      idempotencyKey: randomUUID(),
      staffContext: staffContext(branch.id, staff.id),
      body: {
        method: 'online',
        installmentId: installment.id,
        amountRial: installment.amountRial,
        returnUrl: 'https://app.example.com/payments/return',
      },
    });

    expect(result.paymentAttempt.method).toBe('online');
    expect(result.paymentAttempt.status).toBe('pending');
    expect(result.redirectUrl).toMatch(/^https?:\/\//);
  });

  it('lists methods with plan_required for online on starter plan', async () => {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });

    const starterPlan = await prisma.plan.findFirstOrThrow({ where: { code: 'starter' } });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { planId: starterPlan.id },
    });

    await prisma.tenantSetting.deleteMany({
      where: {
        tenantId: tenant.id,
        module: 'installments',
        key: PAYMENT_METHODS_SETTING_KEY,
      },
    });

    const result = await listMethodsUseCase.execute({ tenantId: tenant.id });
    const online = result.methods.find((item) => item.method === 'online');
    const cash = result.methods.find((item) => item.method === 'cash');

    expect(cash?.enabled).toBe(true);
    expect(online?.enabled).toBe(false);
    expect(online?.disabledReason).toBe('plan_required');
  });
});
