import { afterAll, describe, expect, it } from 'vitest';

import { GetInstallmentSettingsUseCase } from '@hivork/application';

import { PrismaTenantSettingsRepository } from '../settings/prisma-tenant-settings.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaModuleEntitlement } from './prisma-module-entitlement.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('GetInstallmentSettingsUseCase (integration)', () => {
  const prisma = new PrismaService();
  const settingsRepository = new PrismaTenantSettingsRepository(prisma);
  const moduleEntitlement = new PrismaModuleEntitlement(prisma);
  const useCase = new GetInstallmentSettingsUseCase(moduleEntitlement, settingsRepository);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns stored values merged with defaults', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      select: { id: true, enabledModules: true },
    });

    if (!tenant?.enabledModules.includes('installments')) {
      throw new Error('demo-shop must have installments module enabled');
    }

    await prisma.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId: tenant.id,
          module: 'installments',
          key: 'default_installment_count',
        },
      },
      create: {
        tenantId: tenant.id,
        module: 'installments',
        key: 'default_installment_count',
        value: 18,
      },
      update: {
        value: 18,
        deletedAt: null,
      },
    });

    const result = await useCase.execute({ tenantId: tenant.id });

    expect(result.installments.default_installment_count).toBe(18);
    expect(result.installments.reminder_days_before).toEqual([3, 1]);

    await prisma.tenantSetting.updateMany({
      where: {
        tenantId: tenant.id,
        module: 'installments',
        key: 'default_installment_count',
      },
      data: { deletedAt: new Date(), deletedById: null },
    });
  });

  it('rejects when installments module is not enabled', async () => {
    await expect(
      useCase.execute({ tenantId: '00000000-0000-0000-0000-000000000001' }),
    ).rejects.toMatchObject({
      code: 'MODULE_NOT_ENABLED',
      httpStatus: 403,
    });
  });
});
