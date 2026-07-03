import {
  MarkCheckBouncedUseCase,
  RegisterPayableCheckUseCase,
  RegisterReceivedCheckUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaCheckRepository,
  PrismaInstallmentRepository,
  PrismaOutboxPublisher,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '@hivork/infrastructure';
import { afterAll, describe, expect, it } from 'vitest';

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

describeIfDb('RegisterPayableCheckUseCase + MarkCheckBouncedUseCase (IFP-114 integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const checks = new PrismaCheckRepository(prisma);
  const installments = new PrismaInstallmentRepository(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const tenantSettings = new PrismaTenantSettingsRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);

  const registerPayableCheck = new RegisterPayableCheckUseCase(
    unitOfWork,
    checks,
    branches,
    tenantSettings,
    audit,
  );
  const registerReceivedCheck = new RegisterReceivedCheckUseCase(
    unitOfWork,
    checks,
    installments,
    paymentAttempts,
    branches,
    tenantSettings,
    audit,
  );
  const markCheckBounced = new MarkCheckBouncedUseCase(
    unitOfWork,
    checks,
    branches,
    tenantSettings,
    audit,
    outbox,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seedContext() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });

    return { tenant, branch, staff };
  }

  it('registers a payable check', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `PAY-${Date.now()}`;

    const result = await registerPayableCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملی',
      amountRial: 50_000_000n,
      dueDate: '1405-11-15',
      payeeName: 'تأمین‌کننده X',
      note: 'پرداخت بابت کالا',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.check.checkType).toBe('payable');
    expect(result.check.status).toBe('registered');

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'check.register.payable',
        entityId: result.check.id,
      },
    });
    expect(auditRow).toBeTruthy();
  });

  it('bounces a received check from registered status', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `RCV-BOUNCE-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'صادرات',
      amountRial: 12_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'علی احمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    const result = await markCheckBounced.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      bounceReason: 'موجودی ناکافی',
      staffContext: staffContext(branch.id, staff.id),
    });

    expect(result.check.status).toBe('bounced');

    const outboxRow = await prisma.outboxEvent.findFirst({
      where: {
        tenantId: tenant.id,
        eventType: 'check.bounced',
        aggregateId: registered.check.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(outboxRow).toBeTruthy();

    const auditRow = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'check.bounce',
        entityId: registered.check.id,
      },
    });
    expect(auditRow).toBeTruthy();
  });

  it('rejects bounce on payable check', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `PAY-BOUNCE-${Date.now()}`;

    const registered = await registerPayableCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'ملت',
      amountRial: 10_000_000n,
      dueDate: '1405-11-15',
      payeeName: 'Supplier',
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      markCheckBounced.execute({
        tenantId: tenant.id,
        staffId: staff.id,
        checkId: registered.check.id,
        bounceReason: 'invalid',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'CHECK_TYPE_NOT_RECEIVABLE',
      httpStatus: 400,
    });
  });

  it('rejects duplicate bounce', async () => {
    const { tenant, branch, staff } = await seedContext();
    const checkNumber = `RCV-DUP-BOUNCE-${Date.now()}`;

    const registered = await registerReceivedCheck.execute({
      tenantId: tenant.id,
      branchId: branch.id,
      staffId: staff.id,
      checkNumber,
      bankName: 'پارسیان',
      amountRial: 6_000_000n,
      dueDate: '1405-12-01',
      drawerName: 'رضا محمدی',
      staffContext: staffContext(branch.id, staff.id),
    });

    await markCheckBounced.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      checkId: registered.check.id,
      bounceReason: 'first bounce',
      staffContext: staffContext(branch.id, staff.id),
    });

    await expect(
      markCheckBounced.execute({
        tenantId: tenant.id,
        staffId: staff.id,
        checkId: registered.check.id,
        bounceReason: 'second bounce',
        staffContext: staffContext(branch.id, staff.id),
      }),
    ).rejects.toMatchObject({
      code: 'CHECK_ALREADY_BOUNCED',
      httpStatus: 409,
    });
  });
});
