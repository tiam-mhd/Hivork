import { describe, expect, it, vi, beforeEach } from 'vitest';

import { GetSaleUseCase } from './get-sale.use-case.js';

describe('GetSaleUseCase', () => {
  const sales = {
    findDetailById: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    countActive: vi.fn(),
  };
  const installments = {
    findBySaleId: vi.fn(),
    saveMany: vi.fn(),
  };

  const useCase = new GetSaleUseCase(sales, installments);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  const saleRecord = {
    id: 'sale-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    tenantCustomerId: 'customer-1',
    createdByStaffId: 'staff-1',
    title: 'Test',
    description: null,
    invoiceNumber: null,
    totalAmountRial: 1_000_000n,
    downPaymentRial: 0n,
    discountRial: null,
    taxRial: null,
    installmentCount: 2,
    firstDueDate: new Date('2026-08-01'),
    intervalDays: 30,
    contractDate: new Date('2026-07-01'),
    status: 'ACTIVE' as const,
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 1,
    createdAt: new Date('2026-06-29T10:00:00.000Z'),
    updatedAt: new Date('2026-06-29T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findDetailById.mockResolvedValue({
      sale: saleRecord,
      customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
    });
    installments.findBySaleId.mockResolvedValue([
      {
        id: 'inst-2',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 2,
        dueDate: new Date('2026-09-01'),
        amountRial: 500_000n,
        status: 'PENDING',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: saleRecord.createdAt,
        updatedAt: saleRecord.updatedAt,
      },
      {
        id: 'inst-1',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 1,
        dueDate: new Date('2026-08-01'),
        amountRial: 500_000n,
        status: 'PAID',
        paidAt: new Date('2026-08-02'),
        confirmedByStaffId: 'staff-1',
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: saleRecord.createdAt,
        updatedAt: saleRecord.updatedAt,
      },
    ]);
  });

  it('returns sale detail with customer and installments', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      saleId: 'sale-1',
      staffContext,
    });

    expect(result.customer.phone).toBe('09123456789');
    expect(result.installments).toHaveLength(2);
    expect(result.installments[0]?.sequenceNumber).toBe(1);
    expect(result.installments[1]?.sequenceNumber).toBe(2);
  });

  it('returns SALE_NOT_FOUND when sale is missing', async () => {
    sales.findDetailById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        saleId: 'sale-1',
        staffContext,
      }),
    ).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('masks out-of-scope sale as SALE_NOT_FOUND', async () => {
    sales.findDetailById.mockResolvedValue({
      sale: { ...saleRecord, createdByStaffId: 'other-staff' },
      customer: { id: 'gc-1', phone: '09123456789', name: 'علی' },
    });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        saleId: 'sale-1',
        staffContext: {
          ...staffContext,
          dataScope: 'own',
        },
      }),
    ).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
