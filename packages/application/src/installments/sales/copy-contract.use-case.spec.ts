import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CopyContractUseCase } from './copy-contract.use-case.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';

function enterpriseSaleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    id: 'source-sale-1',
    tenantId: 'tenant-1',
    branchId: 'branch-1',
    tenantCustomerId: '00000000-0000-0000-0000-000000000001',
    createdByStaffId: 'staff-1',
    title: 'قرارداد مبدا',
    description: null,
    invoiceNumber: null,
    contractNumber: 'CTR-2026-000001',
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
    insuranceRial: 500_000n,
    insuranceProvider: 'بیمه ایران',
    insurancePolicyNumber: null,
    insuranceExpiresAt: null,
    totalAmountRial: 10_000_000n,
    downPaymentRial: 0n,
    discountRial: null,
    taxRial: 100_000n,
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
    metadata: {
      lineItems: [{ id: 'line-1', description: 'کالا', amountRial: '10000000' }],
      guarantors: [{ id: 'g-1', name: 'ضامن' }],
    },
    version: 1,
    createdAt: new Date('2026-06-29T10:00:00.000Z'),
    updatedAt: new Date('2026-06-29T10:00:00.000Z'),
    ...overrides,
  };
}

describe('CopyContractUseCase (IFP-061)', () => {
  const unitOfWork = {
    transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
  };
  const sales = {
    findById: vi.fn(),
    save: vi.fn(),
    countActive: vi.fn().mockResolvedValue(0),
  };
  const installments = {
    findBySaleId: vi.fn(),
    saveMany: vi.fn(),
  };
  const contractVersions = {
    appendVersion: vi.fn(),
    findLatestVersionNumber: vi.fn(),
  };
  const contractAttachments = {
    listBySale: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  };
  const copyRelated = {
    listLineItems: vi.fn(),
    listGuarantors: vi.fn(),
    copyLineItemsToSale: vi.fn(),
    copyGuarantorsToSale: vi.fn(),
  };
  const contractNumbers = { allocate: vi.fn().mockResolvedValue('CTR-2026-000099') };
  const tenantCustomers = {
    findDetailById: vi.fn().mockResolvedValue({ isBlacklisted: false }),
  };
  const branches = { existsActiveInTenant: vi.fn().mockResolvedValue(true) };
  const tenantPlans = { getMaxActiveSales: vi.fn().mockResolvedValue(1000) };
  const audit = { log: vi.fn() };
  const outbox = { publish: vi.fn() };

  const useCase = new CopyContractUseCase(
    unitOfWork,
    sales,
    installments,
    contractVersions,
    contractAttachments,
    copyRelated,
    contractNumbers,
    tenantCustomers,
    branches,
    tenantPlans,
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
    staffId: 'staff-1',
    branchId: 'branch-1',
    sourceSaleId: 'source-sale-1',
    contractDate: '2026-09-01',
    firstDueDate: '2026-10-01',
    reason: 'کپی برای مشتری جدید',
    staffContext,
  };

  const sourceInstallments = [
    {
      id: 'inst-1',
      saleId: 'source-sale-1',
      tenantId: 'tenant-1',
      sequenceNumber: 1,
      dueDate: new Date('2026-08-01T12:00:00.000Z'),
      amountRial: 5_000_000n,
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
      saleId: 'source-sale-1',
      tenantId: 'tenant-1',
      sequenceNumber: 2,
      dueDate: new Date('2026-09-01T12:00:00.000Z'),
      amountRial: 5_000_000n,
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
    sales.findById.mockImplementation(async (_tenantId, saleId) => {
      if (saleId === 'source-sale-1') {
        return enterpriseSaleRecord();
      }
      return enterpriseSaleRecord({
        id: 'new-sale-1',
        contractNumber: 'CTR-2026-000099',
        copiedFromSaleId: 'source-sale-1',
      });
    });
    installments.findBySaleId.mockResolvedValue(sourceInstallments);
    installments.saveMany.mockImplementation(async (rows) =>
      rows.map((row: { id: string; sequenceNumber: number; dueDate: Date; amountRial: bigint; status: string }) => ({
        ...row,
        saleId: 'new-sale-1',
        tenantId: 'tenant-1',
        paidAt: null,
        confirmedByStaffId: null,
        waivedByStaffId: null,
        waiveReason: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
    sales.save.mockImplementation(async (input) =>
      enterpriseSaleRecord({
        id: input.id,
        contractNumber: input.contractNumber ?? null,
        copiedFromSaleId: input.copiedFromSaleId ?? null,
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        contractDate: input.contractDate,
      }),
    );
    contractVersions.findLatestVersionNumber.mockResolvedValue(1);
    copyRelated.listLineItems.mockResolvedValue([
      { id: 'line-1', description: 'کالا', amountRial: '10000000' },
    ]);
    copyRelated.listGuarantors.mockResolvedValue([{ id: 'g-1', name: 'ضامن' }]);
  });

  it('copies sale with copiedFromSaleId and new contract number', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.contractNumber).toBe('CTR-2026-000099');
    expect(result.sale.copiedFromSaleId).toBe('source-sale-1');
    expect(sales.save).toHaveBeenCalledWith(
      expect.objectContaining({
        copiedFromSaleId: 'source-sale-1',
        contractNumber: 'CTR-2026-000099',
        status: 'ACTIVE',
      }),
      expect.anything(),
    );
    expect(contractVersions.appendVersion).toHaveBeenCalledWith(
      expect.objectContaining({ changeType: 'COPY_SOURCE', saleId: 'source-sale-1' }),
      expect.anything(),
    );
    expect(contractVersions.appendVersion).toHaveBeenCalledWith(
      expect.objectContaining({ changeType: 'CREATE', versionNumber: 1 }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.copy', entityId: 'source-sale-1' }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'sale.create' }),
      expect.anything(),
    );
  });

  it('regenerates installments — does not copy source payment statuses', async () => {
    await useCase.execute(baseInput);

    expect(installments.saveMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ status: 'PENDING' }),
      ]),
      expect.anything(),
    );
    const savedStatuses = installments.saveMany.mock.calls[0]?.[0]?.map(
      (row: { status: string }) => row.status,
    );
    expect(savedStatuses).not.toContain('PAID');
  });

  it('copies guarantors when copyGuarantors is true', async () => {
    await useCase.execute({ ...baseInput, copyGuarantors: true });

    expect(copyRelated.copyGuarantorsToSale).toHaveBeenCalled();
  });

  it('skips guarantors when copyGuarantors is false', async () => {
    await useCase.execute({ ...baseInput, copyGuarantors: false });

    expect(copyRelated.copyGuarantorsToSale).not.toHaveBeenCalled();
  });

  it('copies attachments when copyAttachments is true', async () => {
    contractAttachments.listBySale.mockResolvedValue([
      {
        id: 'att-1',
        tenantId: 'tenant-1',
        saleId: 'source-sale-1',
        fileId: '00000000-0000-0000-0000-000000000050',
        attachmentType: 'CONTRACT_SCAN',
        label: 'scan',
        description: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'staff-1',
        updatedById: null,
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        version: 1,
        metadata: null,
      },
    ]);

    await useCase.execute({ ...baseInput, copyAttachments: true });

    expect(contractAttachments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: '00000000-0000-0000-0000-000000000050',
        attachmentType: 'CONTRACT_SCAN',
      }),
      expect.anything(),
    );
  });

  it('rejects archived source sale', async () => {
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

  it('returns CUSTOMER_NOT_FOUND for invalid customer override', async () => {
    tenantCustomers.findDetailById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        ...baseInput,
        tenantCustomerId: '00000000-0000-0000-0000-000000000099',
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
