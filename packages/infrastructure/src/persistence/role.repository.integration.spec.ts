import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateRoleUseCase,
  GetRoleUseCase,
  ListRolesUseCase,
  SoftDeleteRoleUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaPermissionRegistry } from '../persistence/permission.registry.js';
import { PrismaRoleRepository } from '../persistence/role.repository.js';
import { PrismaStaffPermissionsRepository } from '../persistence/staff-permissions.repository.js';
import { PrismaStaffRepository } from '../persistence/staff.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ensureTestStaff } from '../persistence/test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Role CRUD (integration)', () => {
  const prisma = new PrismaService();
  const roles = new PrismaRoleRepository(prisma);
  const staffRepo = new PrismaStaffRepository(prisma);
  const staffPermissions = new PrismaStaffPermissionsRepository(prisma);
  const permissionRegistry = new PrismaPermissionRegistry(prisma);
  const audit = new PrismaAuditService(prisma);

  const createRole = new CreateRoleUseCase(
    roles,
    staffRepo,
    staffPermissions,
    permissionRegistry,
    audit,
  );
  const listRoles = new ListRolesUseCase(roles);
  const getRole = new GetRoleUseCase(roles);
  const softDeleteRole = new SoftDeleteRoleUseCase(roles, staffRepo, staffPermissions, audit);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('owner creates a custom role and lists it', async () => {
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
    const suffix = String(Date.now()).slice(-6);

    const created = await createRole.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      code: `accountant_${suffix}`,
      name: `حسابدار ${suffix}`,
      permissions: ['core.branch.view', 'installments.report.dashboard'],
      dataScope: 'all',
    });

    expect(created.isSystem).toBe(false);

    const listed = await listRoles.execute({ tenantId: tenant.id });
    expect(listed.data.some((role) => role.id === created.id)).toBe(true);
    expect(listed.data.some((role) => role.code === 'owner' && role.isSystem)).toBe(true);

    const detail = await getRole.execute({ tenantId: tenant.id, roleId: created.id });
    expect(detail.permissions).toContain('core.branch.view');

    const deleted = await softDeleteRole.execute({
      tenantId: tenant.id,
      actorId: owner.id,
      roleId: created.id,
    });
    expect(deleted.deletedAt).toBeTruthy();
  });

  it('manager cannot create a custom role', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const managerRole = await prisma.role.findFirst({
      where: { tenantId: tenant.id, code: 'manager', deletedAt: null },
    });
    if (!managerRole) {
      throw new Error('manager role required');
    }

    const phoneSuffix = String(Date.now()).slice(-7);
    const manager = await ensureTestStaff(prisma, {
      tenantId: tenant.id,
      phone: `0913${phoneSuffix}`,
      name: 'مدیر تست',
    });

    await prisma.staffRole.create({
      data: { staffId: manager.id, roleId: managerRole.id },
    });

    await expect(
      createRole.execute({
        tenantId: tenant.id,
        actorId: manager.id,
        code: `blocked_${phoneSuffix}`,
        name: 'نقش ممنوع',
        permissions: ['core.branch.view'],
        dataScope: 'all',
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED', httpStatus: 403 });
  });
});
