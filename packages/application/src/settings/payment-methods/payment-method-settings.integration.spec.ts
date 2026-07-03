import { PAYMENT_METHODS_SETTING_KEY } from '@hivork/contracts/settings';
import {
  GetPaymentMethodSettingsUseCase,
  UpdatePaymentMethodSettingsUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaModuleEntitlement,
  PrismaPaymentAttemptRepository,
  PrismaService,
  PrismaTenantPlanReader,
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

describeIfDb('Payment method settings (IFP-106 integration)', () => {
  const prisma = new PrismaService();
  const settingsRepository = new PrismaTenantSettingsRepository(prisma);
  const moduleEntitlement = new PrismaModuleEntitlement(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const paymentAttempts = new PrismaPaymentAttemptRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);

  const getSettings = new GetPaymentMethodSettingsUseCase(moduleEntitlement, settingsRepository);
  const updateSettings = new UpdatePaymentMethodSettingsUseCase(
    getSettings,
    settingsRepository,
    tenantPlans,
    paymentAttempts,
    audit,
    unitOfWork,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function getDemoTenant() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
      include: { staff: { where: { deletedAt: null }, take: 1 } },
    });

    if (!tenant.staff[0]) {
      throw new Error('demo-shop seed data required');
    }

    return { tenant, staffId: tenant.staff[0].id };
  }

  it('returns default payment methods when setting is absent', async () => {
    const { tenant } = await getDemoTenant();

    await prisma.tenantSetting.deleteMany({
      where: {
        tenantId: tenant.id,
        module: 'installments',
        key: PAYMENT_METHODS_SETTING_KEY,
      },
    });

    const result = await getSettings.execute({ tenantId: tenant.id });
    const cash = result.methods.find((item) => item.method === 'cash');
    const online = result.methods.find((item) => item.method === 'online');

    expect(result.methods).toHaveLength(7);
    expect(cash?.enabled).toBe(true);
    expect(online?.enabled).toBe(false);
    expect(online?.requiresPlan).toBe('pro');
  });

  it('persists patch and writes settings.change audit', async () => {
    const { tenant, staffId } = await getDemoTenant();

    const updated = await updateSettings.execute({
      tenantId: tenant.id,
      actorId: staffId,
      patch: {
        methods: [
          { method: 'cash', enabled: true, displayOrder: 0 },
          { method: 'card', enabled: true, displayOrder: 3 },
        ],
      },
      ip: '127.0.0.1',
    });

    const card = updated.methods.find((item) => item.method === 'card');
    expect(card?.enabled).toBe(true);

    const auditRows = await audit.find({
      tenantId: tenant.id,
      action: 'settings.change',
      entityType: 'TenantSettings',
      limit: 20,
    });

    const paymentMethodsAudit = auditRows.find(
      (row) => row.metadata?.key === PAYMENT_METHODS_SETTING_KEY,
    );
    expect(paymentMethodsAudit).toBeDefined();
    expect(paymentMethodsAudit?.newValue).toMatchObject({
      methods: expect.arrayContaining([
        expect.objectContaining({ method: 'card', enabled: true }),
      ]),
    });

    await prisma.tenantSetting.updateMany({
      where: {
        tenantId: tenant.id,
        module: 'installments',
        key: PAYMENT_METHODS_SETTING_KEY,
      },
      data: { deletedAt: new Date() },
    });
  });

  it('rejects disabling all payment methods', async () => {
    const { tenant, staffId } = await getDemoTenant();

    await expect(
      updateSettings.execute({
        tenantId: tenant.id,
        actorId: staffId,
        patch: {
          methods: [
            { method: 'cash', enabled: false, displayOrder: 0 },
            { method: 'bank_transfer', enabled: false, displayOrder: 1 },
            { method: 'in_person', enabled: false, displayOrder: 2 },
          ],
        },
      }),
    ).rejects.toMatchObject({
      code: 'AT_LEAST_ONE_METHOD_REQUIRED',
      httpStatus: 400,
    });
  });
});
