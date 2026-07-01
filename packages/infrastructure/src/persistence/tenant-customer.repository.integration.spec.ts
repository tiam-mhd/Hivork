import { afterAll, describe, expect, it } from 'vitest';

import {
  RestoreEntityUseCase,
  SoftDeleteEntityUseCase,
} from '@hivork/application';

import { PrismaAuditService } from '../audit/prisma-audit.service.js';
import { PrismaTenantCustomerRepository } from '../persistence/tenant-customer.repository.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { PrismaService } from '../prisma/prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('Tenant customer soft delete (integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaTenantCustomerRepository(prisma);
  const audit = new PrismaAuditService(prisma);
  const softDelete = new SoftDeleteEntityUseCase(repository, audit, 'tenant_customer');
  const restore = new RestoreEntityUseCase(repository, audit, 'tenant_customer');

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('delete → hidden → restore → visible', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Recycle Test');

    const link = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: 'RC-TEST',
      },
    });

    await softDelete.execute({
      tenantId: tenant.id,
      entityId: link.id,
      actorId: '00000000-0000-0000-0000-000000000001',
      deleteReason: 'integration test',
    });

    const hidden = await repository.findActiveById(link.id, tenant.id);
    expect(hidden).toBeNull();

    const deleted = await repository.findDeletedById(link.id, tenant.id);
    expect(deleted?.deleteReason).toBe('integration test');

    await restore.execute({
      tenantId: tenant.id,
      entityId: link.id,
      actorId: '00000000-0000-0000-0000-000000000001',
    });

    const visible = await repository.findActiveById(link.id, tenant.id);
    expect(visible?.localCode).toBe('RC-TEST');

    await prisma.tenantCustomer.update({
      where: { id: link.id },
      data: { deletedAt: new Date(), deletedById: '00000000-0000-0000-0000-000000000001' },
    });
    await prisma.globalCustomer.update({
      where: { id: globalCustomer.id },
      data: { deletedAt: new Date() },
    });
  });
});
