import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CancelSaleUseCase } from './cancel-sale.use-case.js';

describe('CancelSaleUseCase', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = {
    findById: vi.fn(),
    update: vi.fn(),
    save: vi.fn(),
    countActive: vi.fn(),
  };
  const installments = {
    findBySaleId: vi.fn(),
    saveMany: vi.fn(),
  };
  const audit = { log: vi.fn(), find: vi.fn() };

  const useCase = new CancelSaleUseCase(unitOfWork, sales, installments, audit);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  const baseInput = {
    tenantId: 'tenant-1',
    actorId: 'staff-1',
    saleId: 'sale-1',
    reason: 'مشتری انصراف داد',
    staffContext,
  };

  const activeSale = {
    id: 'sale-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    tenantCustomerId: '00000000-0000-0000-0000-000000000001',
    createdByStaffId: 'staff-1',
    title: null,
    description: null,
    invoiceNumber: null,
    totalAmountRial: 5_000_000n,
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
    sales.findById.mockResolvedValue(activeSale);
    installments.findBySaleId.mockResolvedValue([
      {
        id: 'inst-1',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 1,
        dueDate: new Date('2026-08-01'),
        amountRial: 2_500_000n,
        status: 'PENDING',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: activeSale.createdAt,
        updatedAt: activeSale.updatedAt,
      },
    ]);
    sales.update.mockImplementation(async (input) => ({
      ...activeSale,
      status: input.status,
      cancelledAt: input.cancelledAt,
      cancelledById: input.cancelledById,
      cancelReason: input.cancelReason,
      version: input.version + 1,
    }));
  });

  it('cancels active sale with no paid installments', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('cancelled');
    expect(result.cancelledAt).toBeInstanceOf(Date);
    expect(sales.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sale-1',
        status: 'CANCELLED',
        cancelReason: 'مشتری انصراف داد',
      }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'sale.cancel',
        entityType: 'sale',
        newValue: { status: 'cancelled', reason: 'مشتری انصراف داد' },
      }),
      expect.anything(),
    );
  });

  it('rejects when a paid installment exists', async () => {
    installments.findBySaleId.mockResolvedValue([
      {
        id: 'inst-1',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 1,
        dueDate: new Date('2026-08-01'),
        amountRial: 2_500_000n,
        status: 'PAID',
        paidAt: new Date(),
        confirmedByStaffId: 'staff-1',
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: activeSale.createdAt,
        updatedAt: activeSale.updatedAt,
      },
    ]);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_HAS_PAID_INSTALLMENT',
      httpStatus: 409,
    });
    expect(sales.update).not.toHaveBeenCalled();
  });

  it('rejects already cancelled sale', async () => {
    sales.findById.mockResolvedValue({
      ...activeSale,
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledById: 'staff-1',
      cancelReason: 'قبلی',
    });

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_ALREADY_CANCELLED',
      httpStatus: 409,
    });
  });

  it('rejects completed sale', async () => {
    sales.findById.mockResolvedValue({
      ...activeSale,
      status: 'COMPLETED',
    });

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_ALREADY_COMPLETED',
      httpStatus: 409,
    });
  });

  it('allows cancel when only overdue installments exist', async () => {
    installments.findBySaleId.mockResolvedValue([
      {
        id: 'inst-1',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 1,
        dueDate: new Date('2026-01-01'),
        amountRial: 2_500_000n,
        status: 'OVERDUE',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: activeSale.createdAt,
        updatedAt: activeSale.updatedAt,
      },
    ]);

    await expect(useCase.execute(baseInput)).resolves.toMatchObject({
      status: 'cancelled',
    });
  });

  it('returns SALE_NOT_FOUND for cross-tenant sale id', async () => {
    sales.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('masks out-of-scope sale as SALE_NOT_FOUND for own data scope', async () => {
    sales.findById.mockResolvedValue({
      ...activeSale,
      createdByStaffId: 'other-staff',
    });

    await expect(
      useCase.execute({
        ...baseInput,
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

  it('rejects reason shorter than 3 characters', async () => {
    await expect(useCase.execute({ ...baseInput, reason: 'ab' })).rejects.toMatchObject({
      code: 'FIELD_REQUIRED',
      httpStatus: 400,
    });
    expect(sales.findById).not.toHaveBeenCalled();
  });
});
