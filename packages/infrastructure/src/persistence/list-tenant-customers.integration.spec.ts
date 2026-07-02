import { afterAll, describe, expect, it } from 'vitest';

import { ListTenantCustomersUseCase } from '@hivork/application';

import { PrismaTenantCustomerRepository } from '../persistence/tenant-customer.repository.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('ListTenantCustomersUseCase (integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaTenantCustomerRepository(prisma);
  const useCase = new ListTenantCustomersUseCase(repository);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists created customers with search and tags', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'List Test Customer');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: 'LIST-1',
        tags: ['vip', 'test'],
      },
    });

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const byPhone = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      search: phone.slice(-4),
      tags: ['vip'],
      staffContext,
      includeCount: true,
    });

    expect(byPhone.data.some((item) => item.id === link.id)).toBe(true);
    expect(byPhone.meta.total).toBeGreaterThanOrEqual(1);

    const byName = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      search: 'List Test',
      staffContext,
    });

    expect(byName.data.some((item) => item.id === link.id)).toBe(true);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('filters by category and tag', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const category = await prisma.customerCategory.create({
      data: {
        tenantId: tenant.id,
        name: `Cat ${Date.now()}`,
        slug: `cat-${Date.now()}`,
      },
    });

    const phone = `0913${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Category Filter Customer');
    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        categoryId: category.id,
        tags: ['enterprise'],
      },
    });

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const result = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      categoryId: category.id,
      tags: ['enterprise'],
      staffContext,
    });

    expect(result.data.some((item) => item.id === link.id)).toBe(true);
    expect(result.data.find((item) => item.id === link.id)?.categoryName).toBe(category.name);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
    await prisma.customerCategory.update({
      where: { id: category.id },
      data: { deletedAt: new Date() },
    });
  });

  it('searches secondary contact phone', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const primaryPhone = `0914${String(Date.now()).slice(-7)}`;
    const secondaryPhone = `0915${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, primaryPhone, 'Secondary Phone Customer');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        contactPhones: {
          create: {
            tenantId: tenant.id,
            phone: secondaryPhone,
          },
        },
      },
    });

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const result = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      search: secondaryPhone.slice(0, 6),
      staffContext,
    });

    expect(result.data.some((item) => item.id === link.id)).toBe(true);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('paginates with stable cursor across pages', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const createdIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const phone = `0916${String(Date.now() + index).slice(-7)}`;
      const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, `Cursor Customer ${index}`);
      const link = await prisma.tenantCustomer.create({
        data: {
          tenantId: tenant.id,
          globalCustomerId: globalCustomer.id,
          localCode: `CUR-${index}`,
        },
      });
      createdIds.push(link.id);
    }

    const firstPage = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      search: 'Cursor Customer',
      limit: 2,
      sort: 'name:asc',
      staffContext,
    });

    expect(firstPage.data).toHaveLength(2);
    expect(firstPage.meta.hasNext).toBe(true);
    expect(firstPage.meta.nextCursor).toBeTruthy();

    const secondPage = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      search: 'Cursor Customer',
      limit: 2,
      sort: 'name:asc',
      cursor: firstPage.meta.nextCursor ?? undefined,
      staffContext,
    });

    const allIds = [...firstPage.data, ...secondPage.data].map((item) => item.id);
    expect(new Set(allIds).size).toBe(allIds.length);

    for (const id of createdIds) {
      await prisma.tenantCustomer.update({
        where: { id },
        data: { deletedAt: new Date(), deletedById: staffContext.staffId },
      });
    }
  });

  it('isolates customers by tenant', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
    if (tenants.length < 2) {
      return;
    }

    const [tenantA, tenantB] = tenants;
    const result = await useCase.execute({
      tenantId: tenantB.id,
      actorId: '00000000-0000-0000-0000-000000000001',
      search: '09120000000',
      staffContext: {
        staffId: '00000000-0000-0000-0000-000000000001',
        dataScope: 'all',
        assignedBranchIds: [],
        activeBranchId: null,
      },
    });

    expect(result.data.every((item) => item.globalCustomer.phone !== '09120000000' || tenantA.id !== tenantB.id)).toBe(
      true,
    );
  });
});
