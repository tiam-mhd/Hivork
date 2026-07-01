import { afterAll, describe, expect, it } from 'vitest';

import { GetTenantCustomerUseCase } from '@hivork/application';

import { PrismaSaleRepository } from '../persistence/sale.repository.js';
import { PrismaTenantCustomerRepository } from '../persistence/tenant-customer.repository.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('GetTenantCustomerUseCase (integration)', () => {
  const prisma = new PrismaService();
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const useCase = new GetTenantCustomerUseCase(tenantCustomers, sales);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns full detail after create', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Get Test');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: 'GET-1',
        tags: ['vip'],
        notes: 'integration',
      },
    });

    const staffContext = {
      staffId: '00000000-0000-0000-0000-000000000001',
      dataScope: 'all' as const,
      assignedBranchIds: [] as string[],
      activeBranchId: null,
    };

    const detail = await useCase.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      include: ['salesSummary'],
      staffContext,
    });

    expect(detail.globalCustomer.phone).toBe(phone);
    expect(detail.localCode).toBe('GET-1');
    expect(detail.salesSummary).toEqual({
      activeSalesCount: 0,
      completedSalesCount: 0,
      totalOverdueRial: 0n,
      lastSaleAt: null,
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

  it('rejects cross-tenant access', async () => {
    const tenants = await prisma.tenant.findMany({
      where: { deletedAt: null },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });
    if (tenants.length < 2) {
      return;
    }

    const customerOnA = await prisma.tenantCustomer.findFirst({
      where: { tenantId: tenants[0]!.id, deletedAt: null },
    });
    if (!customerOnA) {
      return;
    }

    await expect(
      useCase.execute({
        tenantId: tenants[1]!.id,
        tenantCustomerId: customerOnA.id,
        staffContext: {
          staffId: '00000000-0000-0000-0000-000000000001',
          dataScope: 'all',
          assignedBranchIds: [],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
