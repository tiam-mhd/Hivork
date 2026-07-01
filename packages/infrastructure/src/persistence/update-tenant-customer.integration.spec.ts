import { afterAll, describe, expect, it } from 'vitest';

import {
  PrismaAuditService,
  PrismaBranchReader,
  PrismaGlobalCustomerRepository,
  PrismaSaleRepository,
  PrismaTenantCustomerRepository,
  PrismaService,
} from '../index.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { UpdateTenantCustomerUseCase } from '@hivork/application';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('UpdateTenantCustomerUseCase (integration)', () => {
  const prisma = new PrismaService();
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const globalCustomers = new PrismaGlobalCustomerRepository(prisma);
  const branches = new PrismaBranchReader(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const audit = new PrismaAuditService(prisma);

  const useCase = new UpdateTenantCustomerUseCase(
    tenantCustomers,
    globalCustomers,
    branches,
    sales,
    audit,
  );

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
    });

    expect(updated.notes).toBe('after');
    expect(updated.localCode).toBe('UPD-2');
    expect(updated.defaultBranchId).toBe(tenant.branches[0].id);
    expect(updated.version).toBe(link.version + 1);

    const reloaded = await tenantCustomers.findDetailById(link.id, tenant.id);
    expect(reloaded?.notes).toBe('after');

    const global = await globalCustomers.findByPhone(phone);
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
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
