import { afterAll, describe, expect, it } from 'vitest';

import {
  ArchiveTenantCustomerUseCase,
  ListTenantCustomersUseCase,
  RestoreTenantCustomerUseCase,
  SoftDeleteTenantCustomerUseCase,
  UnarchiveTenantCustomerUseCase,
} from '@hivork/application';
import {
  PrismaAuditService,
  PrismaSaleRepository,
  PrismaService,
  PrismaTenantCustomerRepository,
  PrismaTenantSettingsRepository,
  PrismaUnitOfWork,
} from '../index.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('TenantCustomer lifecycle (integration)', () => {
  const prisma = new PrismaService();
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const settings = new PrismaTenantSettingsRepository(prisma);
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const audit = new PrismaAuditService(prisma);

  const softDelete = new SoftDeleteTenantCustomerUseCase(
    tenantCustomers,
    sales,
    settings,
    unitOfWork,
    audit,
  );
  const restore = new RestoreTenantCustomerUseCase(tenantCustomers, audit);
  const archive = new ArchiveTenantCustomerUseCase(tenantCustomers, sales, audit);
  const unarchive = new UnarchiveTenantCustomerUseCase(tenantCustomers, sales, audit);
  const list = new ListTenantCustomersUseCase(tenantCustomers);

  const staffContext = {
    staffId: '00000000-0000-0000-0000-000000000001',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('soft deletes then restores customer', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0914${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Lifecycle Test');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: 'LIFE-1',
      },
    });

    await softDelete.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: staffContext.staffId,
      deleteReason: 'test cleanup',
      staffContext,
    });

    const listAfterDelete = await list.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      staffContext,
      search: phone,
    });
    expect(listAfterDelete.data.some((item) => item.id === link.id)).toBe(false);

    const restored = await restore.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: staffContext.staffId,
    });
    expect(restored.customer.deletedAt).toBeNull();

    const listAfterRestore = await list.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      staffContext,
      search: phone,
    });
    expect(listAfterRestore.data.some((item) => item.id === link.id)).toBe(true);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });

  it('archives customer and hides from default list', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0915${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Archive Test');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: 'ARCH-1',
      },
    });

    await archive.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: staffContext.staffId,
      staffContext,
    });

    const listArchived = await list.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      staffContext,
      search: phone,
    });
    expect(listArchived.data.some((item) => item.id === link.id)).toBe(false);

    await unarchive.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      actorId: staffContext.staffId,
      staffContext,
    });

    const listActive = await list.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      staffContext,
      search: phone,
    });
    expect(listActive.data.some((item) => item.id === link.id)).toBe(true);

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffContext.staffId },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });
});
