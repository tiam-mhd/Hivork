import { randomUUID } from 'node:crypto';

import { ContractVersionChangeType } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaContractVersionRepository } from '../persistence/contract-version.repository.js';
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

function sampleSnapshot(saleId: string) {
  return {
    sale: {
      id: saleId,
      status: 'ACTIVE',
      totalAmountRial: '12000000',
    },
    installmentSchedule: [{ sequenceNumber: 1, amountRial: '6000000' }],
    settingsHash: 'sha256-test',
  };
}

describeIfDb('ContractVersion (IFP-056 integration)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaContractVersionRepository(prisma);

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
    const globalCustomer = await ensureTestGlobalCustomer(prisma, phone, 'Contract Version Customer');
    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `CV-${Date.now()}`,
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

  it('appends version 1 on create and version 2 on update', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    const v1 = await repository.appendVersion({
      tenantId: tenant.id,
      saleId: sale.id,
      versionNumber: 1,
      changeType: ContractVersionChangeType.CREATE,
      changeReason: 'initial contract creation',
      snapshot: sampleSnapshot(sale.id),
      createdById: staff.id,
    });

    const v2 = await repository.appendVersion({
      tenantId: tenant.id,
      saleId: sale.id,
      versionNumber: 2,
      changeType: ContractVersionChangeType.FINANCIAL_RECALC,
      changeReason: 'installment schedule recalculated',
      snapshot: {
        ...sampleSnapshot(sale.id),
        sale: { ...sampleSnapshot(sale.id).sale, totalAmountRial: '15000000' },
      },
      createdById: staff.id,
    });

    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);

    const listed = await repository.listBySale(tenant.id, sale.id);
    expect(listed).toHaveLength(2);
    expect(listed[0]?.changeType).toBe(ContractVersionChangeType.CREATE);
    expect(listed[1]?.changeType).toBe(ContractVersionChangeType.FINANCIAL_RECALC);
    expect(await repository.findLatestVersionNumber(tenant.id, sale.id)).toBe(2);
  });

  it('rejects duplicate (saleId, versionNumber) with unique constraint', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    await repository.appendVersion({
      tenantId: tenant.id,
      saleId: sale.id,
      versionNumber: 1,
      changeType: ContractVersionChangeType.CREATE,
      changeReason: 'initial contract creation',
      snapshot: sampleSnapshot(sale.id),
      createdById: staff.id,
    });

    await expect(
      repository.appendVersion({
        tenantId: tenant.id,
        saleId: sale.id,
        versionNumber: 1,
        changeType: ContractVersionChangeType.UPDATE,
        changeReason: 'duplicate version attempt',
        snapshot: sampleSnapshot(sale.id),
        createdById: staff.id,
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('keeps versions readable after sale soft-delete', async () => {
    const { tenant, staff, sale } = await createSaleFixture();

    await repository.appendVersion({
      tenantId: tenant.id,
      saleId: sale.id,
      versionNumber: 1,
      changeType: ContractVersionChangeType.CREATE,
      changeReason: 'initial contract creation',
      snapshot: sampleSnapshot(sale.id),
      createdById: staff.id,
    });

    await prisma.sale.update({
      where: { id: sale.id },
      data: {
        deletedAt: new Date(),
        deletedById: staff.id,
        deleteReason: 'integration soft delete',
      },
    });

    const listed = await repository.listBySale(tenant.id, sale.id);
    expect(listed).toHaveLength(1);
  });
});
