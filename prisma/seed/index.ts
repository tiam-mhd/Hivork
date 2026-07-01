import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

import { CORE_SETTING_DEFAULTS, SEED_PLANS } from './plans.ts';
import { ALL_SEED_PERMISSION_CODES, OBSOLETE_INSTALLMENTS_PERMISSION_CODES, parsePermissionCode, resolvePermissionDescription } from './permissions.ts';
import { TEMPLATE_ROLES } from './role-mappings.ts';

const prisma = new PrismaClient();

const DEMO_SLUG = 'demo-shop';
const DEMO_BRANCH_NAME = 'شعبه اصلی';

function envOrDefault(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

async function seedPermissions() {
  const permissionIds = new Map<string, string>();

  for (const code of ALL_SEED_PERMISSION_CODES) {
    const { module } = parsePermissionCode(code);
    const row = await prisma.permission.upsert({
      where: { code },
      create: {
        code,
        module,
        description: resolvePermissionDescription(code),
      },
      update: {
        module,
        description: resolvePermissionDescription(code),
        deletedAt: null,
      },
    });
    permissionIds.set(code, row.id);
  }

  return permissionIds;
}

async function cleanupObsoleteInstallmentsPermissions() {
  for (const code of OBSOLETE_INSTALLMENTS_PERMISSION_CODES) {
    const permission = await prisma.permission.findUnique({ where: { code } });
    if (!permission || permission.deletedAt) continue;

    await prisma.rolePermission.deleteMany({ where: { permissionId: permission.id } });
    await prisma.userPermissionOverride.deleteMany({ where: { permissionId: permission.id } });

    await prisma.permission.update({
      where: { id: permission.id },
      data: { deletedAt: new Date() },
    });
  }
}

async function syncRolePermissions(roleId: string, permissionCodes: string[], permissionIds: Map<string, string>) {
  const ids = permissionCodes.map((code) => permissionIds.get(code)).filter((id): id is string => Boolean(id));

  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (ids.length === 0) return;

  await prisma.rolePermission.createMany({
    data: ids.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
}

async function seedTemplateRoles(permissionIds: Map<string, string>) {
  const templateRoleIds = new Map<string, string>();

  for (const template of TEMPLATE_ROLES) {
    let role = await prisma.role.findFirst({
      where: { code: template.code, isTemplate: true, tenantId: null },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          scope: 'tenant',
          tenantId: null,
          code: template.code,
          name: template.name,
          isSystem: true,
          isTemplate: true,
          dataScope: template.dataScope,
        },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          name: template.name,
          dataScope: template.dataScope,
          isSystem: true,
          isTemplate: true,
          deletedAt: null,
        },
      });
    }

    await syncRolePermissions(role.id, template.permissionCodes, permissionIds);
    templateRoleIds.set(template.code, role.id);
  }

  return templateRoleIds;
}

async function cloneRoleForTenant(
  templateCode: string,
  tenantId: string,
  permissionIds: Map<string, string>,
) {
  const template = TEMPLATE_ROLES.find((r) => r.code === templateCode);
  if (!template) throw new Error(`Unknown template role: ${templateCode}`);

  let role = await prisma.role.findFirst({
    where: { tenantId, code: template.code, isTemplate: false },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        scope: 'tenant',
        tenantId,
        code: template.code,
        name: template.name,
        isSystem: true,
        isTemplate: false,
        dataScope: template.dataScope,
      },
    });
  } else {
    role = await prisma.role.update({
      where: { id: role.id },
      data: {
        name: template.name,
        dataScope: template.dataScope,
        isSystem: true,
        deletedAt: null,
      },
    });
  }

  await syncRolePermissions(role.id, template.permissionCodes, permissionIds);
  return role;
}

async function seedPlans() {
  const planIds = new Map<string, string>();

  for (const plan of SEED_PLANS) {
    const row = await prisma.plan.upsert({
      where: { code: plan.code },
      create: {
        code: plan.code,
        name: plan.name,
        modules: [...plan.modules],
        maxCustomers: plan.maxCustomers,
        maxStaff: plan.maxStaff,
        maxBranches: plan.maxBranches,
        priceRial: plan.priceRial,
        isActive: true,
      },
      update: {
        name: plan.name,
        modules: [...plan.modules],
        maxCustomers: plan.maxCustomers,
        maxStaff: plan.maxStaff,
        maxBranches: plan.maxBranches,
        priceRial: plan.priceRial,
        isActive: true,
        deletedAt: null,
      },
    });
    planIds.set(plan.code, row.id);
  }

  return planIds;
}

