import { describe, expect, it, vi, beforeEach } from 'vitest';

import { TerminateContractUseCase } from './terminate-contract.use-case.js';
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

describe('TerminateContractUseCase (IFP-062)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = {
    findById: vi.fn(),
    terminate: vi.fn(),
  };
  const installments = {
    findBySaleId: vi.fn(),
  };
  const contractVersions = {
    appendVersion: vi.fn(),
    findLatestVersionNumber: vi.fn(),
  };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const audit = { log: vi.fn() };

  const useCase = new TerminateContractUseCase(
    unitOfWork,
    sales,
    installments,
    contractVersions,
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
    reason: 'فسخ توافقی',
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
      status: 'PAID' as const,
      paidAt: new Date(),
      confirmedByStaffId: 'staff-1',
      waivedByStaffId: null,
      waiveReason: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findById.mockResolvedValue(enterpriseSaleRecord());
    installments.findBySaleId.mockResolvedValue(installmentRows);
    contractVersions.findLatestVersionNumber.mockResolvedValue(0);
    sales.terminate.mockImplementation(async (input) =>
      enterpriseSaleRecord({
        status: 'TERMINATED',
        version: input.version + 1,
        terminatedAt: input.terminatedAt,
        terminatedById: input.terminatedById,
        terminateReason: input.terminateReason,
      }),
    );
  });

  it('terminates active sale with paid installments', async () => {
    const result = await useCase.execute({
      ...baseInput,
      effectiveDate: '2026-08-01',
    });

    expect(result.status).toBe('terminated');
    expect(result.terminatedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(sales.terminate).toHaveBeenCalledWith(
      expect.objectContaining({
        terminateReason: 'فسخ توافقی',
        terminatedById: 'staff-1',
      }),
      expect.anything(),
    );
    expect(contractVersions.appendVersion).toHaveBeenCalledWith(
      expect.objectContaining({ changeType: 'TERMINATE' }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.terminate', entityId: 'sale-1' }),
      expect.anything(),
    );
  });

  it('rejects cancelled sale with INVALID_STATUS_TRANSITION', async () => {
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({ status: 'CANCELLED', cancelledAt: new Date() }),
    );

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      httpStatus: 409,
    });
  });

  it('rejects already terminated sale', async () => {
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({
        status: 'TERMINATED',
        terminatedAt: new Date('2026-07-01T00:00:00.000Z'),
        terminateReason: 'قبلاً فسخ شده',
      }),
    );

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_ALREADY_TERMINATED',
      httpStatus: 409,
    });
  });

  it('rejects archived sale', async () => {
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({
        status: 'ARCHIVED',
        archivedAt: new Date('2026-07-01T00:00:00.000Z'),
      }),
    );

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'SALE_ARCHIVED_READONLY',
      httpStatus: 409,
    });
  });

  it('rejects short reason', async () => {
    await expect(useCase.execute({ ...baseInput, reason: 'ab' })).rejects.toMatchObject({
      code: 'FIELD_REQUIRED',
      httpStatus: 400,
    });
  });
});
