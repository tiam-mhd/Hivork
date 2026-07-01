import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GetTenantCustomerUseCase } from './get-tenant-customer.use-case.js';

describe('GetTenantCustomerUseCase', () => {
  const tenantCustomers = {
    findFullDetailById: vi.fn(),
    findDeletedById: vi.fn(),
  };
  const sales = {
    hasSaleForTenantCustomerInBranches: vi.fn(),
    hasSaleForTenantCustomerByStaff: vi.fn(),
    getSalesSummaryForTenantCustomer: vi.fn(),
  };

  const useCase = new GetTenantCustomerUseCase(
    tenantCustomers as never,
    sales as never,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const fullDetail = {
    id: 'tc-1',
    tenantId: 'tenant-1',
    globalCustomerId: 'global-1',
    localCode: 'C-1',
    notes: 'notes',
    defaultBranchId: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 2,
    tags: ['vip'],
    internalNotes: 'internal',
    preferredContactChannel: 'telegram' as const,
    marketingOptIn: true,
    creditScore: 85,
    overdueCount: 1,
    totalPurchaseRial: 15_000_000n,
    lastPurchaseAt: new Date('2025-01-10T00:00:00.000Z'),
    createdAt: new Date('2024-06-01T08:00:00.000Z'),
    createdById: 'staff-1',
    globalCustomer: {
      id: 'global-1',
      phone: '09121234567',
      name: 'حسین',
      email: null,
      nationalId: null,
      birthDate: null,
      gender: 'unspecified' as const,
      address: null,
      status: 'active' as const,
    },
    metadata: { source: 'import' },
    updatedAt: new Date('2025-01-12T10:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tenantCustomers.findFullDetailById.mockResolvedValue(fullDetail);
  });

  it('returns full customer detail', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      tenantCustomerId: 'tc-1',
      staffContext,
    });

    expect(result.globalCustomer.phone).toBe('09121234567');
    expect(result.salesSummary).toBeUndefined();
  });

  it('includes salesSummary when requested', async () => {
    sales.getSalesSummaryForTenantCustomer.mockResolvedValue({
      activeSalesCount: 2,
      completedSalesCount: 3,
      totalOverdueRial: 2_000_000n,
      lastSaleAt: new Date('2025-01-10T00:00:00.000Z'),
    });

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      tenantCustomerId: 'tc-1',
      include: ['salesSummary'],
      staffContext,
    });

    expect(result.salesSummary).toEqual({
      activeSalesCount: 2,
      completedSalesCount: 3,
      totalOverdueRial: 2_000_000n,
      lastSaleAt: new Date('2025-01-10T00:00:00.000Z'),
    });
  });

  it('returns 404 when customer is soft-deleted', async () => {
    tenantCustomers.findFullDetailById.mockResolvedValue(null);
    tenantCustomers.findDeletedById.mockResolvedValue({ id: 'tc-1' });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        tenantCustomerId: 'tc-1',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'RECORD_DELETED', httpStatus: 404 });
  });

  it('returns 404 when customer is out of scope', async () => {
    sales.hasSaleForTenantCustomerInBranches.mockResolvedValue(false);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        tenantCustomerId: 'tc-1',
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'branch',
          assignedBranchIds: ['branch-1'],
          activeBranchId: null,
        },
      }),
    ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND', httpStatus: 404 });
  });

  it('rejects invalid include values', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        tenantCustomerId: 'tc-1',
        include: ['salesSummary', 'unknown' as 'salesSummary'],
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 400 });
  });
});
