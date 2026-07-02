import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ExtendContractUseCase } from './extend-contract.use-case.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';

function enterpriseSaleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 'sale-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    tenantCustomerId: '00000000-0000-0000-0000-000000000001',
    createdByStaffId: 'staff-1',
    title: null,
    description: null,
    invoiceNumber: null,
    contractNumber: null,
    customTerms: null,
    signatureStatus: 'UNSIGNED',
    signedAt: null,
    extendedFromSaleId: null,
    copiedFromSaleId: null,
    terminatedAt: null,
    terminatedById: null,
    terminateReason: null,
    closedAt: null,
    closedById: null,
    closeReason: null,
    archivedAt: null,
    archivedById: null,
    archiveReason: null,
    insuranceRial: null,
    insuranceProvider: null,
    insurancePolicyNumber: null,
    insuranceExpiresAt: null,
    totalAmountRial: 6_000_000n,
    downPaymentRial: 0n,
    discountRial: null,
    taxRial: null,
    taxRateBps: null,
    taxInclusive: false,
    installmentCount: 2,
    firstDueDate: new Date('2026-08-01T12:00:00.000Z'),
    intervalDays: 30,
    contractDate: new Date('2026-07-01T12:00:00.000Z'),
    status: 'ACTIVE',
    cancelledAt: null,
    cancelledById: null,
    cancelReason: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    metadata: null,
    version: 1,
    createdAt: new Date('2026-06-29T10:00:00.000Z'),
    updatedAt: new Date('2026-06-29T10:00:00.000Z'),
    ...overrides,
  };
}

describe('ExtendContractUseCase (IFP-060)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = {
    findById: vi.fn(),
    extend: vi.fn(),
    update: vi.fn(),
    save: vi.fn(),
    countActive: vi.fn(),
  };
  const installments = {
    findBySaleId: vi.fn(),
    saveMany: vi.fn(),
  };
  const contractVersions = {
    appendVersion: vi.fn(),
    findLatestVersionNumber: vi.fn(),
    listBySale: vi.fn(),
  };
  const scheduleExtender = { extend: vi.fn() };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const audit = { log: vi.fn(), find: vi.fn() };

  const useCase = new ExtendContractUseCase(
    unitOfWork,
    sales,
    installments,
    contractVersions,
    scheduleExtender,
    branches,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: ['branch-1'],
    activeBranchId: null,
  };

  const baseInput = {
    tenantId: 'tenant-1',
    staffId: 'staff-1',
    branchId: 'branch-1',
    saleId: 'sale-1',
    newLastDueDate: '2027-01-01',
    reason: 'تمدید قرارداد',
    expectedVersion: 1,
    staffContext,
  };

  const installmentRows = [
    {
      id: 'inst-1',
      saleId: 'sale-1',
      tenantId: 'tenant-1',
      sequenceNumber: 1,
      dueDate: new Date('2026-08-01T12:00:00.000Z'),
      amountRial: 3_000_000n,
      status: 'PENDING' as const,
      paidAt: null,
      confirmedByStaffId: null,
      waivedByStaffId: null,
      waiveReason: null,
      version: 1,
      createdAt: new Date('2026-06-29T10:00:00.000Z'),
      updatedAt: new Date('2026-06-29T10:00:00.000Z'),
    },
    {
      id: 'inst-2',
      saleId: 'sale-1',
      tenantId: 'tenant-1',
      sequenceNumber: 2,
      dueDate: new Date('2026-09-01T12:00:00.000Z'),
      amountRial: 3_000_000n,
      status: 'PENDING' as const,
      paidAt: null,
      confirmedByStaffId: null,
      waivedByStaffId: null,
      waiveReason: null,
      version: 1,
      createdAt: new Date('2026-06-29T10:00:00.000Z'),
      updatedAt: new Date('2026-06-29T10:00:00.000Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findById.mockResolvedValue(enterpriseSaleRecord());
    installments.findBySaleId.mockResolvedValue(installmentRows);
    contractVersions.findLatestVersionNumber.mockResolvedValue(null);
    contractVersions.appendVersion.mockResolvedValue({
      id: 'version-1',
      versionNumber: 1,
    });
    sales.extend.mockImplementation(async (input) =>
      enterpriseSaleRecord({
        extendedFromSaleId: input.extendedFromSaleId,
        installmentCount: input.installmentCount,
        metadata: input.metadata,
        version: input.version + 1,
      }),
    );
  });

  it('extends active sale — version +1 and contract version appended', async () => {
    const result = await useCase.execute({
      ...baseInput,
      additionalInstallmentCount: 2,
    });

    expect(result.status).toBe('active');
    expect(result.extendedFromSaleId).toBe('sale-1');
    expect(sales.extend).toHaveBeenCalledWith(
      expect.objectContaining({
        extendedFromSaleId: 'sale-1',
        installmentCount: 4,
      }),
      expect.anything(),
    );
    expect(contractVersions.appendVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        changeType: 'EXTEND',
        versionNumber: 1,
      }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.extend' }),
      expect.anything(),
    );
  });

  it('rejects completed sale with INVALID_STATUS_TRANSITION', async () => {
    sales.findById.mockResolvedValue(enterpriseSaleRecord({ status: 'COMPLETED' }));

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      httpStatus: 409,
    });
    expect(sales.extend).not.toHaveBeenCalled();
  });

  it('rejects version conflict', async () => {
    await expect(
      useCase.execute({ ...baseInput, expectedVersion: 99 }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
      httpStatus: 409,
    });
    expect(sales.extend).not.toHaveBeenCalled();
  });

  it('rejects newLastDueDate before last installment with EXTEND_DATE_INVALID', async () => {
    await expect(
      useCase.execute({ ...baseInput, newLastDueDate: '2026-08-01' }),
    ).rejects.toMatchObject({
      code: 'EXTEND_DATE_INVALID',
      httpStatus: 422,
    });
  });

  it('returns SALE_NOT_FOUND for cross-tenant sale id', async () => {
    sales.findById.mockResolvedValue(null);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('delegates regenerateSchedule to schedule extender stub', async () => {
    await useCase.execute({ ...baseInput, regenerateSchedule: true });

    expect(scheduleExtender.extend).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: 'sale-1',
        newLastDueDate: expect.any(Date),
      }),
      expect.anything(),
    );
  });

  it('rejects archived sale as read-only', async () => {
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({
        archivedAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    );

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_ARCHIVED_READONLY',
      httpStatus: 409,
    });
  });
});
