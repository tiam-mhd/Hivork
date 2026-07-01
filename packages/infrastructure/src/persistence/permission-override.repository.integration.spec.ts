import { afterAll, describe, expect, it } from 'vitest';

import {
  CreatePermissionOverrideUseCase,
  DeletePermissionOverrideUseCase,
  GetStaffPermissionsUseCase,
  ListPermissionOverridesUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaPermissionOverrideRepository } from '../persistence/permission-override.repository.js';
import { PrismaPermissionRegistry } from '../persistence/permission.registry.js';
import { PrismaStaffPermissionsRepository } from '../persistence/staff-permissions.repository.js';
import { PrismaStaffRepository } from '../persistence/staff.repository.js';
import { ensureTestStaff } from '../persistence/test-user.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Permission override (integration)', () => {
  const prisma = new PrismaService();
  const staffRepo = new PrismaStaffRepository(prisma);
  const overrides = new PrismaPermissionOverrideRepository(prisma);
  const staffPermissions = new PrismaStaffPermissionsRepository(prisma);
  const permissionRegistry = new PrismaPermissionRegistry(prisma);
  const audit = new PrismaAuditService(prisma);

  const createOverride = new CreatePermissionOverrideUseCase(
    staffRepo,
    overrides,
    staffPermissions,
    permissionRegistry,
    audit,
  );
  const listOverrides = new ListPermissionOverridesUseCase(staffRepo, overrides);
  const deleteOverride = new DeletePermissionOverrideUseCase(
    staffRepo,
    overrides,
    staffPermissions,
    audit,
  );
  const getPermissions = new GetStaffPermissionsUseCase(staffPermissions);

  const staffContext = {
    staffId: '',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates grant override and affects effective permissions', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: { staff: { where: { deletedAt: null }, take: 1 } },
    });
    if (!tenant?.staff[0]) {
      throw new Error('demo-shop owner required');
    }

    const owner = tenant.staff[0];
    staffContext.staffId = owner.id;

    const phoneSuffix = String(Date.now()).slice(-7);
    const target = await ensureTestStaff(prisma, {
      tenantId: tenant.id,
      phone: `0915${phoneSuffix}`,
      name: 'کارمند override',
    });

    const before = await getPermissions.execute({ staffId: target.id });
    expect(before.has('installments.sale.cancel')).toBe(false);

    const created = await createOverride.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      staffId: target.id,
      permission: 'installments.sale.cancel',
      effect: 'grant',
      reason: 'جایگزین موقت مدیر در مرخصی',
      staffContext,
    });

    const listed = await listOverrides.execute({
      tenantId: tenant.id,
      staffId: target.id,
      staffContext,
    });
    expect(listed.data.some((item) => item.id === created.id)).toBe(true);

    const afterGrant = await getPermissions.execute({ staffId: target.id });
    expect(afterGrant.has('installments.sale.cancel')).toBe(true);

    await deleteOverride.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      staffId: target.id,
      overrideId: created.id,
      staffContext,
    });

    const afterDelete = await getPermissions.execute({ staffId: target.id });
    expect(afterDelete.has('installments.sale.cancel')).toBe(false);
  });
});
