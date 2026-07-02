import { beforeEach, describe, expect, it, vi } from 'vitest';

import { maskCustomerAuditRecord } from './customer-audit-mask.js';
import { UpdateTenantCustomerUseCase } from './update-tenant-customer.use-case.js';

describe('maskCustomerAuditRecord', () => {
  it('masks PII fields in audit diff', () => {
    const masked = maskCustomerAuditRecord({
      nationalId: '1234567890',
      email: 'ali@example.com',
      notes: 'secret note',
      internalNotes: 'internal',
      blacklistReason: 'fraud',
      localCode: 'C-1',
    });

    expect(masked.nationalId).toBe('******7890');
    expect(masked.email).toBe('a***@example.com');
    expect(masked.notes).toBe('[redacted]');
    expect(masked.internalNotes).toBe('[redacted]');
    expect(masked.blacklistReason).toBe('[redacted]');
    expect(masked.localCode).toBe('C-1');
  });
});

describe('UpdateTenantCustomerUseCase', () => {
  const tenantCustomers = {
    findActiveById: vi.fn(),
    findDeletedById: vi.fn(),
    findDetailWithRelationsById: vi.fn(),
    updateLink: vi.fn(),
  };
  const globalCustomers = {
    findById: vi.fn(),
    updateProfile: vi.fn(),
  };
  const addresses = { syncMany: vi.fn() };
  const emergencyContacts = { syncMany: vi.fn() };
  const contactPhones = { syncMany: vi.fn() };
  const categories = { existsActiveInTenant: vi.fn() };
  const staffRepo = { findActiveByIdForTenant: vi.fn() };
  const branches = { existsActiveInTenant: vi.fn() };
  const sales = {
    hasSaleForTenantCustomerInBranches: vi.fn(),
    hasSaleForTenantCustomerByStaff: vi.fn(),
  };
  const unitOfWork = {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({})),
  };
  const audit = { log: vi.fn() };

  const useCase = new UpdateTenantCustomerUseCase(
    tenantCustomers as never,
    globalCustomers as never,
    addresses as never,
    emergencyContacts as never,
    contactPhones as never,
    categories as never,
    staffRepo as never,
    branches as never,
    sales as never,
    unitOfWork as never,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const existing = {
    id: 'tc-1',
    tenantId: 'tenant-1',
    globalCustomerId: 'global-1',
    localCode: 'C-1',
    notes: 'old',
    defaultBranchId: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 2,
  };

  const detail = {
    ...existing,
    tags: ['vip'],
    internalNotes: null,
    preferredContactChannel: null,
    marketingOptIn: null,
    creditScore: 100,
    overdueCount: 0,
    totalPurchaseRial: 0n,
    lastPurchaseAt: null,
    createdAt: new Date('2026-01-01'),
    createdById: 'staff-1',
    categoryId: null,
    status: 'active' as const,
    isBlacklisted: false,
    blacklistReason: null,
    assignedStaffId: null,
    addresses: [],
    emergencyContacts: [],
    contactPhones: [],
  };

  const updatedDetail = {
    ...detail,
    notes: 'new note',
    version: 3,
  };

  const baseInput = {
    tenantId: 'tenant-1',
    actorId: 'staff-1',
    tenantCustomerId: 'tc-1',
    version: 2,
    staffContext,
    canUpdateInternalNotes: true,
    canBlacklist: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    tenantCustomers.findActiveById.mockResolvedValue(existing);
    tenantCustomers.findDetailWithRelationsById
      .mockResolvedValueOnce(detail)
      .mockResolvedValue(updatedDetail);
    tenantCustomers.updateLink.mockResolvedValue(updatedDetail);
    globalCustomers.findById.mockResolvedValue({
      id: 'global-1',
      phone: '09121234567',
      name: 'علی',
      status: 'active',
      userId: 'user-1',
    });
    globalCustomers.updateProfile.mockResolvedValue({});
  });

  it('updates allowed fields and audits customer.update with masked PII', async () => {
    const result = await useCase.execute({
      ...baseInput,
      notes: 'new note',
      name: 'علی جدید',
      nationalId: '1234567890',
    });

    expect(result.notes).toBe('new note');
    expect(globalCustomers.updateProfile).toHaveBeenCalledWith(
      'global-1',
      expect.objectContaining({ name: 'علی جدید', nationalId: '1234567890' }),
    );
    expect(tenantCustomers.updateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tc-1',
        version: 2,
        notes: 'new note',
      }),
      expect.anything(),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'customer.update',
        entityType: 'tenant_customer',
        entityId: 'tc-1',
        newValue: expect.objectContaining({
          nationalId: '******7890',
        }),
      }),
    );
  });

  it('rejects version mismatch with 409', async () => {
    await expect(
      useCase.execute({
        ...baseInput,
        version: 1,
        notes: 'x',
      }),
    ).rejects.toMatchObject({
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      httpStatus: 409,
    });
  });

  it('rejects phone change', async () => {
    await expect(
      useCase.execute({
        ...baseInput,
        phone: '09129998877',
        notes: 'x',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
    });
  });

  it('rejects empty patch', async () => {
    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
    });
  });

  it('returns 404 for soft-deleted customer', async () => {
    tenantCustomers.findActiveById.mockResolvedValue(null);
    tenantCustomers.findDeletedById.mockResolvedValue(existing);

    await expect(
      useCase.execute({
        ...baseInput,
        notes: 'x',
      }),
    ).rejects.toMatchObject({
      code: 'RECORD_DELETED',
      httpStatus: 404,
    });
  });

  it('denies internal notes without permission', async () => {
    await expect(
      useCase.execute({
        ...baseInput,
        canUpdateInternalNotes: false,
        internalNotes: 'secret',
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });

  it('denies blacklist without permission', async () => {
    await expect(
      useCase.execute({
        ...baseInput,
        canBlacklist: false,
        isBlacklisted: true,
        blacklistReason: 'bad payer',
      }),
    ).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
      httpStatus: 403,
    });
  });

  it('rejects archived customer updates', async () => {
    tenantCustomers.findDetailWithRelationsById.mockReset();
    tenantCustomers.findDetailWithRelationsById.mockResolvedValue({
      ...detail,
      status: 'archived',
    });

    await expect(
      useCase.execute({
        ...baseInput,
        notes: 'x',
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_ARCHIVED',
      httpStatus: 409,
    });
  });

  it('returns 404 when branch scope denies access', async () => {
    sales.hasSaleForTenantCustomerInBranches.mockResolvedValue(false);

    await expect(
      useCase.execute({
        ...baseInput,
        staffContext: {
          staffId: 'staff-1',
          dataScope: 'branch',
          assignedBranchIds: ['branch-1'],
          activeBranchId: null,
        },
        notes: 'x',
      }),
    ).rejects.toMatchObject({
      code: 'CUSTOMER_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('syncs nested addresses inside transaction', async () => {
    tenantCustomers.findDetailWithRelationsById.mockReset();
    tenantCustomers.findDetailWithRelationsById
      .mockResolvedValueOnce(detail)
      .mockResolvedValue({
        ...detail,
        addresses: [{ id: 'addr-1', line1: 'خیابان جدید' }],
        version: 3,
      });

    await useCase.execute({
      ...baseInput,
      addresses: [{ line1: 'خیابان جدید', isPrimary: true }],
    });

    expect(addresses.syncMany).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantCustomerId: 'tc-1',
        items: [{ line1: 'خیابان جدید', isPrimary: true }],
      }),
      expect.anything(),
    );
  });
});