async function seedPlatformAdmin(phone: string) {
  await prisma.platformUser.upsert({
    where: { phone },
    create: {
      phone,
      name: 'مدیر پلتفرم',
      role: 'super_admin',
      status: 'active',
    },
    update: {
      name: 'مدیر پلتفرم',
      role: 'super_admin',
      status: 'active',
      deletedAt: null,
    },
  });
}

async function seedCoreSettings(tenantId: string) {
  for (const setting of CORE_SETTING_DEFAULTS) {
    await prisma.tenantSetting.upsert({
      where: {
        tenantId_module_key: {
          tenantId,
          module: setting.module,
          key: setting.key,
        },
      },
      create: {
        tenantId,
        module: setting.module,
        key: setting.key,
        value: setting.value,
      },
      update: {
        value: setting.value,
        deletedAt: null,
      },
    });
  }
}

async function seedDemoTenant(planIds: Map<string, string>, permissionIds: Map<string, string>, ownerPhone: string) {
  const starterPlanId = planIds.get('starter');
  if (!starterPlanId) throw new Error('starter plan missing');

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const tenant = await prisma.tenant.upsert({
    where: { slug: DEMO_SLUG },
    create: {
      name: 'فروشگاه نمونه',
      slug: DEMO_SLUG,
      planId: starterPlanId,
      enabledModules: ['installments'],
      status: 'trial',
      trialEndsAt,
      timezone: 'Asia/Tehran',
      locale: 'fa_IR',
    },
    update: {
      name: 'فروشگاه نمونه',
      planId: starterPlanId,
      enabledModules: ['installments'],
      deletedAt: null,
    },
  });

  let branch = await prisma.branch.findFirst({
    where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: DEMO_BRANCH_NAME,
        isDefault: true,
        isActive: true,
      },
    });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: tenant.id, status: 'active', deletedAt: null },
  });

  if (!subscription) {
    await prisma.subscription.create({
      data: {
        tenantId: tenant.id,
        planId: starterPlanId,
        status: 'active',
        startsAt: new Date(),
      },
    });
  }

  const clonedRoles = new Map<string, string>();
  for (const template of TEMPLATE_ROLES) {
    const role = await cloneRoleForTenant(template.code, tenant.id, permissionIds);
    clonedRoles.set(template.code, role.id);
  }

  const ownerRoleId = clonedRoles.get('owner');
  if (!ownerRoleId) throw new Error('owner role missing');

  const ownerUser = await prisma.user.upsert({
    where: { phone: ownerPhone },
    create: {
      phone: ownerPhone,
      name: 'مالک نمونه',
      status: 'active',
    },
    update: {
      name: 'مالک نمونه',
      status: 'active',
      deletedAt: null,
    },
  });

  const owner = await prisma.staff.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: ownerUser.id },
    },
    create: {
      tenantId: tenant.id,
      userId: ownerUser.id,
      name: 'مالک نمونه',
      status: 'active',
      dataScope: 'all',
      assignedBranchIds: [],
      primaryBranchId: branch.id,
    },
    update: {
      name: 'مالک نمونه',
      status: 'active',
      dataScope: 'all',
      assignedBranchIds: [],
      primaryBranchId: branch.id,
      deletedAt: null,
    },
  });

  await prisma.staffRole.upsert({
    where: {
      staffId_roleId: { staffId: owner.id, roleId: ownerRoleId },
    },
    create: { staffId: owner.id, roleId: ownerRoleId },
    update: { deletedAt: null },
  });

  await seedCoreSettings(tenant.id);

  return { tenant, branch, owner, ownerUser };
}

/** IFP-TASK-004 — enable SMS MFA step-up for demo owner when SEED_DEMO_MFA=true */
async function seedDemoUserMfa(userId: string) {
  if (process.env.SEED_DEMO_MFA !== 'true') {
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const existingMetadata =
    typeof user?.metadata === 'object' && user.metadata !== null
      ? (user.metadata as Record<string, unknown>)
      : {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      metadata: {
        ...existingMetadata,
        mfa: {
          otpEnabled: true,
          totpEnabled: false,
          requireMfaOnLogin: true,
        },
      },
    },
  });
}

