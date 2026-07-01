import type { IAuthTokenService } from '@hivork/application';
import type { PrismaService } from '@hivork/infrastructure';
import type Redis from 'ioredis';

import { runTestSeed } from './test-prisma-context.helper.js';
import { ensureUser } from './user-seed.helper.js';

const DEMO_SLUG = 'demo-shop';
const NO_MODULE_SLUG = 'rbac-no-installments';
const BRANCH_B_NAME = 'شعبه RBAC تست';

export type SeedStaff = {
  id: string;
  tenantId: string;
  userId: string;
  phone: string;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
};

export type Phase1RbacSeed = {
  tenantId: string;
  branchA: { id: string };
  branchB: { id: string };
  customerId: string;
  owner: SeedStaff;
  cashier: SeedStaff;
  viewer: SeedStaff;
  branchAStaff: SeedStaff;
  ownScopeStaff: SeedStaff;
  cashierWithDenyOverride: SeedStaff;
  viewerWithoutSaleList: SeedStaff;
  viewerWithCreateGrant: SeedStaff;
  noModuleTenant: { id: string; slug: string };
  noModuleStaff: SeedStaff;
};

export function futureDateOnly(daysFromNow = 30): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export async function issueStaffAccessToken(
  tokens: IAuthTokenService,
  staff: Pick<SeedStaff, 'id' | 'tenantId'>,
): Promise<string> {
  return tokens.signAccessToken({
    sub: staff.id,
    actor: 'staff',
    tenantId: staff.tenantId,
  });
}

export async function invalidateStaffPermissionsCache(
  redis: Redis,
  staffId: string,
): Promise<void> {
  await redis.del(`staff:${staffId}:permissions`);
}

export async function invalidateTenantModulesCache(
  redis: Redis,
  tenantId: string,
): Promise<void> {
  await redis.del(`tenant:${tenantId}:enabled_modules`);
}

export async function seedPhase1RbacFixtures(
  prisma: PrismaService,
  redis: Redis,
): Promise<Phase1RbacSeed> {
  return runTestSeed(() => seedPhase1RbacFixturesInner(prisma, redis));
}

