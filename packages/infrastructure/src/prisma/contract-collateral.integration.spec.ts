import { randomUUID } from 'node:crypto';

import { CollateralStatus, CollateralType } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { ContractCollateral } from '@hivork/domain';

import { PrismaContractCollateralRepository } from '../persistence/contract-collateral.repository.js';
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

describeIfDb('ContractCollateral (IFP-066 integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaContractCollateralRepository(prisma);

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
    const globalCustomer = await ensureTestGlobalCustomer(
      prisma,
      phone,
      'Contract Collateral Customer',
    );
    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `CC-${Date.now()}`,
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

    return { tenant, staff, sale };
  }

  it('creates collateral with bigint estimated value', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const entity = ContractCollateral.create({
      tenantId: tenant.id,
      saleId: sale.id,
      collateralType: 'GOLD',
      title: 'طلای وثیقه',
      estimatedValueRial: 120_000_000n,
      registrationNumber: 'G-1001',
      createdById: staff.id,
    });

    const collateral = await repository.create({
      id: entity.id,
      tenantId: tenant.id,
      saleId: sale.id,
      collateralType: CollateralType.GOLD,
      title: entity.toProps().title,
      estimatedValueRial: entity.estimatedValueRial,
      registrationNumber: 'G-1001',
      createdById: staff.id,
    });

    expect(collateral.estimatedValueRial).toBe(120_000_000n);
    expect(collateral.status).toBe(CollateralStatus.PLEDGED);
  });

  it('transitions pledged collateral to released', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    const created = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      collateralType: CollateralType.CHEQUE,
      title: 'چک وثیقه',
      estimatedValueRial: 25_000_000n,
      createdById: staff.id,
    });

    const released = await repository.updateStatus({
      id: created.id,
      tenantId: tenant.id,
      status: CollateralStatus.RELEASED,
      updatedById: staff.id,
    });

    expect(released.status).toBe(CollateralStatus.RELEASED);

    const pledgedOnly = await repository.listBySale({
      tenantId: tenant.id,
      saleId: sale.id,
      status: CollateralStatus.PLEDGED,
    });
    expect(pledgedOnly).toHaveLength(0);
  });

  it('isolates collaterals by tenant (cross-tenant access fails)', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });

    const collateral = await repository.create({
      id: randomUUID(),
      tenantId: tenant.id,
      saleId: sale.id,
      collateralType: CollateralType.OTHER,
      title: 'وثیقه تست',
      estimatedValueRial: 10_000_000n,
      createdById: staff.id,
    });

    if (otherTenant) {
      const crossTenantList = await repository.listBySale({
        tenantId: otherTenant.id,
        saleId: sale.id,
      });
      expect(crossTenantList).toHaveLength(0);

      await expect(
        repository.create({
          id: randomUUID(),
          tenantId: otherTenant.id,
          saleId: sale.id,
          collateralType: CollateralType.OTHER,
          title: 'Cross tenant',
          estimatedValueRial: 10_000_000n,
          createdById: staff.id,
        }),
      ).rejects.toMatchObject({ code: 'SALE_NOT_FOUND' });
    }

    await expect(
      repository.softDelete({
        id: collateral.id,
        tenantId: otherTenant?.id ?? randomUUID(),
        deletedById: staff.id,
      }),
    ).rejects.toMatchObject({ code: 'COLLATERAL_NOT_FOUND' });
  });
});
