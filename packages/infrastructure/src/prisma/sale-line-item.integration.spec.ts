import { randomUUID } from 'node:crypto';

import { SaleLineItem, computeLineTotal } from '@hivork/domain';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaSaleLineItemRepository } from '../persistence/sale-line-item.repository.js';
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

describeIfDb('SaleLineItem (IFP-068 integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaSaleLineItemRepository(prisma);

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
      'Sale Line Item Customer',
    );
    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `SLI-${Date.now()}`,
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

  it('creates line items in batch ordered by sortOrder', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    const drafts = [
      SaleLineItem.create({
        tenantId: tenant.id,
        saleId: sale.id,
        title: 'کالای اول',
        unitPriceRial: 5_000_000n,
        quantity: 2,
        sortOrder: 0,
        createdById: staff.id,
      }),
      SaleLineItem.create({
        tenantId: tenant.id,
        saleId: sale.id,
        title: 'کالای دوم',
        unitPriceRial: 3_000_000n,
        discountRial: 500_000n,
        taxRial: 100_000n,
        sortOrder: 1,
        createdById: staff.id,
      }),
    ];

    const created = await repository.createMany(
      drafts.map((draft) => {
        const props = draft.toProps();
        return {
          id: props.id,
          tenantId: props.tenantId,
          saleId: props.saleId,
          title: props.title,
          sku: props.sku,
          quantity: props.quantity,
          unitPriceRial: props.unitPriceRial,
          discountRial: props.discountRial,
          taxRial: props.taxRial,
          lineTotalRial: props.lineTotalRial,
          sortOrder: props.sortOrder,
          createdById: staff.id,
        };
      }),
    );

    expect(created).toHaveLength(2);
    expect(created[0]?.lineTotalRial).toBe(10_000_000n);
    expect(created[1]?.lineTotalRial).toBe(
      computeLineTotal({
        quantity: 1,
        unitPriceRial: 3_000_000n,
        discountRial: 500_000n,
        taxRial: 100_000n,
      }),
    );

    const listed = await repository.listBySale({ tenantId: tenant.id, saleId: sale.id });
    expect(listed).toHaveLength(2);
    expect(listed[0]?.title).toBe('کالای اول');
    expect(listed[1]?.title).toBe('کالای دوم');
    expect(await repository.sumLineTotalsBySale(tenant.id, sale.id)).toBe(12_600_000n);
  });

  it('isolates line items by tenant', async () => {
    const { tenant, staff, sale } = await createSaleFixture();
    const otherTenant = await prisma.tenant.findFirst({
      where: { slug: { not: 'demo-shop' }, deletedAt: null },
    });

    const draft = SaleLineItem.create({
      tenantId: tenant.id,
      saleId: sale.id,
      title: 'قلم تست',
      unitPriceRial: 1_000_000n,
      createdById: staff.id,
    });
    const props = draft.toProps();

    await repository.create({
      id: props.id,
      tenantId: props.tenantId,
      saleId: props.saleId,
      title: props.title,
      unitPriceRial: props.unitPriceRial,
      lineTotalRial: props.lineTotalRial,
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
          title: 'Cross tenant',
          unitPriceRial: 1_000_000n,
          lineTotalRial: 1_000_000n,
          createdById: staff.id,
        }),
      ).rejects.toMatchObject({ code: 'SALE_NOT_FOUND' });
    }
  });
});
