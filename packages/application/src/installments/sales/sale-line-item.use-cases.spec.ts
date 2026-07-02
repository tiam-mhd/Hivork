import { describe, expect, it, vi } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import { BulkUpsertSaleLineItemsUseCase } from './sale-line-item.use-cases.js';

describe('BulkUpsertSaleLineItemsUseCase (IFP-071)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };

  const sales = {
    findById: vi.fn(),
    updateFinancials: vi.fn(),
  };

  const installments = {
    findBySaleId: vi.fn(),
    regeneratePendingAmounts: vi.fn(),
  };

  const lineItems = {
    countActiveBySale: vi.fn(),
    replaceAllForSale: vi.fn(),
    listBySale: vi.fn(),
  };

  const audit = { log: vi.fn() };

  const useCase = new BulkUpsertSaleLineItemsUseCase(
    unitOfWork,
    sales,
    installments,
    lineItems,
    audit,
  );

  const baseInput = {
    tenantId: 'tenant-1',
    staffId: 'staff-1',
    branchId: 'branch-1',
    saleId: 'sale-1',
    expectedVersion: 2,
    regenerateInstallments: false,
    staffContext: {
      staffId: 'staff-1',
      dataScope: 'all' as const,
      assignedBranchIds: ['branch-1'],
      activeBranchId: null,
    },
    items: [
      {
        title: 'Line A',
        quantity: 1,
        unitPriceRial: 10_000_000n,
        discountRial: 0n,
        taxRial: 0n,
      },
    ],
  };

  it('throws VERSION_CONFLICT when expectedVersion mismatches', async () => {
    sales.findById.mockResolvedValue({
      id: 'sale-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      deletedAt: null,
      archivedAt: null,
      status: 'ACTIVE',
      version: 3,
      totalAmountRial: 10_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: new Date('2026-08-01'),
      intervalDays: 30,
      taxRial: null,
      taxRateBps: null,
      taxInclusive: false,
      insuranceRial: null,
      insuranceExpiresAt: null,
    });
    installments.findBySaleId.mockResolvedValue([
      {
        id: 'i-1',
        amountRial: 5_000_000n,
        sequenceNumber: 1,
        status: 'PENDING',
      },
      {
        id: 'i-2',
        amountRial: 5_000_000n,
        sequenceNumber: 2,
        status: 'PENDING',
      },
    ]);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    });
  });

  it('throws INSTALLMENT_SUM_MISMATCH when totals change without regeneration', async () => {
    sales.findById.mockResolvedValue({
      id: 'sale-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      deletedAt: null,
      archivedAt: null,
      status: 'ACTIVE',
      version: 2,
      totalAmountRial: 10_000_000n,
      downPaymentRial: 0n,
      installmentCount: 2,
      firstDueDate: new Date('2026-08-01'),
      intervalDays: 30,
      taxRial: null,
      taxRateBps: null,
      taxInclusive: false,
      insuranceRial: null,
      insuranceExpiresAt: null,
    });
    installments.findBySaleId.mockResolvedValue([
      { id: 'i-1', amountRial: 5_000_000n, sequenceNumber: 1, status: 'PENDING' },
      { id: 'i-2', amountRial: 5_000_000n, sequenceNumber: 2, status: 'PENDING' },
    ]);
    lineItems.replaceAllForSale.mockResolvedValue([]);
    lineItems.listBySale.mockResolvedValue([
      {
        id: 'line-1',
        tenantId: 'tenant-1',
        saleId: 'sale-1',
        title: 'Line A',
        sku: null,
        quantity: 1,
        unitPriceRial: 12_000_000n,
        discountRial: 0n,
        taxRial: 0n,
        lineTotalRial: 12_000_000n,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'staff-1',
        updatedById: 'staff-1',
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        version: 1,
        metadata: null,
      },
    ]);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'INSTALLMENT_SUM_MISMATCH',
    });
  });
});
