import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateStaffUseCase,
  GetStaffUseCase,
  ListStaffUseCase,
  SoftDeleteStaffUseCase,
  UpdateStaffUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaBranchRepository } from '../persistence/branch.repository.js';
import { PrismaStaffRepository } from '../persistence/staff.repository.js';
import { PrismaUserRepository } from '../persistence/user.repository.js';
import { PrismaTenantPlanReader } from '../persistence/tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Staff CRUD (integration)', () => {
  const prisma = new PrismaService();
  const staffRepo = new PrismaStaffRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const branches = new PrismaBranchRepository(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const audit = new PrismaAuditService(prisma);

  const createStaff = new CreateStaffUseCase(staffRepo, userRepo, branches, tenantPlans, audit);
  const listStaff = new ListStaffUseCase(staffRepo);
  const getStaff = new GetStaffUseCase(staffRepo);
  const updateStaff = new UpdateStaffUseCase(staffRepo, branches, audit);
  const softDeleteStaff = new SoftDeleteStaffUseCase(staffRepo, audit);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates staff and lists within tenant', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        staff: {
          where: { deletedAt: null },
          take: 1,
          include: {
            staffRoles: {
              where: { deletedAt: null },
              include: { role: true },
            },
          },
        },
      },
    });
    if (!tenant?.staff[0]) {
      throw new Error('demo-shop owner staff required');
    }

    const actor = tenant.staff[0];
    const staffContext = {
      staffId: actor.id,
      dataScope: 'all' as const,
      assignedBranchIds: actor.assignedBranchIds,
      activeBranchId: null,
    };

    const phoneSuffix = String(Date.now()).slice(-7);
    const created = await createStaff.execute({
      tenantId: tenant.id,
      actorId: actor.id,
      phone: `0912${phoneSuffix}`,
      name: `کارمند تست ${phoneSuffix}`,
      dataScope: 'all',
    });

    const listed = await listStaff.execute({
      tenantId: tenant.id,
      staffContext,
    });
    expect(listed.data.some((item) => item.id === created.id)).toBe(true);

    const detail = await getStaff.execute({
      tenantId: tenant.id,
      staffId: created.id,
      staffContext,
    });
    expect(detail.name).toBe(created.name);

    const updated = await updateStaff.execute({
      tenantId: tenant.id,
      actorId: actor.id,
      staffId: created.id,
      name: `کارمند ویرایش ${phoneSuffix}`,
      status: 'suspended',
      staffContext,
    });
    expect(updated.status).toBe('suspended');

    const deleted = await softDeleteStaff.execute({
      tenantId: tenant.id,
      actorId: actor.id,
      staffId: created.id,
      staffContext,
    });
    expect(deleted.deletedAt).toBeTruthy();
  });

  it('isolates staff across tenants', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null, slug: { in: ['demo-shop', 'demo-shop-2'] } },
      take: 2,
    });
    if (tenants.length < 2) {
      return;
    }

    const [tenantA, tenantB] = tenants;
    const staffA = await prisma.staff.findFirst({
      where: { tenantId: tenantA.id, deletedAt: null },
    });
    const staffB = await prisma.staff.findFirst({
      where: { tenantId: tenantB.id, deletedAt: null },
    });
    if (!staffA || !staffB) {
      return;
    }

    const staffContext = {
      staffId: staffA.id,
      dataScope: 'all' as const,
      assignedBranchIds: [],
      activeBranchId: null,
    };

    await expect(
      getStaff.execute({
        tenantId: tenantA.id,
        staffId: staffB.id,
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'STAFF_NOT_FOUND', httpStatus: 404 });
  });
});
