import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateStaffSavedViewUseCase,
  ForkSharedSavedViewUseCase,
  ListStaffSavedViewsUseCase,
  RestoreStaffSavedViewUseCase,
  SoftDeleteStaffSavedViewUseCase,
  UpdateStaffSavedViewUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../../audit/prisma-audit.service.js';
import { PrismaStaffSavedFilterRepository } from '../persistence/staff-saved-filter.repository.js';
import { PrismaStaffSavedViewRepository } from '../persistence/staff-saved-view.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('StaffSavedView (integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaStaffSavedViewRepository(prisma);
  const savedFilters = new PrismaStaffSavedFilterRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const listUseCase = new ListStaffSavedViewsUseCase(repository);
  const createUseCase = new CreateStaffSavedViewUseCase(repository, savedFilters, audit);
  const updateUseCase = new UpdateStaffSavedViewUseCase(repository, savedFilters, audit);
  const deleteUseCase = new SoftDeleteStaffSavedViewUseCase(repository, audit);
  const restoreUseCase = new RestoreStaffSavedViewUseCase(repository, audit);
  const forkUseCase = new ForkSharedSavedViewUseCase(repository, savedFilters, audit);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, defaults, soft deletes, and restores a saved view', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant?.id, deletedAt: null },
    });

    if (!tenant || !staff) {
      throw new Error('demo-shop tenant and staff required');
    }

    const columnState = {
      order: ['displayName', 'phone'],
      visibility: { phone: true, displayName: true },
    };

    const created = await createUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
      name: `View ${Date.now()}`,
      columnState,
      sortBy: 'name',
      sortDir: 'asc',
      isDefault: true,
    });

    expect(created.isDefault).toBe(true);

    const second = await createUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
      name: `View B ${Date.now()}`,
      columnState,
      isDefault: true,
    });

    const listed = await listUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
      includeShared: false,
    });

    const defaults = listed.mine.filter((item) => item.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0]?.id).toBe(second.id);

    await deleteUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      viewId: created.id,
    });

    const afterDelete = await listUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      resourceKey: 'customers',
      includeShared: false,
    });

    expect(afterDelete.mine.some((item) => item.id === created.id)).toBe(false);

    await restoreUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      viewId: created.id,
    });

    const renamed = await updateUseCase.execute({
      tenantId: tenant.id,
      staffId: staff.id,
      viewId: created.id,
      name: `View restored ${Date.now()}`,
      version: created.version + 1,
    });

    expect(renamed.name).toContain('View restored');
  });

  it('shares a view within tenant and allows another staff to fork it', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const owner = await prisma.staff.findFirst({
      where: { tenantId: tenant?.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const otherStaff = await prisma.staff.findFirst({
      where: { tenantId: tenant?.id, deletedAt: null, id: { not: owner?.id } },
      orderBy: { createdAt: 'asc' },
    });

    if (!tenant || !owner || !otherStaff) {
      throw new Error('demo-shop tenant with at least two staff required');
    }

    const columnState = {
      order: ['displayName'],
      visibility: { displayName: true },
    };

    const sharedView = await createUseCase.execute({
      tenantId: tenant.id,
      staffId: owner.id,
      resourceKey: 'customers',
      name: `Shared ${Date.now()}`,
      columnState,
    });

    const published = await updateUseCase.execute({
      tenantId: tenant.id,
      staffId: owner.id,
      viewId: sharedView.id,
      visibility: 'shared',
      version: sharedView.version,
    });

    expect(published.visibility).toBe('shared');

    const otherListed = await listUseCase.execute({
      tenantId: tenant.id,
      staffId: otherStaff.id,
      resourceKey: 'customers',
      includeShared: true,
    });

    expect(otherListed.shared.some((item) => item.id === sharedView.id)).toBe(true);

    const forked = await forkUseCase.execute({
      tenantId: tenant.id,
      staffId: otherStaff.id,
      viewId: sharedView.id,
      name: `Fork ${Date.now()}`,
    });

    expect(forked.visibility).toBe('private');
    expect(forked.staffId).toBe(otherStaff.id);
  });
});