async function seedPhase1RbacFixturesInner(
  prisma: PrismaService,
  redis: Redis,
): Promise<Phase1RbacSeed> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug: DEMO_SLUG, deletedAt: null },
    include: {
      branches: { where: { deletedAt: null, isActive: true }, orderBy: { createdAt: 'asc' } },
      tenantCustomers: { where: { deletedAt: null }, take: 1 },
      staff: {
        where: {
          user: { phone: process.env.SEED_OWNER_PHONE ?? '09120000000' },
          deletedAt: null,
        },
        take: 1,
      },
    },
  });

  if (!tenant?.branches[0] || !tenant.tenantCustomers[0] || !tenant.staff[0]) {
    throw new Error('demo-shop seed data required (owner, branch, customer)');
  }

  const ownerRecord = tenant.staff[0];
  const ownerUser = await prisma.user.findFirstOrThrow({
    where: { id: ownerRecord.userId },
  });
  const branchA = tenant.branches[0];
  let branchB = tenant.branches.find((branch) => branch.id !== branchA.id);

  if (!branchB) {
    const existingB = await prisma.branch.findFirst({
      where: { tenantId: tenant.id, name: BRANCH_B_NAME },
    });
    if (existingB) {
      if (existingB.deletedAt) {
        branchB = await prisma.branch.update({
          where: { id: existingB.id },
          data: { deletedAt: null, deletedById: null, deleteReason: null, isActive: true },
        });
      } else {
        branchB = existingB;
      }
    } else {
      branchB = await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          name: BRANCH_B_NAME,
          isDefault: false,
          isActive: true,
        },
      });
    }
  }

  const demoCustomer = tenant.tenantCustomers[0];
  if (demoCustomer && demoCustomer.defaultBranchId !== branchA.id) {
    await prisma.tenantCustomer.update({
      where: { id: demoCustomer.id },
      data: { defaultBranchId: branchA.id },
    });
  }

  const roles = await prisma.role.findMany({
    where: {
      tenantId: tenant.id,
      code: { in: ['owner', 'cashier', 'viewer'] },
      deletedAt: null,
    },
  });
  const roleByCode = new Map(roles.map((role) => [role.code, role.id]));
  const ownerRoleId = roleByCode.get('owner');
  const cashierRoleId = roleByCode.get('cashier');
  const viewerRoleId = roleByCode.get('viewer');

  if (!ownerRoleId || !cashierRoleId || !viewerRoleId) {
    throw new Error('demo-shop RBAC roles required (owner, cashier, viewer)');
  }

  const owner: SeedStaff = {
    id: ownerRecord.id,
    tenantId: tenant.id,
    userId: ownerRecord.userId,
    phone: ownerUser.phone,
    dataScope: 'all',
    assignedBranchIds: [],
  };

  const cashier = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000001',
    name: 'صندوقدار RBAC',
    dataScope: 'branch',
    assignedBranchIds: [branchA.id],
    primaryBranchId: branchA.id,
    roleId: cashierRoleId,
    createdById: owner.id,
  });

  const viewer = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000002',
    name: 'مشاهده‌گر RBAC',
    dataScope: 'branch',
    assignedBranchIds: [branchA.id, branchB.id],
    primaryBranchId: branchA.id,
    roleId: viewerRoleId,
    createdById: owner.id,
  });

  const branchAStaff = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000003',
    name: 'کارمند شعبه A',
    dataScope: 'branch',
    assignedBranchIds: [branchA.id],
    primaryBranchId: branchA.id,
    roleId: cashierRoleId,
    createdById: owner.id,
  });

  const ownScopeStaff = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000004',
    name: 'کارمند own scope',
    dataScope: 'own',
    assignedBranchIds: [branchA.id],
    primaryBranchId: branchA.id,
    roleId: cashierRoleId,
    createdById: owner.id,
  });

  const cashierWithDenyOverride = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000005',
    name: 'صندوقدار با DENY',
    dataScope: 'all',
    assignedBranchIds: [branchA.id, branchB.id],
    primaryBranchId: branchA.id,
    roleId: cashierRoleId,
    createdById: owner.id,
  });

  await upsertPermissionOverride(prisma, {
    staffId: cashierWithDenyOverride.id,
    permissionCode: 'installments.sale.create',
    effect: 'deny',
    reason: 'RBAC integration DENY override',
    createdById: owner.id,
  });
  await invalidateStaffPermissionsCache(redis, cashierWithDenyOverride.id);

  const viewerWithoutSaleList = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000006',
    name: 'مشاهده‌گر بدون sale.view',
    dataScope: 'branch',
    assignedBranchIds: [branchA.id],
    primaryBranchId: branchA.id,
    roleId: viewerRoleId,
    createdById: owner.id,
  });

  await upsertPermissionOverride(prisma, {
    staffId: viewerWithoutSaleList.id,
    permissionCode: 'installments.sale.view',
    effect: 'deny',
    reason: 'RBAC integration deny sale list',
    createdById: owner.id,
  });
  await invalidateStaffPermissionsCache(redis, viewerWithoutSaleList.id);

  const viewerWithCreateGrant = await upsertStaffWithRole(prisma, {
    tenantId: tenant.id,
    phone: '09120000007',
    name: 'مشاهده‌گر با GRANT create',
    dataScope: 'branch',
    assignedBranchIds: [branchA.id],
    primaryBranchId: branchA.id,
    roleId: viewerRoleId,
    createdById: owner.id,
  });

  await upsertPermissionOverride(prisma, {
    staffId: viewerWithCreateGrant.id,
    permissionCode: 'installments.sale.create',
    effect: 'grant',
    reason: 'RBAC integration GRANT override',
    createdById: owner.id,
  });
  await invalidateStaffPermissionsCache(redis, viewerWithCreateGrant.id);

  const noModuleTenant = await seedTenantWithoutInstallments(prisma, owner.id);
  const noModuleOwnerRole = await prisma.role.findFirst({
    where: { tenantId: noModuleTenant.id, code: 'owner', deletedAt: null },
  });
  if (!noModuleOwnerRole) {
    throw new Error('no-module tenant owner role required');
  }

  const noModuleStaff = await upsertStaffWithRole(prisma, {
    tenantId: noModuleTenant.id,
    phone: '09120000008',
    name: 'کارمند بدون ماژول',
    dataScope: 'all',
    assignedBranchIds: [],
    primaryBranchId: null,
    roleId: noModuleOwnerRole.id,
    createdById: owner.id,
  });

  await invalidateTenantModulesCache(redis, noModuleTenant.id);

  return {
    tenantId: tenant.id,
    branchA: { id: branchA.id },
    branchB: { id: branchB.id },
    customerId: tenant.tenantCustomers[0].id,
    owner,
    cashier,
    viewer,
    branchAStaff,
    ownScopeStaff,
    cashierWithDenyOverride,
    viewerWithoutSaleList,
    viewerWithCreateGrant,
    noModuleTenant,
    noModuleStaff,
  };
}