/** IFP-TASK-001 — demo owner password credential (ADR-019) */
async function seedDemoUserCredential(userId: string) {
  const plain = envOrDefault('SEED_DEMO_PASSWORD', 'DemoPass1');
  const passwordHash = await argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const existing = await prisma.userCredential.findFirst({
    where: { userId, deletedAt: null },
  });
  if (existing) {
    await prisma.userCredential.update({
      where: { id: existing.id },
      data: { passwordHash, passwordChangedAt: new Date(), status: 'active' },
    });
    return;
  }

  await prisma.userCredential.create({
    data: {
      userId,
      passwordHash,
      passwordChangedAt: new Date(),
      status: 'active',
      createdById: userId,
    },
  });
}

/** TASK-064 — verifies tenant → branch → customer → sale → installments FK chain */
async function seedInstallmentsSmoke(tenantId: string, branchId: string, staffId: string) {
  const existing = await prisma.sale.findFirst({
    where: { tenantId, deletedAt: null, title: 'فروش نمونه اقساط' },
  });
  if (existing) return;

  const phone = envOrDefault('SEED_DEMO_CUSTOMER_PHONE', '09121111111');
  const customerUser = await prisma.user.upsert({
    where: { phone },
    create: { phone, name: 'مشتری نمونه', status: 'active' },
    update: { name: 'مشتری نمونه', deletedAt: null },
  });

  let globalCustomer = await prisma.globalCustomer.findFirst({
    where: { userId: customerUser.id, deletedAt: null },
  });
  if (!globalCustomer) {
    globalCustomer = await prisma.globalCustomer.create({
      data: { userId: customerUser.id, name: 'مشتری نمونه', status: 'active' },
    });
  }

  let tenantCustomer = await prisma.tenantCustomer.findFirst({
    where: { tenantId, globalCustomerId: globalCustomer.id, deletedAt: null },
  });
  if (!tenantCustomer) {
    tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId,
        globalCustomerId: globalCustomer.id,
        localCode: 'DEMO-001',
        defaultBranchId: branchId,
      },
    });
  } else if (!tenantCustomer.defaultBranchId) {
    tenantCustomer = await prisma.tenantCustomer.update({
      where: { id: tenantCustomer.id },
      data: { defaultBranchId: branchId },
    });
  }

  const contractDate = new Date('2026-06-01');
  const firstDueDate = new Date('2026-07-01');

  const sale = await prisma.sale.create({
    data: {
      tenantId,
      branchId,
      tenantCustomerId: tenantCustomer.id,
      createdByStaffId: staffId,
      title: 'فروش نمونه اقساط',
      totalAmountRial: 30_000_000n,
      downPaymentRial: 0n,
      installmentCount: 3,
      firstDueDate,
      intervalDays: 30,
      contractDate,
    },
  });

  await prisma.installment.createMany({
    data: [1, 2, 3].map((sequenceNumber) => ({
      saleId: sale.id,
      tenantId,
      sequenceNumber,
      dueDate: new Date(firstDueDate.getTime() + (sequenceNumber - 1) * 30 * 86_400_000),
      amountRial: 10_000_000n,
    })),
  });
}

async function main() {
  const platformPhone = envOrDefault('SEED_PLATFORM_ADMIN_PHONE', '09120000001');
  const ownerPhone = envOrDefault('SEED_OWNER_PHONE', '09120000000');

  console.log('Seeding permissions…');
  const permissionIds = await seedPermissions();

  console.log('Cleaning obsolete installments permissions…');
  await cleanupObsoleteInstallmentsPermissions();

  console.log('Seeding plans…');
  const planIds = await seedPlans();

  console.log('Seeding template roles…');
  await seedTemplateRoles(permissionIds);

  console.log('Seeding platform admin…');
  await seedPlatformAdmin(platformPhone);

  console.log('Seeding demo tenant…');
  const demo = await seedDemoTenant(planIds, permissionIds, ownerPhone);

  console.log('Seeding demo user credential (IFP-001)…');
  await seedDemoUserCredential(demo.ownerUser.id);

  console.log('Seeding demo user MFA (IFP-004)…');
  await seedDemoUserMfa(demo.ownerUser.id);

  console.log('Seeding installments smoke (TASK-064)…');
  await seedInstallmentsSmoke(demo.tenant.id, demo.branch.id, demo.owner.id);

  console.log('Seeding Phase 01 auth fixtures (IFP-018)…');
  const { seedPhase01AuthFixture } = await import('./phase-01-auth.ts');
  await seedPhase01AuthFixture(prisma);

  console.log('Seed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
