import { afterAll, describe, expect, it } from 'vitest';

import {
  AssignRoleToStaffUseCase,
  RemoveRoleFromStaffUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaRoleRepository } from '../persistence/role.repository.js';
import { PrismaStaffPermissionsRepository } from '../persistence/staff-permissions.repository.js';
import { PrismaStaffRoleRepository } from '../persistence/staff-role.repository.js';
import { PrismaStaffRepository } from '../persistence/staff.repository.js';
import { ensureTestStaff } from '../persistence/test-user.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Staff role assignment (integration)', () => {
  const prisma = new PrismaService();
  const staffRepo = new PrismaStaffRepository(prisma);
  const roles = new PrismaRoleRepository(prisma);
  const staffRoles = new PrismaStaffRoleRepository(prisma);
  const staffPermissions = new PrismaStaffPermissionsRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const assignRole = new AssignRoleToStaffUseCase(
    staffRepo,
    roles,
    staffRoles,
    staffPermissions,
    audit,
  );
  const removeRole = new RemoveRoleFromStaffUseCase(
    staffRepo,
    roles,
    staffRoles,
    staffPermissions,
    audit,
  );

  const staffContext = {
    staffId: '',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('assigns and removes a cashier role from staff', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        staff: {
          where: { deletedAt: null },
          take: 1,
        },
      },
    });
    if (!tenant?.staff[0]) {
      throw new Error('demo-shop owner required');
    }

    const owner = tenant.staff[0];
    staffContext.staffId = owner.id;

    const cashierRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'cashier', deletedAt: null },
    });
    if (!cashierRole) {
      throw new Error('cashier role required');
    }

    const phoneSuffix = String(Date.now()).slice(-7);
    const target = await ensureTestStaff(prisma, {
      tenantId: tenant.id,
      phone: `0914${phoneSuffix}`,
      name: 'کارمند نقش',
    });

    const assigned = await assignRole.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      staffId: target.id,
      roleId: cashierRole.id,
      staffContext,
    });

    expect(assigned.role.code).toBe('cashier');
    expect(assigned.created).toBe(true);

    const staffRecord = await staffRepo.findActiveByIdForTenant(target.id, tenant.id);
    expect(staffRecord?.roleIds).toContain(cashierRole.id);

    const idempotent = await assignRole.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      staffId: target.id,
      roleId: cashierRole.id,
      staffContext,
    });
    expect(idempotent.created).toBe(false);

    const removed = await removeRole.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      staffId: target.id,
      roleId: cashierRole.id,
      staffContext,
    });
    expect(removed.removed).toBe(true);

    const afterRemove = await staffRoles.findActiveAssignment(
      tenant.id,
      target.id,
      cashierRole.id,
    );
    expect(afterRemove).toBeNull();
  });
});
