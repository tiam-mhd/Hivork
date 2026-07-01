import { afterAll, describe, expect, it } from 'vitest';

import {
  CreateBranchUseCase,
  GetBranchUseCase,
  ListBranchesUseCase,
  SoftDeleteBranchUseCase,
  UpdateBranchUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaBranchRepository } from '../persistence/branch.repository.js';
import { PrismaTenantPlanReader } from '../persistence/tenant-plan.reader.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Branch CRUD (integration)', () => {
  const prisma = new PrismaService();
  const branches = new PrismaBranchRepository(prisma);
  const tenantPlans = new PrismaTenantPlanReader(prisma);
  const audit = new PrismaAuditService(prisma);

  const createBranch = new CreateBranchUseCase(branches, tenantPlans, audit);
  const listBranches = new ListBranchesUseCase(branches);
  const getBranch = new GetBranchUseCase(branches);
  const updateBranch = new UpdateBranchUseCase(branches, audit);
  const softDeleteBranch = new SoftDeleteBranchUseCase(branches, audit);

  const staffContext = {
    staffId: '00000000-0000-0000-0000-000000000001',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates, lists, updates, and soft deletes a branch', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const suffix = String(Date.now()).slice(-4);
    const created = await createBranch.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      name: `شعبه تست ${suffix}`,
      address: 'تهران',
      phone: `0912${String(Date.now()).slice(-7)}`,
    });

    const listed = await listBranches.execute({
      tenantId: tenant.id,
      staffContext,
    });
    expect(listed.data.some((item) => item.id === created.id)).toBe(true);

    const detail = await getBranch.execute({
      tenantId: tenant.id,
      branchId: created.id,
      staffContext,
    });
    expect(detail.name).toBe(created.name);

    const updated = await updateBranch.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      branchId: created.id,
      name: `شعبه ویرایش ${suffix}`,
      staffContext,
    });
    expect(updated.name).toBe(`شعبه ویرایش ${suffix}`);

    const deleted = await softDeleteBranch.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      branchId: created.id,
      staffContext,
    });
    expect(deleted.deletedAt).toBeTruthy();
  });

  it('rejects deleting default branch', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: { branches: { where: { deletedAt: null, isDefault: true }, take: 1 } },
    });
    if (!tenant?.branches[0]) {
      throw new Error('default branch required');
    }

    await expect(
      softDeleteBranch.execute({
        tenantId: tenant.id,
        actorId: staffContext.staffId,
        branchId: tenant.branches[0].id,
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_IS_DEFAULT', httpStatus: 409 });
  });
});
