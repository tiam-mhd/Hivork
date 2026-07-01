import { afterAll, describe, expect, it } from 'vitest';

import {
  GetInstallmentSettingsUseCase,
  UpdateInstallmentSettingsUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaTenantSettingsRepository } from '../settings/prisma-tenant-settings.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaModuleEntitlement } from './prisma-module-entitlement.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('UpdateInstallmentSettingsUseCase (integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const settingsRepository = new PrismaTenantSettingsRepository(prisma);
  const moduleEntitlement = new PrismaModuleEntitlement(prisma);
  const audit = new PrismaAuditService(prisma);
  const getSettings = new GetInstallmentSettingsUseCase(moduleEntitlement, settingsRepository);
  const updateSettings = new UpdateInstallmentSettingsUseCase(
    getSettings,
    settingsRepository,
    audit,
    unitOfWork,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists patch and returns merged settings with audit rows', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: { staff: { where: { deletedAt: null }, take: 1 } },
    });

    if (!tenant?.staff[0]) {
      throw new Error('demo-shop seed data required');
    }

    const staffId = tenant.staff[0].id;

    const updated = await updateSettings.execute({
      tenantId: tenant.id,
      actorId: staffId,
      patch: {
        default_installment_count: 9,
        reminder_on_due_date: false,
      },
      ip: '127.0.0.1',
    });

    expect(updated.installments.default_installment_count).toBe(9);
    expect(updated.installments.reminder_on_due_date).toBe(false);
    expect(updated.installments.reminder_days_before).toEqual([3, 1]);

    const loaded = await getSettings.execute({ tenantId: tenant.id });
    expect(loaded.installments.default_installment_count).toBe(9);
    expect(loaded.installments.reminder_on_due_date).toBe(false);

    const auditRows = await audit.find({
      tenantId: tenant.id,
      action: 'settings.change',
      entityType: 'TenantSettings',
      limit: 10,
    });

    const countAudit = auditRows.find(
      (row) =>
        row.metadata?.key === 'default_installment_count' &&
        row.newValue &&
        typeof row.newValue === 'object' &&
        'default_installment_count' in row.newValue,
    );
    const reminderAudit = auditRows.find(
      (row) =>
        row.metadata?.key === 'reminder_on_due_date' &&
        row.newValue &&
        typeof row.newValue === 'object' &&
        'reminder_on_due_date' in row.newValue,
    );

    expect(countAudit?.newValue).toEqual({ default_installment_count: 9 });
    expect(reminderAudit?.newValue).toEqual({ reminder_on_due_date: false });

    await prisma.tenantSetting.updateMany({
      where: {
        tenantId: tenant.id,
        module: 'installments',
        key: { in: ['default_installment_count', 'reminder_on_due_date'] },
      },
      data: { deletedAt: new Date() },
    });
  });
});
