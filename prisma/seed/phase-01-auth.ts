/**
 * IFP-TASK-018 — Phase 01 auth vertical-slice test fixtures.
 * Run via main seed or import from integration / E2E tests.
 */
import type { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const DEMO_SLUG = 'demo-shop';
export const PHASE01_DEFAULT_PASSWORD = 'Phase01Pass1!';

export type Phase01StaffFixture = {
  id: string;
  userId: string;
  phone: string;
  password: string;
  tenantId: string;
};

export type Phase01ViewerFixture = {
  id: string;
  userId: string;
  phone: string;
  tenantId: string;
};

export type Phase01Fixtures = {
  tenantId: string;
  tenantSlug: string;
  owner: Phase01StaffFixture;
  mfaUser: Phase01StaffFixture;
  lockoutUser: Phase01StaffFixture;
  mustChangeUser: Phase01StaffFixture;
  viewer: Phase01ViewerFixture;
};

const MFA_PHONE = '09129800001';
const LOCKOUT_PHONE = '09129800002';
const MUST_CHANGE_PHONE = '09129800003';
const VIEWER_PHONE = '09120000002';

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function upsertCredential(
  prisma: PrismaClient,
  userId: string,
  password: string,
  options?: { mustChangePassword?: boolean },
) {
  const passwordHash = await hashPassword(password);
  const existing = await prisma.userCredential.findFirst({
    where: { userId, deletedAt: null },
  });

  const data = {
    passwordHash,
    passwordChangedAt: new Date(),
    status: options?.mustChangePassword ? ('must_change_password' as const) : ('active' as const),
    mustChangePassword: options?.mustChangePassword ?? false,
    failedLoginCount: 0,
    lockedUntil: null,
  };

  if (existing) {
    await prisma.userCredential.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await prisma.userCredential.create({
    data: { userId, ...data, createdById: userId },
  });
  return created.id;
}

async function upsertStaffForRole(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    branchId: string;
    ownerStaffId: string;
    phone: string;
    name: string;
    roleCode: string;
  },
): Promise<{ id: string; userId: string; phone: string }> {
  const role = await prisma.role.findFirst({
    where: { tenantId: input.tenantId, code: input.roleCode, deletedAt: null },
  });
  if (!role) {
    throw new Error(`Role ${input.roleCode} missing for tenant ${input.tenantId}`);
  }

  const user = await prisma.user.upsert({
    where: { phone: input.phone },
    create: { phone: input.phone, name: input.name, status: 'active' },
    update: { name: input.name, status: 'active', deletedAt: null },
  });

  const staff = await prisma.staff.upsert({
    where: { tenantId_userId: { tenantId: input.tenantId, userId: user.id } },
    create: {
      tenantId: input.tenantId,
      userId: user.id,
      name: input.name,
      status: 'active',
      dataScope: 'branch',
      assignedBranchIds: [input.branchId],
      primaryBranchId: input.branchId,
    },
    update: {
      name: input.name,
      status: 'active',
      deletedAt: null,
      primaryBranchId: input.branchId,
      assignedBranchIds: [input.branchId],
    },
  });

  await prisma.staffRole.upsert({
    where: { staffId_roleId: { staffId: staff.id, roleId: role.id } },
    create: { staffId: staff.id, roleId: role.id },
    update: { deletedAt: null },
  });

  return { id: staff.id, userId: user.id, phone: user.phone };
}

export async function seedPhase01AuthFixture(prisma: PrismaClient): Promise<Phase01Fixtures> {
  const ownerPhone = process.env.SEED_OWNER_PHONE?.trim() || '09120000000';
  const ownerPassword = process.env.SEED_DEMO_PASSWORD?.trim() || 'DemoPass1';

  const tenant = await prisma.tenant.findFirst({
    where: { slug: DEMO_SLUG, deletedAt: null },
    include: {
      branches: { where: { deletedAt: null, isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 },
      staff: {
        where: { user: { phone: ownerPhone }, deletedAt: null },
        take: 1,
        include: { user: true },
      },
    },
  });

  if (!tenant?.branches[0] || !tenant.staff[0]) {
    throw new Error('demo-shop owner + branch required — run main seed first');
  }

  const branchId = tenant.branches[0].id;
  const ownerStaff = tenant.staff[0];
  await upsertCredential(prisma, ownerStaff.userId, ownerPassword);

  const mfaStaff = await upsertStaffForRole(prisma, {
    tenantId: tenant.id,
    branchId,
    ownerStaffId: ownerStaff.id,
    phone: MFA_PHONE,
    name: 'کاربر MFA تست',
    roleCode: 'cashier',
  });
  await upsertCredential(prisma, mfaStaff.userId, PHASE01_DEFAULT_PASSWORD);
  await prisma.user.update({
    where: { id: mfaStaff.userId },
    data: {
      metadata: {
        mfa: {
          otpEnabled: true,
          totpEnabled: false,
          requireMfaOnLogin: true,
        },
      },
    },
  });

  const lockoutStaff = await upsertStaffForRole(prisma, {
    tenantId: tenant.id,
    branchId,
    ownerStaffId: ownerStaff.id,
    phone: LOCKOUT_PHONE,
    name: 'کاربر lockout تست',
    roleCode: 'cashier',
  });
  await upsertCredential(prisma, lockoutStaff.userId, PHASE01_DEFAULT_PASSWORD);

  const mustChangeStaff = await upsertStaffForRole(prisma, {
    tenantId: tenant.id,
    branchId,
    ownerStaffId: ownerStaff.id,
    phone: MUST_CHANGE_PHONE,
    name: 'کاربر must-change تست',
    roleCode: 'cashier',
  });
  await upsertCredential(prisma, mustChangeStaff.userId, PHASE01_DEFAULT_PASSWORD, {
    mustChangePassword: true,
  });

  const viewerRecord = await prisma.staff.findFirst({
    where: {
      tenantId: tenant.id,
      deletedAt: null,
      user: { phone: VIEWER_PHONE },
    },
    include: { user: true },
  });
  if (!viewerRecord) {
    throw new Error('demo-shop viewer (09120000002) required — run RBAC seed in tests');
  }

  return {
    tenantId: tenant.id,
    tenantSlug: DEMO_SLUG,
    owner: {
      id: ownerStaff.id,
      userId: ownerStaff.userId,
      phone: ownerPhone,
      password: ownerPassword,
      tenantId: tenant.id,
    },
    mfaUser: {
      id: mfaStaff.id,
      userId: mfaStaff.userId,
      phone: MFA_PHONE,
      password: PHASE01_DEFAULT_PASSWORD,
      tenantId: tenant.id,
    },
    lockoutUser: {
      id: lockoutStaff.id,
      userId: lockoutStaff.userId,
      phone: LOCKOUT_PHONE,
      password: PHASE01_DEFAULT_PASSWORD,
      tenantId: tenant.id,
    },
    mustChangeUser: {
      id: mustChangeStaff.id,
      userId: mustChangeStaff.userId,
      phone: MUST_CHANGE_PHONE,
      password: PHASE01_DEFAULT_PASSWORD,
      tenantId: tenant.id,
    },
    viewer: {
      id: viewerRecord.id,
      userId: viewerRecord.userId,
      phone: viewerRecord.user.phone,
      tenantId: tenant.id,
    },
  };
}

/** Soft-delete ephemeral API keys created during tests — never hard delete. */
export async function softDeleteTestApiKeys(prisma: PrismaClient, tenantId: string): Promise<void> {
  const now = new Date();
  await prisma.tenantApiKey.updateMany({
    where: {
      tenantId,
      deletedAt: null,
      name: { startsWith: 'phase01-' },
    },
    data: {
      deletedAt: now,
      deletedById: null,
      deleteReason: 'phase-01-auth test cleanup',
    },
  });
}
