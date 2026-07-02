import { randomUUID } from 'node:crypto';

import { GuarantorRelationship } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaContractGuarantorRepository } from '../persistence/contract-guarantor.repository.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';
import { PrismaService } from './prisma.service.js';

const databaseUrl = process.env.DATABASE_URL;

async function probeDatabase(): Promise<boolean> {
  if (!databaseUrl) {
    return false;
  }

  const probe = new PrismaService();
  try {
    await probe.$connect();
    await probe.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.$disconnect().catch(() => undefined);
  }
}

const dbAvailable = await probeDatabase();
const describeIfDb = dbAvailable ? describe : describe.skip;

describeIfDb('ContractGuarantor (IFP-065 integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaContractGuarantorRepository(prisma);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createSaleFixture() {
    const tenant = await prisma.tenant.findFirstOrThrow({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    const branch = await prisma.branch.findFirstOrThrow({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    const staff = await prisma.staff.findFirstOrThrow({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Contract Guarantor Customer');
    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `CG-${Date.now()}`,
      },
    });

    const sale = await prisma.sale.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: tenantCustomer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 12_000_000n,
        downPaymentRial: 0n,
        installmentCount: 2,
        firstDueDate: new Date('2026-08-01'),
        contractDate: new Date('2026-07-01'),
      },
    });

    return { tenant, staff, sale, tenantCustomer };
  }

  it('links guarantor to tenant customer', async () => {
    const { tenant, staff, sale, tenantCustomer } = await createSaleFixture();

    const guarantor = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      tenantCustomerId: tenantCustomer.id,
      relationship: GuarantorRelationship.SPOUSE,
      note: 'همسر مشتری',
      createdById: staff.id,
    });

    expect(guarantor.tenantCustomerId).toBe(tenantCustomer.id);
    expect(guarantor.fullName).toBeNull();
    expect(guarantor.phone).toBeNull();

    const listed = await repository.listBySale({ tenantId: tenant.id, saleId: sale.id });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(guarantor.id);
  });

  it('creates external guarantor with phone', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    const guarantor = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      fullName: 'رضا محمدی',
      phone: '09123456789',
      nationalId: '1234567890',
      relationship: GuarantorRelationship.PARENT,
      createdById: staff.id,
    });

    expect(guarantor.fullName).toBe('رضا محمدی');
    expect(guarantor.phone).toBe('09123456789');
    expect(guarantor.tenantCustomerId).toBeNull();
  });

  it('soft deletes guarantor and excludes from list', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    const guarantor = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      fullName: 'ضامن خارجی',
      phone: '09121112222',
      relationship: GuarantorRelationship.OTHER,
      createdById: staff.id,
    });

    await repository.softDelete({
      id: guarantor.id,
      tenantId: tenant.id,
      deletedById: staff.id,
      deleteReason: 'duplicate entry',
    });

    const listed = await repository.listBySale({ tenantId: tenant.id, saleId: sale.id });
    expect(listed).toHaveLength(0);
    expect(await repository.countActiveBySale(tenant.id, sale.id)).toBe(0);
  });

  it('rejects cross-tenant tenantCustomerId', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });

    if (!otherTenant) {
      return;
    }

    const otherPhone = `0913${String(Date.now()).slice(-7)}`;
    const otherGlobalCustomer = await ensureTestGlobalCustomer(
      prisma,
      otherPhone,
      'Other Tenant Customer',
    );
    const otherTenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: otherTenant.id,
        globalCustomerId: otherGlobalCustomer.id,
        localCode: `OT-${Date.now()}`,
      },
    });

    await expect(
      repository.create({
        id: randomUUID(),
        tenantId: tenant.id,
        saleId: sale.id,
        tenantCustomerId: otherTenantCustomer.id,
        relationship: GuarantorRelationship.SIBLING,
        createdById: staff.id,
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });
  });
});
