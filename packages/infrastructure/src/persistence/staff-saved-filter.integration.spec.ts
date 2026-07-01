import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateStaffSavedFilterUseCase,
  ListStaffSavedFiltersUseCase,
  RestoreStaffSavedFilterUseCase,
  SoftDeleteStaffSavedFilterUseCase,
  UpdateStaffSavedFilterUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../../audit/prisma-audit.service.js';
import { PrismaStaffSavedFilterRepository } from '../persistence/staff-saved-filter.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('StaffSavedFilter (integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaStaffSavedFilterRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const listUseCase = new ListStaffSavedFiltersUseCase(repository);
  const createUseCase = new CreateStaffSavedFilterUseCase(repository, audit);
  const updateUseCase = new UpdateStaffSavedFilterUseCase(repository, audit);
  const deleteUseCase = new SoftDeleteStaffSavedFilterUseCase(repository, audit);
  const restoreUseCase = new RestoreStaffSavedFilterUseCase(repository, audit);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, defaults, soft deletes, and restores a saved filter', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant?.id, deletedAt: null },
    });

    if (!tenant || !staff) {
      throw new Error('demo-shop tenant and staff required');
    }

    const filterAst = {
      root: {
        type: 'group' as const,
        logic: 'and' as const,
        children: [
          {
            type: 'condition' as const,
            field: 'name',
            operator: 'contains' as const,
            value: 'test',
          },
        ],
      },
    };

    const created = await createUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
      name: `Saved ${Date.now()}`,
      filterAst,
      isDefault: true,
    });

    expect(created.isDefault).toBe(true);

    const second = await createUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
      name: `Saved B ${Date.now()}`,
      filterAst,
      isDefault: true,
    });

    const listed = await listUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
    });

    const defaults = listed.items.filter((item) => item.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe(second.id);

    await deleteUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      filterId: created.id,
    });

    const afterDelete = await listUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
    });
    expect(afterDelete.items.some((item) => item.id === created.id)).toBe(false);

    const restored = await restoreUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      filterId: created.id,
    });

    expect(restored.deletedAt).toBeNull();

    await updateUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      filterId: restored.id,
      version: restored.version,
      isDefault: false,
    });

    await deleteUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      filterId: created.id,
    });
    await deleteUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      filterId: second.id,
    });
  });
});
