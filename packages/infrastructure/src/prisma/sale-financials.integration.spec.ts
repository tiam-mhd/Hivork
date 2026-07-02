import { randomUUID } from 'node:crypto';

import { SaleFinancials } from '@hivork/domain';
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

describeIfDb('SaleFinancials integration (IFP-069)', () => {
  const prisma = new PrismaService();
  const lineItemRepository = new PrismaSaleLineItemRepository(prisma);

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
      'Sale Financials Customer',
    );
    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `SF-${Date.now()}`,
      },
    });

    const sale = await prisma.sale.create({
      data: {
        id: randomUUID(),
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: tenantCustomer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 1n,
        downPaymentRial: 0n,
        installmentCount: 2,
        firstDueDate: new Date('2026-08-01'),
        contractDate: new Date('2026-07-01'),
        taxRateBps: 900,
        taxInclusive: false,
      },
    });

    return { tenant, staff, sale };
  }

  it('update tax recalculates total from persisted line items', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    await lineItemRepository.create({
      tenantId: tenant.id,
      saleId: sale.id,
      title: 'Line A',
      quantity: 2,
      unitPriceRial: 5_000_000n,
      discountRial: 200_000n,
      taxRial: 100_000n,
      sortOrder: 0,
      createdById: staff.id,
    });

    const lineItems = await lineItemRepository.listBySale(tenant.id, sale.id);
    const recalculated = SaleFinancials.recalculateTotals(
      lineItems.map((item) => ({
        quantity: item.quantity,
        unitPriceRial: item.unitPriceRial,
        discountRial: item.discountRial,
        taxRial: item.taxRial,
        lineTotalRial: item.lineTotalRial,
      })),
      {
        taxRateBps: 900,
        taxInclusive: false,
        insuranceRial: 500_000n,
      },
    );

    const updated = await prisma.sale.update({
      where: { id: sale.id },
      data: {
        totalAmountRial: recalculated.totalAmountRial,
        taxRial: recalculated.taxRial,
        version: { increment: 1 },
      },
    });

    expect(updated.totalAmountRial).toBe(10_791_000n);
    expect(updated.taxRial).toBe(991_000n);
    expect(updated.version).toBe(2);
  });

  it('perserves new tax and insurance columns on sale create', async () => {
    const { sale } = await createSaleFixture();

    const reloaded = await prisma.sale.findFirstOrThrow({ where: { id: sale.id } });
    expect(reloaded.taxRateBps).toBe(900);
    expect(reloaded.taxInclusive).toBe(false);
    expect(reloaded.insuranceExpiresAt).toBeNull();
  });
});
