import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prismaRequestStorage, runWithBypassSoftDelete } from '../context/request-context.js';
import { HardDeleteForbiddenError } from './errors/hard-delete-forbidden.error.js';
import { createHivorkPrismaClient } from './prisma.client.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Prisma extensions (integration)', () => {
  const prisma = createHivorkPrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('blocks hard delete', async () => {
    await expect(prisma.staff.delete({ where: { id: randomUUID() } })).rejects.toBeInstanceOf(
      HardDeleteForbiddenError,
    );
  });

  it('hides soft-deleted rows from findMany', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) return;

    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    if (!staff) return;

    await prisma.staff.update({
      where: { id: staff.id },
      data: { deletedAt: new Date(), deletedById: staff.id },
    });

    const visible = await prisma.staff.findMany({
      where: { id: staff.id },
    });
    expect(visible).toHaveLength(0);

    await runWithBypassSoftDelete(async () => {
      const deleted = await prisma.staff.findMany({
        where: { id: staff.id },
      });
      expect(deleted).toHaveLength(1);
    });

    await prisma.staff.update({
      where: { id: staff.id },
      data: { deletedAt: null, deletedById: null },
    });
  });

  it('restores soft-deleted row when bypass is enabled', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) return;

    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    if (!staff) return;

    await prisma.staff.update({
      where: { id: staff.id },
      data: { deletedAt: new Date(), deletedById: staff.id },
    });

    await runWithBypassSoftDelete(async () => {
      await prisma.staff.update({
        where: { id: staff.id },
        data: { deletedAt: null, deletedById: null },
      });
    });

    const restored = await prisma.staff.findMany({
      where: { id: staff.id },
    });
    expect(restored).toHaveLength(1);
  });

  it('isolates tenant-scoped findMany by request context', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
    });
    if (tenants.length < 1) return;

    const [tenantA] = tenants;
    const allStaffForA = await prisma.staff.findMany({
      where: { tenantId: tenantA.id, deletedAt: null },
    });
    if (allStaffForA.length === 0) return;

    const scoped = await prismaRequestStorage.run(
      {
        tenantId: tenantA.id,
        staffId: allStaffForA[0]!.id,
        activeBranchId: null,
        primaryBranchId: null,
        effectiveBranchIds: [],
      },
      () => prisma.staff.findMany(),
    );

    expect(scoped.every((row) => row.tenantId === tenantA.id)).toBe(true);
    expect(scoped.length).toBe(allStaffForA.length);
  });
});
