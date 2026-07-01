import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { PrismaService } from './prisma.service.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';

const databaseUrl = process.env.DATABASE_URL;
const describeIfDb = databaseUrl ? describe : describe.skip;

describeIfDb('installments_module migration (integration)', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function loadDemoContext() {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) throw new Error('demo-shop tenant required — run prisma db seed');

    const branch = await prisma.branch.findFirst({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    if (!branch) throw new Error('demo-shop default branch required');

    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    if (!staff) throw new Error('demo-shop staff required');

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(
      prisma,
      phone,
      'Migration Test Customer',
    );

    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `MT-${Date.now()}`,
      },
    });

    return { tenant, branch, staff, tenantCustomer };
  }

  it('creates sale → installments FK chain', async () => {
    const { tenant, branch, staff, tenantCustomer } = await loadDemoContext();
    const saleId = randomUUID();
    const contractDate = new Date('2026-06-01');
    const firstDueDate = new Date('2026-07-01');

    const sale = await prisma.sale.create({
      data: {
        id: saleId,
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: tenantCustomer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 30_000_000n,
        downPaymentRial: 0n,
        installmentCount: 3,
        firstDueDate,
        contractDate,
      },
    });

    const installments = await prisma.installment.createMany({
      data: [1, 2, 3].map((sequenceNumber) => ({
        id: randomUUID(),
        saleId: sale.id,
        tenantId: tenant.id,
        sequenceNumber,
        dueDate: new Date(firstDueDate.getTime() + (sequenceNumber - 1) * 30 * 86_400_000),
        amountRial: 10_000_000n,
      })),
    });

    expect(installments.count).toBe(3);

    const loaded = await prisma.sale.findFirst({
      where: { id: sale.id, tenantId: tenant.id },
      include: { installments: { orderBy: { sequenceNumber: 'asc' } } },
    });

    expect(loaded?.installments).toHaveLength(3);
    expect(loaded?.installments.map((row) => row.sequenceNumber)).toEqual([1, 2, 3]);
  });

  it('rejects sale with invalid branchId (FK RESTRICT)', async () => {
    const { tenant, staff, tenantCustomer } = await loadDemoContext();

    await expect(
      prisma.sale.create({
        data: {
          tenantId: tenant.id,
          branchId: randomUUID(),
          tenantCustomerId: tenantCustomer.id,
          createdByStaffId: staff.id,
          totalAmountRial: 1_000_000n,
          installmentCount: 1,
          firstDueDate: new Date(),
          contractDate: new Date(),
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });

  it('rejects duplicate (saleId, sequenceNumber)', async () => {
    const { tenant, branch, staff, tenantCustomer } = await loadDemoContext();
    const saleId = randomUUID();

    await prisma.sale.create({
      data: {
        id: saleId,
        tenantId: tenant.id,
        branchId: branch.id,
        tenantCustomerId: tenantCustomer.id,
        createdByStaffId: staff.id,
        totalAmountRial: 2_000_000n,
        installmentCount: 2,
        firstDueDate: new Date(),
        contractDate: new Date(),
      },
    });

    const installmentPayload = {
      saleId,
      tenantId: tenant.id,
      sequenceNumber: 1,
      dueDate: new Date(),
      amountRial: 1_000_000n,
    };

    await prisma.installment.create({ data: { id: randomUUID(), ...installmentPayload } });

    await expect(
      prisma.installment.create({ data: { id: randomUUID(), ...installmentPayload } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
