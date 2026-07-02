import { afterAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../prisma/prisma.service.js';
import { buildCreateTenantCustomerUseCase } from './test-create-tenant-customer.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('CreateTenantCustomerUseCase extended (integration)', () => {
  const prisma = new PrismaService();
  const useCase = buildCreateTenantCustomerUseCase(prisma);

  const staffContext = {
    staffId: '00000000-0000-0000-0000-000000000001',
    dataScope: 'all' as const,
    assignedBranchIds: [] as string[],
    activeBranchId: null,
  };

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates customer with nested addresses, emergency contacts, and secondary phones', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const suffix = String(Date.now()).slice(-7);
    const phone = `0913${suffix}`;
    const secondaryPhone = `0914${suffix}`;

    const result = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      phone,
      name: 'مشتری Enterprise',
      localCode: `ENT-${suffix}`,
      addresses: [
        {
          label: 'home',
          line1: 'خیابان آزادی ۱۰',
          city: 'تهران',
          isPrimary: true,
        },
      ],
      emergencyContacts: [
        {
          name: 'همسر',
          phone: `0915${suffix}`,
          relation: 'spouse',
          isPrimary: true,
        },
      ],
      contactPhones: [
        {
          phone: secondaryPhone,
          label: 'mobile',
          isWhatsApp: true,
          isPrimarySecondary: true,
        },
      ],
      staffContext,
    });

    expect(result.customer.addresses).toHaveLength(1);
    expect(result.customer.emergencyContacts).toHaveLength(1);
    expect(result.customer.contactPhones).toHaveLength(1);
    expect(result.customer.contactPhones[0]?.phone).toBe(secondaryPhone);
    expect(result.restored).toBe(false);
  });

  it('restores soft-deleted tenant customer without plan limit check', async () => {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required');
    }

    const suffix = String(Date.now()).slice(-7);
    const phone = `0918${suffix}`;

    const first = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      phone,
      name: 'Restore Test',
      staffContext,
    });

    await prisma.tenantCustomer.update({
      where: { id: first.customer.id },
      data: {
        deletedAt: new Date(),
        deletedById: staffContext.staffId,
      },
    });

    const restored = await useCase.execute({
      tenantId: tenant.id,
      actorId: staffContext.staffId,
      phone,
      name: 'Restore Test Updated',
      localCode: 'RESTORED',
      staffContext,
    });

    expect(restored.restored).toBe(true);
    expect(restored.customer.localCode).toBe('RESTORED');
    expect(restored.customer.deletedAt).toBeNull();
  });
});
