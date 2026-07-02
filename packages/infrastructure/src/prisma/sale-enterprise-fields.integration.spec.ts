import { randomUUID } from 'node:crypto';

import { ContractSignatureStatus, SaleStatus } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { PrismaService } from './prisma.service.js';
import { ensureTestGlobalCustomer } from '../persistence/test-user.helper.js';

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

describeIfDb('Sale enterprise fields migration (IFP-055)', () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function loadDemoContext() {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'demo-shop', deletedAt: null },
    });
    if (!tenant) {
      throw new Error('demo-shop tenant required — run prisma db seed');
    }

    const branch = await prisma.branch.findFirst({
      where: { tenantId: tenant.id, isDefault: true, deletedAt: null },
    });
    if (!branch) {
      throw new Error('demo-shop default branch required');
    }

    const staff = await prisma.staff.findFirst({
      where: { tenantId: tenant.id, deletedAt: null },
    });
    if (!staff) {
      throw new Error('demo-shop staff required');
    }

    const phone = `0912${String(Date.now()).slice(-7)}`;
    const globalCustomer = await ensureTestGlobalCustomer(
      prisma,
      phone,
      'Sale Enterprise Test Customer',
    );

    const tenantCustomer = await prisma.tenantCustomer.create({
      data: {
        tenantId: tenant.id,
        globalCustomerId: globalCustomer.id,
        localCode: `SE-${Date.now()}`,
      },
    });

    return { tenant, branch, staff, tenantCustomer };
  }

  function baseSaleData(
    ctx: Awaited<ReturnType<typeof loadDemoContext>>,
    overrides?: { contractNumber?: string; id?: string },
  ) {
    return {
      id: overrides?.id ?? randomUUID(),
      tenantId: ctx.tenant.id,
      branchId: ctx.branch.id,
      tenantCustomerId: ctx.tenantCustomer.id,
      createdByStaffId: ctx.staff.id,
      totalAmountRial: 12_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: new Date('2026-08-01'),
      contractDate: new Date('2026-07-01'),
      contractNumber: overrides?.contractNumber,
    };
  }

  it('preserves existing sales after migration (nullable enterprise fields default)', async () => {
    const ctx = await loadDemoContext();
    const sale = await prisma.sale.create({
      data: baseSaleData(ctx),
    });

    const reloaded = await prisma.sale.findFirstOrThrow({ where: { id: sale.id } });
    expect(reloaded.contractNumber).toBeNull();
    expect(reloaded.signatureStatus).toBe(ContractSignatureStatus.UNSIGNED);
    expect(reloaded.status).toBe(SaleStatus.ACTIVE);
    expect(reloaded.extendedFromSaleId).toBeNull();
    expect(reloaded.insuranceRial).toBeNull();
  });

  it('creates sale with contractNumber and enterprise optional fields', async () => {
    const ctx = await loadDemoContext();
    const contractNumber = `CN-${Date.now()}`;

    const sale = await prisma.sale.create({
      data: {
        ...baseSaleData(ctx, { contractNumber }),
        customTerms: 'شرایط اختصاصی تست',
        insuranceRial: 500_000n,
        insuranceProvider: 'بیمه تست',
        insurancePolicyNumber: 'POL-001',
      },
    });

    expect(sale.contractNumber).toBe(contractNumber);
    expect(sale.customTerms).toBe('شرایط اختصاصی تست');
    expect(sale.insuranceRial).toBe(500_000n);
  });

  it('rejects duplicate contractNumber for same tenant among active rows', async () => {
    const ctx = await loadDemoContext();
    const contractNumber = `DUP-${Date.now()}`;

    await prisma.sale.create({
      data: baseSaleData(ctx, { contractNumber }),
    });

    await expect(
      prisma.sale.create({
        data: baseSaleData(ctx, { contractNumber }),
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('allows contractNumber reuse after source sale is soft-deleted', async () => {
    const ctx = await loadDemoContext();
    const contractNumber = `REUSE-${Date.now()}`;
    const firstId = randomUUID();

    await prisma.sale.create({
      data: baseSaleData(ctx, { contractNumber, id: firstId }),
    });

    await prisma.sale.update({
      where: { id: firstId },
      data: {
        deletedAt: new Date(),
        deletedById: ctx.staff.id,
        deleteReason: 'integration test soft delete',
      },
    });

    const second = await prisma.sale.create({
      data: baseSaleData(ctx, { contractNumber }),
    });

    expect(second.contractNumber).toBe(contractNumber);
  });

  it('supports lineage self-FK and enterprise status enum values', async () => {
    const ctx = await loadDemoContext();
    const parent = await prisma.sale.create({
      data: baseSaleData(ctx, { contractNumber: `LINE-${Date.now()}` }),
    });

    const child = await prisma.sale.create({
      data: {
        ...baseSaleData(ctx, { contractNumber: `LINE-CH-${Date.now()}` }),
        extendedFromSaleId: parent.id,
        copiedFromSaleId: parent.id,
        status: SaleStatus.TERMINATED,
        terminatedAt: new Date(),
        terminatedById: ctx.staff.id,
        terminateReason: 'integration terminate',
      },
    });

    expect(child.extendedFromSaleId).toBe(parent.id);
    expect(child.status).toBe(SaleStatus.TERMINATED);
  });
});

describe('SaleStatus generated types (IFP-055)', () => {
  it('includes enterprise enum values', () => {
    expect(Object.values(SaleStatus)).toEqual(
      expect.arrayContaining(['TERMINATED', 'CLOSED', 'ARCHIVED']),
    );
    expect(Object.values(ContractSignatureStatus)).toEqual(
      expect.arrayContaining(['UNSIGNED', 'PENDING', 'SIGNED']),
    );
  });
});
