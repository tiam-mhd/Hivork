import { afterAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../index.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { buildUpdateTenantCustomerUseCase } from '../persistence/test-update-tenant-customer.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('UpdateTenantCustomerUseCase (integration)', () => {
  const prisma = new PrismaService();
  const useCase = buildUpdateTenantCustomerUseCase(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('updates tenant customer fields with optimistic locking', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
      },
    });
    if (!tenant?.branches[0]) {
      throw new Error('demo-shop tenant with branch required');
    }

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Before Update');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: 'UPD-1',
        notes: 'before',
      },
    });

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const updated = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      tenantCustomerId: link.id,
      version: link.version,
      notes: 'after',
      name: 'After Update',
      localCode: 'UPD-2',
      defaultBranchId: tenant.branches[0].id,
      staffContext,
      canUpdateInternalNotes: true,
      canBlacklist: true,
    });

    expect(updated.notes).toBe('after');
    expect(updated.localCode).toBe('UPD-2');
    expect(updated.defaultBranchId).toBe(tenant.branches[0].id);
    expect(updated.version).toBe(link.version + 1);

    const reloaded = await prisma.tenantCustomer.findFirst({
      where: { id: link.id, tenantId: tenant.id },
    });
    expect(reloaded?.notes).toBe('after');

    const global = await prisma.globalCustomer.findFirst({
      where: { id: globalCustomer.id },
      include: { user: true },
    });
    expect(global?.name).toBe('After Update');

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('syncs nested addresses on update', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0913${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Nested Update');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        notes: 'nested-before',
      },
    });

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const updated = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      tenantCustomerId: link.id,
      version: link.version,
      addresses: [
        {
          label: 'home',
          line1: 'خیابان اول',
          city: 'تهران',
          isPrimary: true,
        },
      ],
      staffContext,
      canUpdateInternalNotes: true,
      canBlacklist: true,
    });

    expect(updated.addresses).toHaveLength(1);
    expect(updated.addresses[0]?.line1).toBe('خیابان اول');
    expect(updated.addresses[0]?.isPrimary).toBe(true);

    const withCoords = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      tenantCustomerId: link.id,
      version: updated.version,
      addresses: [
        {
          id: updated.addresses[0]?.id,
          label: 'home',
          line1: 'خیابان اول',
          city: 'تهران',
          isPrimary: true,
          latitude: 35.6892,
          longitude: 51.389,
        },
      ],
      staffContext,
      canUpdateInternalNotes: true,
      canBlacklist: true,
    });

    expect(withCoords.addresses[0]?.latitude).toBe(35.6892);
    expect(withCoords.addresses[0]?.longitude).toBe(51.389);

    await prisma.customerAddress.updateMany({
      where: { tenantCustomerId: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('rejects optimistic lock conflict', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      return;
    }

    const link = await prisma.tenantCustomer.findFirst({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    if (!link) {
      return;
    }

    await expect(
      useCase.execute({
        tenantId: tenant.id,
        actorId: '00000000-0000-0000-0000-000000000001',
        tenantCustomerId: link.id,
        version: link.version - 1,
        notes: 'stale',
        staffContext: {
          staffId: '00000000-0000-0000-0000-000000000001',
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
        canUpdateInternalNotes: true,
        canBlacklist: true,
      }),
    ).rejects.toMatchObject({
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      httpStatus: 409,
    });
  });

  it('rejects cross-tenant update as not found', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
    if (tenants.length < 2) {
      return;
    }

    const [tenantA, tenantB] = tenants;
    const customerOnA = await prisma.tenantCustomer.findFirst({
      where: { tenantId: tenantA.id, deletedAt: null },
    });
    if (!customerOnA) {
      return;
    }

    await expect(
      useCase.execute({
        tenantId: tenantB.id,
        actorId: '00000000-0000-0000-0000-000000000001',
        tenantCustomerId: customerOnA.id,
        version: customerOnA.version,
        notes: 'hack',
        staffContext: {
          staffId: '00000000-0000-0000-0000-000000000001',
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
        canUpdateInternalNotes: true,
        canBlacklist: true,
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
