import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ArchiveContractUseCase } from './archive-contract.use-case.js';
import { CloseContractUseCase } from './close-contract.use-case.js';
import { RestoreSaleUseCase } from './restore-sale.use-case.js';
import { SoftDeleteSaleUseCase } from './soft-delete-sale.use-case.js';
import { UnarchiveContractUseCase } from './unarchive-contract.use-case.js';
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

const staffContext = {
  staffId: 'staff-1',
  dataScope: 'all' as const,
  assignedBranchIds: ['branch-1'],
  activeBranchId: null,
};

const baseBranchInput = {
  tenantId: 'tenant-1',
  staffId: 'staff-1',
  branchId: 'branch-1',
  saleId: 'sale-1',
  staffContext,
};

describe('CloseContractUseCase (IFP-063)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = { findById: vi.fn(), close: vi.fn() };
  const installments = { findBySaleId: vi.fn() };
  const contractVersions = { appendVersion: vi.fn(), findLatestVersionNumber: vi.fn() };
  const closeWaiver = { waiveRemainingOnClose: vi.fn() };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const audit = { log: vi.fn() };

  const useCase = new CloseContractUseCase(
    unitOfWork,
    sales,
    installments,
    contractVersions,
    closeWaiver,
    branches,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({ status: 'TERMINATED', terminatedAt: new Date() }),
    );
    installments.findBySaleId.mockResolvedValue([]);
    contractVersions.findLatestVersionNumber.mockResolvedValue(0);
    sales.close.mockImplementation(async (input) =>
      enterpriseSaleRecord({
        status: 'CLOSED',
        closedAt: input.closedAt,
        closedById: input.closedById,
        closeReason: input.closeReason,
      }),
    );
  });

  it('closes terminated sale and appends CLOSE version', async () => {
    const result = await useCase.execute({
      ...baseBranchInput,
      reason: 'تسویه نهایی',
    });

    expect(result.status).toBe('closed');
    expect(contractVersions.appendVersion).toHaveBeenCalledWith(
      expect.objectContaining({ changeType: 'CLOSE' }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.close' }),
      expect.anything(),
    );
  });

  it('rejects completed sale', async () => {
    sales.findById.mockResolvedValue(enterpriseSaleRecord({ status: 'COMPLETED' }));

    await expect(
      useCase.execute({ ...baseBranchInput, reason: 'تلاش بستن' }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      httpStatus: 409,
    });
  });
});

describe('ArchiveContractUseCase (IFP-063)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = { findById: vi.fn(), archive: vi.fn() };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const audit = { log: vi.fn() };

  const useCase = new ArchiveContractUseCase(unitOfWork, sales, branches, audit);

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findById.mockResolvedValue(enterpriseSaleRecord({ status: 'COMPLETED' }));
    sales.archive.mockImplementation(async (input) =>
      enterpriseSaleRecord({
        status: 'ARCHIVED',
        archivedAt: input.archivedAt,
        archiveReason: input.archiveReason,
        metadata: input.metadata,
      }),
    );
  });

  it('archives completed sale', async () => {
    const result = await useCase.execute({
      ...baseBranchInput,
      reason: 'بایگانی پرونده',
    });

    expect(result.status).toBe('archived');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.archive' }),
      expect.anything(),
    );
  });

  it('rejects active sale', async () => {
    sales.findById.mockResolvedValue(enterpriseSaleRecord({ status: 'ACTIVE' }));

    await expect(
      useCase.execute({ ...baseBranchInput, reason: 'بایگانی زودهنگام' }),
    ).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
      httpStatus: 409,
    });
  });
});

describe('UnarchiveContractUseCase (IFP-063)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = { findById: vi.fn(), unarchive: vi.fn() };
  const installments = { findBySaleId: vi.fn().mockResolvedValue([]) };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const audit = { log: vi.fn() };

  const useCase = new UnarchiveContractUseCase(
    unitOfWork,
    sales,
    installments,
    branches,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({
        status: 'ARCHIVED',
        archivedAt: new Date(),
        metadata: { archivedFromStatus: 'COMPLETED' },
      }),
    );
    sales.unarchive.mockImplementation(async (input) =>
      enterpriseSaleRecord({ status: input.status, metadata: input.metadata }),
    );
  });

  it('unarchives sale to previous status', async () => {
    const result = await useCase.execute(baseBranchInput);

    expect(result.status).toBe('completed');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.unarchive' }),
      expect.anything(),
    );
  });
});

describe('SoftDeleteSaleUseCase (IFP-063)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = { findById: vi.fn(), softDelete: vi.fn() };
  const installments = { findBySaleId: vi.fn() };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const audit = { log: vi.fn() };

  const useCase = new SoftDeleteSaleUseCase(
    unitOfWork,
    sales,
    installments,
    branches,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findById.mockResolvedValue(enterpriseSaleRecord({ status: 'CANCELLED' }));
    installments.findBySaleId.mockResolvedValue([
      {
        id: 'inst-1',
        status: 'PENDING',
      },
    ]);
    sales.softDelete.mockImplementation(async (command) =>
      enterpriseSaleRecord({
        deletedAt: new Date('2026-07-01T00:00:00.000Z'),
        deletedById: command.deletedById,
        deleteReason: command.deleteReason ?? null,
      }),
    );
  });

  it('soft deletes sale with no paid installments', async () => {
    const result = await useCase.execute({
      ...baseBranchInput,
      reason: 'حذف اشتباه',
    });

    expect(result.id).toBe('sale-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.soft_delete' }),
      expect.anything(),
    );
  });

  it('rejects when paid installment exists', async () => {
    installments.findBySaleId.mockResolvedValue([{ id: 'inst-1', status: 'PAID' }]);

    await expect(
      useCase.execute({ ...baseBranchInput, reason: 'حذف غیرمجاز' }),
    ).rejects.toMatchObject({
      code: 'SALE_HAS_PAID_INSTALLMENT',
      httpStatus: 409,
    });
  });

  it('rejects archived sale', async () => {
    sales.findById.mockResolvedValue(
      enterpriseSaleRecord({ status: 'ARCHIVED', archivedAt: new Date() }),
    );

    await expect(
      useCase.execute({ ...baseBranchInput, reason: 'حذف آرشیو' }),
    ).rejects.toMatchObject({
      code: 'SALE_ARCHIVED_READONLY',
      httpStatus: 409,
    });
  });
});

describe('RestoreSaleUseCase (IFP-063)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = {
    findDeletedById: vi.fn(),
    findById: vi.fn(),
    restore: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const useCase = new RestoreSaleUseCase(unitOfWork, sales, audit);

  beforeEach(() => {
    vi.clearAllMocks();
    sales.findDeletedById.mockResolvedValue(
      enterpriseSaleRecord({
        deletedAt: new Date('2026-07-01T00:00:00.000Z'),
        deleteReason: 'حذف تست',
      }),
    );
    sales.restore.mockImplementation(async () =>
      enterpriseSaleRecord({ deletedAt: null, deleteReason: null }),
    );
  });

  it('restores soft-deleted sale', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      staffId: 'staff-1',
      saleId: 'sale-1',
    });

    expect(result.id).toBe('sale-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.restore' }),
      expect.anything(),
    );
  });
});
