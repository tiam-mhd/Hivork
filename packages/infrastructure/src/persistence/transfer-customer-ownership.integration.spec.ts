import { afterAll, describe, expect, it } from 'vitest';

import {
  GetTenantCustomerUseCase,
  TransferCustomerOwnershipUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaOutboxPublisher } from '../outbox/prisma-outbox.publisher.js';
import { PrismaSaleRepository } from './sale.repository.js';
import { PrismaStaffRepository } from './staff.repository.js';
import { PrismaTenantCustomerRepository } from './tenant-customer.repository.js';
import { PrismaUnitOfWork } from './prisma-unit-of-work.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ensureTestGlobalCustomer } from './test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('TransferCustomerOwnershipUseCase (integration)', () => {
  const prisma = new PrismaService();
  const unitOfWork = new PrismaUnitOfWork(prisma);
  const sales = new PrismaSaleRepository(prisma);
  const tenantCustomers = new PrismaTenantCustomerRepository(prisma);
  const staffRepo = new PrismaStaffRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const outbox = new PrismaOutboxPublisher(prisma);
  const getTenantCustomer = new GetTenantCustomerUseCase(tenantCustomers, sales);

  const transferOwnership = new TransferCustomerOwnershipUseCase(
    tenantCustomers,
    sales,
    staffRepo,
    unitOfWork,
    audit,
    outbox,
    getTenantCustomer,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('transfers assignedStaffId through staff A → B → C with audit and history', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
      include: {
        branches: { where: { deletedAt: null, isActive: true }, take: 1 },
        staff: { where: { deletedAt: null }, take: 3 },
      },
    });
    if (!tenant?.branches[0] || tenant.staff.length < 3) {
      throw new Error('demo-shop seed data with at least 3 staff required');
    }

    const [staffA, staffB, staffC] = tenant.staff;
    const staffContext = {
      staffId: staffA.id,
      dataScope: 'all' as const,
      assignedBranchIds: [tenant.branches[0].id],
      activeBranchId: tenant.branches[0].id,
    };

    const phone = `0918${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Transfer Customer');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        assignedStaffId: staffA.id,
      },
    });

    await transferOwnership.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      newStaffId: staffB.id,
      note: 'first handover',
      actorId: staffA.id,
      staffContext,
    });

    let detail = await getTenantCustomer.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      staffContext,
    });
    expect(detail.assignedStaffId).toBe(staffB.id);
    expect(detail.metadata?.transferHistory).toHaveLength(1);

    await transferOwnership.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      newStaffId: staffC.id,
      actorId: staffB.id,
      staffContext: { ...staffContext, staffId: staffB.id },
    });

    detail = await getTenantCustomer.execute({
      tenantId: tenant.id,
      tenantCustomerId: link.id,
      staffContext,
    });
    expect(detail.assignedStaffId).toBe(staffC.id);
    expect(detail.metadata?.transferHistory).toHaveLength(2);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        tenantId: tenant.id,
        action: 'customer.transfer',
        entityId: link.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditLog).toBeTruthy();
    expect(auditLog?.newValue).toEqual(
      expect.objectContaining({ assignedStaffId: staffC.id }),
    );

    const outboxEvent = await prisma.outboxEvent.findFirst({
      where: {
        tenantId: tenant.id,
        eventType: 'customer.ownership_transferred',
        aggregateId: link.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(outboxEvent).toBeTruthy();

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: staffA.id },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });
});
