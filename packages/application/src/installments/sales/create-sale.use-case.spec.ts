import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CreateSaleUseCase } from './create-sale.use-case.js';
import { hashCreateSaleRequest } from './create-sale-request-hash.js';
import type { SaleDetail } from './sale-detail.mapper.js';

function tomorrow(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

describe('CreateSaleUseCase', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = {
    save: vi.fn(),
    countActive: vi.fn(),
    findById: vi.fn(),
  };
  const installments = {
    saveMany: vi.fn(),
    findBySaleId: vi.fn(),
  };
  const tenantCustomers = { findDetailById: vi.fn() };
  const branches = { existsActiveInTenant: vi.fn() };
  const tenantPlans = { getMaxCustomers: vi.fn(), getMaxActiveSales: vi.fn() };
  const idempotency = { find: vi.fn(), store: vi.fn() };
  const audit = { log: vi.fn(), find: vi.fn() };
  const outbox = { publish: vi.fn() };

  const useCase = new CreateSaleUseCase(
    unitOfWork,
    sales,
    installments,
    tenantCustomers,
    branches,
    tenantPlans,
    idempotency,
    audit,
    outbox,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  const baseInput = {
    tenantId: 'tenant-1',
    actorId: 'staff-1',
    idempotencyKey: '00000000-0000-0000-0000-000000000099',
    tenantCustomerId: '00000000-0000-0000-0000-000000000001',
    branchId: 'branch-1',
    totalAmountRial: 10_000_000n,
    downPaymentRial: 0n,
    installmentCount: 3,
    firstDueDate: tomorrow(),
    contractDate: new Date('2026-07-01'),
    intervalDays: 30,
    staffContext,
  };

  const savedSale = {
    id: 'sale-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    tenantCustomerId: baseInput.tenantCustomerId,
    createdByStaffId: 'staff-1',
    title: null,
    description: null,
    invoiceNumber: null,
    totalAmountRial: 10_000_000n,
    downPaymentRial: 0n,
    discountRial: null,
    taxRial: null,
    installmentCount: 3,
    firstDueDate: baseInput.firstDueDate,
    intervalDays: 30,
    contractDate: baseInput.contractDate,
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
    idempotency.find.mockResolvedValue(null);
    branches.existsActiveInTenant.mockResolvedValue(true);
    tenantCustomers.findDetailById.mockResolvedValue({
      id: baseInput.tenantCustomerId,
      isBlacklisted: false,
    });
    tenantPlans.getMaxActiveSales.mockResolvedValue(100);
    sales.countActive.mockResolvedValue(0);
    sales.save.mockResolvedValue(savedSale);
    installments.saveMany.mockResolvedValue([
      {
        id: 'inst-1',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 1,
        dueDate: baseInput.firstDueDate,
        amountRial: 3_333_334n,
        status: 'PENDING',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: savedSale.createdAt,
        updatedAt: savedSale.updatedAt,
      },
      {
        id: 'inst-2',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 2,
        dueDate: baseInput.firstDueDate,
        amountRial: 3_333_333n,
        status: 'PENDING',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: savedSale.createdAt,
        updatedAt: savedSale.updatedAt,
      },
      {
        id: 'inst-3',
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: 3,
        dueDate: baseInput.firstDueDate,
        amountRial: 3_333_333n,
        status: 'PENDING',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: savedSale.createdAt,
        updatedAt: savedSale.updatedAt,
      },
    ]);
  });

  it('creates sale and installments on happy path', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.installments).toHaveLength(3);
    expect(result.totalAmountRial).toBe('10000000');
    expect(sales.save).toHaveBeenCalledOnce();
    expect(installments.saveMany).toHaveBeenCalledOnce();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.create', entityType: 'sale' }),
      expect.anything(),
    );
    expect(outbox.publish).toHaveBeenCalledOnce();
    expect(idempotency.store).toHaveBeenCalledOnce();
  });

  it('rejects when down payment exceeds total', async () => {
    await expect(
      useCase.execute({ ...baseInput, downPaymentRial: 11_000_000n }),
    ).rejects.toMatchObject({
      code: 'AMOUNT_EXCEEDS_TOTAL',
      httpStatus: 400,
    });
  });

  it('rejects invalid installment count', async () => {
    await expect(useCase.execute({ ...baseInput, installmentCount: 0 })).rejects.toMatchObject({
      code: 'INSTALLMENT_COUNT_INVALID',
      httpStatus: 400,
    });
  });

  it('rejects past due date', async () => {
    await expect(
      useCase.execute({ ...baseInput, firstDueDate: new Date('2020-01-01') }),
    ).rejects.toMatchObject({
      code: 'DUE_DATE_IN_PAST',
      httpStatus: 400,
    });
  });

  it('rejects branch outside staff scope', async () => {
    branches.existsActiveInTenant.mockResolvedValue(true);

    await expect(
      useCase.execute({
        ...baseInput,
        branchId: '00000000-0000-0000-0000-000000000088',
        staffContext: {
          ...staffContext,
          dataScope: 'branch',
          assignedBranchIds: ['branch-1'],
        },
      }),
    ).rejects.toMatchObject({
      code: 'BRANCH_NOT_ALLOWED',
      httpStatus: 403,
    });
  });

  it('rejects blacklisted customer', async () => {
    tenantCustomers.findDetailById.mockResolvedValue({
      id: baseInput.tenantCustomerId,
      isBlacklisted: true,
    });

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'CUSTOMER_BLACKLISTED',
      httpStatus: 403,
    });
  });

  it('rejects missing customer', async () => {
    tenantCustomers.findDetailById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('distributes 10M across 3 installments via domain algorithm', async () => {
    installments.saveMany.mockImplementation(async (inputs) =>
      inputs.map((input: { id: string; sequenceNumber: number; amountRial: bigint }, index: number) => ({
        id: `inst-${index + 1}`,
        saleId: 'sale-1',
        tenantId: 'tenant-1',
        sequenceNumber: input.sequenceNumber,
        dueDate: baseInput.firstDueDate,
        amountRial: input.amountRial,
        status: 'PENDING',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: savedSale.createdAt,
        updatedAt: savedSale.updatedAt,
      })),
    );

    const result = await useCase.execute(baseInput);
    const amounts = result.installments.map((item) => BigInt(item.amountRial));

    expect(amounts).toEqual([3_333_334n, 3_333_333n, 3_333_333n]);
    expect(amounts.reduce((sum, value) => sum + value, 0n)).toBe(10_000_000n);
  });

  it('returns cached response for duplicate idempotency key', async () => {
    const cached: SaleDetail = {
      id: 'cached-sale',
      tenantCustomerId: baseInput.tenantCustomerId,
      branchId: baseInput.branchId,
      title: null,
      totalAmountRial: '10000000',
      downPaymentRial: '0',
      installmentCount: 3,
      status: 'active',
      createdAt: savedSale.createdAt.toISOString(),
      installments: [],
    };

    idempotency.find.mockResolvedValue({
      requestHash: hashCreateSaleRequest(baseInput),
      response: cached as unknown as Record<string, unknown>,
    });

    const result = await useCase.execute(baseInput);

    expect(result.id).toBe('cached-sale');
    expect(sales.save).not.toHaveBeenCalled();
  });
});
