import type { PrismaService } from '@hivork/infrastructure';
import type Redis from 'ioredis';

import { invalidateTenantModulesCache, type SeedStaff } from './rbac-seed.helper.js';
import { runTestSeed } from './test-prisma-context.helper.js';
import { ensureUser } from './user-seed.helper.js';

const TENANT_A_SLUG = 'cross-tenant-a';
const TENANT_B_SLUG = 'cross-tenant-b';

export type TenantFixture = {
  id: string;
  slug: string;
  owner: SeedStaff;
  branchId: string;
  customerId: string;
};

export type CrossTenantSeed = {
  tenantA: TenantFixture;
  tenantB: TenantFixture;
};

export async function seedCrossTenantFixtures(
  prisma: PrismaService,
  redis: Redis,
): Promise<CrossTenantSeed> {
  return runTestSeed(() => seedCrossTenantFixturesInner(prisma, redis));
}

async function seedCrossTenantFixturesInner(
  prisma: PrismaService,
  redis: Redis,
): Promise<CrossTenantSeed> {
  const tenantA = await seedIsolatedTenant(prisma, {
    slug: TENANT_A_SLUG,
    name: 'فروشگاه ایزوله A',
    ownerPhone: '09121000001',
    ownerName: 'مالک tenant A',
    customerPhone: '09122000001',
    customerName: 'مشتری tenant A',
    localCode: 'CTA-001',
  });

  const tenantB = await seedIsolatedTenant(prisma, {
    slug: TENANT_B_SLUG,
    name: 'فروشگاه ایزوله B',
    ownerPhone: '09121000002',
    ownerName: 'مالک tenant B',
    customerPhone: '09122000002',
    customerName: 'مشتری tenant B',
    localCode: 'CTB-001',
  });

  await invalidateTenantModulesCache(redis, tenantA.id);
  await invalidateTenantModulesCache(redis, tenantB.id);

  return { tenantA, tenantB };
}

async function seedIsolatedTenant(
  prisma: PrismaService,
  input: {
    slug: string;
    name: string;
    ownerPhone: string;
    ownerName: string;
    customerPhone: string;
    customerName: string;
    localCode: string;
  },
): Promise<TenantFixture> {
  const starterPlan = await prisma.plan.findFirst({
    where: { code: 'starter', deletedAt: null },
  });
  if (!starterPlan) {
    throw new Error('starter plan required');
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      name: input.name,
      planId: starterPlan.id,
      enabledModules: ['core', 'installments'],
      locale: 'fa_IR',
    },
    update: {
      name: input.name,
      enabledModules: ['core', 'installments'],
      deletedAt: null,
    },
  });

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id, status: 'active', deletedAt: null },
  });
  if (!subscription) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlan.id,
        status: 'active',
        startsAt: new Date(),
      },
    });
  }

  const ownerRoleId = await ensureOwnerRole(prisma, tenant.id);

  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
  });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'شعبه اصلی',
        isDefault: true,
        isActive: true,
      },
    });
  }

  const owner = await upsertOwnerStaff(prisma, {
    tenantId: tenant.id,
    phone: input.ownerPhone,
    name: input.ownerName,
    branchId: branch.id,
    roleId: ownerRoleId,
  });

  const customerId = await ensureTenantCustomer(prisma, {
    tenantId: tenant.id,
    phone: input.customerPhone,
    name: input.customerName,
    localCode: input.localCode,
    branchId: branch.id,
  });

  return {
    id: tenant.id,
    slug: tenant.slug,
    owner,
    branchId: branch.id,
    customerId,
  };
}

async function ensureOwnerRole(prisma: PrismaService, tenantId: string): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: { tenantId, code: 'owner', deletedAt: null },
  });
  if (existing) {
    return existing.id;
  }

  const templateOwner = await prisma.role.findFirst({
    where: { code: 'owner', isTemplate: true, tenantId: null, deletedAt: null },
    include: { rolePermissions: true },
  });
  if (!templateOwner) {
    throw new Error('owner template role required');
  }

  const cloned = await prisma.role.create({
    data: {
      scope: 'tenant',
      tenantId,
      code: 'owner',
      name: 'مالک',
      isSystem: true,
      isTemplate: false,
      dataScope: 'all',
    },
  });

  if (templateOwner.rolePermissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: templateOwner.rolePermissions.map((row) => ({
        roleId: cloned.id,
        permissionId: row.permissionId,
      })),
      skipDuplicates: true,
    });
  }

  return cloned.id;
}

async function upsertOwnerStaff(
  prisma: PrismaService,
  input: {
    tenantId: string;
    phone: string;
    name: string;
    branchId: string;
    roleId: string;
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
      dataScope: 'all',
      assignedBranchIds: [input.branchId],
      primaryBranchId: input.branchId,
    },
    update: {
      name: input.name,
      status: 'active',
      dataScope: 'all',
      assignedBranchIds: [input.branchId],
      primaryBranchId: input.branchId,
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

async function ensureTenantCustomer(
  prisma: PrismaService,
  input: {
    tenantId: string;
    phone: string;
    name: string;
    localCode: string;
    branchId: string;
  },
): Promise<string> {
  const user = await ensureUser(prisma, input.phone, input.name);

  let globalCustomer = await prisma.globalCustomer.findFirst({
    where: { userId: user.id, deletedAt: null },
  });
  if (!globalCustomer) {
    globalCustomer = await prisma.globalCustomer.create({
      data: {
        userId: user.id,
        name: input.name,
        status: 'active',
      },
    });
  }

  const link = await prisma.tenantCustomer.upsert({
    where: {
      tenantId_globalCustomerId: {
        tenantId: input.tenantId,
        globalCustomerId: globalCustomer.id,
      },
    },
    create: {
      tenantId: input.tenantId,
      globalCustomerId: globalCustomer.id,
      localCode: input.localCode,
      defaultBranchId: input.branchId,
    },
    update: {
      localCode: input.localCode,
      defaultBranchId: input.branchId,
      deletedAt: null,
    },
  });

  return link.id;
}