async function upsertStaffWithRole(
  prisma: PrismaService,
  input: {
    tenantId: string;
    phone: string;
    name: string;
    dataScope: 'all' | 'branch' | 'own';
    assignedBranchIds: string[];
    primaryBranchId: string | null;
    roleId: string;
    createdById: string;
  },
): Promise<SeedStaff> {
  const user = await ensureUser(prisma, input.phone, input.name);

  const staff = await prisma.staff.upsert({
    where: {
      tenantId_userId: { tenantId: input.tenantId, userId: user.id },
    },
    create: {
      tenantId: input.tenantId,
      userId: user.id,
      name: input.name,
      status: 'active',
      dataScope: input.dataScope,
      assignedBranchIds: input.assignedBranchIds,
      primaryBranchId: input.primaryBranchId,
    },
    update: {
      name: input.name,
      status: 'active',
      dataScope: input.dataScope,
      assignedBranchIds: input.assignedBranchIds,
      primaryBranchId: input.primaryBranchId,
      deletedAt: null,
    },
  });

  await prisma.staffRole.upsert({
    where: {
      staffId_roleId: { staffId: staff.id, roleId: input.roleId },
    },
    create: { staffId: staff.id, roleId: input.roleId },
    update: { deletedAt: null },
  });

  return {
    id: staff.id,
    tenantId: staff.tenantId,
    userId: staff.userId,
    phone: user.phone,
    dataScope: staff.dataScope,
    assignedBranchIds: [...staff.assignedBranchIds],
  };
}

async function upsertPermissionOverride(
  prisma: PrismaService,
  input: {
    staffId: string;
    permissionCode: string;
    effect: 'grant' | 'deny';
    reason: string;
    createdById: string;
  },
): Promise<void> {
  const permission = await prisma.permission.findFirst({
    where: { code: input.permissionCode, deletedAt: null },
  });
  if (!permission) {
    throw new Error(`Permission not found: ${input.permissionCode}`);
  }

  await prisma.userPermissionOverride.upsert({
    where: {
      staffId_permissionId: {
        staffId: input.staffId,
        permissionId: permission.id,
      },
    },
    create: {
      staffId: input.staffId,
      permissionId: permission.id,
      effect: input.effect,
      reason: input.reason,
      createdById: input.createdById,
    },
    update: {
      effect: input.effect,
      reason: input.reason,
      deletedAt: null,
    },
  });
}

async function seedTenantWithoutInstallments(
  prisma: PrismaService,
  createdByStaffId: string,
): Promise<{ id: string; slug: string }> {
  const starterPlan = await prisma.plan.findFirst({
    where: { code: 'starter', deletedAt: null },
  });
  if (!starterPlan) {
    throw new Error('starter plan required');
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: NO_MODULE_SLUG },
    create: {
      slug: NO_MODULE_SLUG,
      name: 'فروشگاه بدون اقساط',
      planId: starterPlan.id,
      enabledModules: ['core'],
      locale: 'fa_IR',
    },
    update: {
      name: 'فروشگاه بدون اقساط',
      enabledModules: ['core'],
      deletedAt: null,
    },
  });

  const existingSubscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id, status: 'active', deletedAt: null },
  });
  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: 'active',
        startsAt: new Date(),
      },
    });
  }

  const ownerRole = await prisma.role.findFirst({
    where: { tenantId: tenant.id, code: 'owner', deletedAt: null },
  });
  if (!ownerRole) {
    const templateOwner = await prisma.role.findFirst({
      where: { code: 'owner', isTemplate: true, tenantId: null, deletedAt: null },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
    if (!templateOwner) {
      throw new Error('owner template role required');
    }

    const cloned = await prisma.role.create({
      data: {
        scope: 'tenant',
        tenantId: tenant.id,
        code: 'owner',
        name: 'مالک',
        isSystem: true,
        isTemplate: false,
        dataScope: 'all',
      },
    });

    const permissionIds = templateOwner.rolePermissions
      .map((row) => row.permissionId)
      .filter(Boolean);
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: cloned.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  const branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, deletedAt: null },
  });
  if (!branch) {
    await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'شعبه اصلی',
        isDefault: true,
        isActive: true,
        createdById: createdByStaffId,
      },
    });
  }

  return { id: tenant.id, slug: tenant.slug };
}
