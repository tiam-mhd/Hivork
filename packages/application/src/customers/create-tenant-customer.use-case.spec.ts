import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CreateTenantCustomerUseCase } from './create-tenant-customer.use-case.js';

describe('CreateTenantCustomerUseCase', () => {
  const users = {
    findOrCreateByPhone: vi.fn(),
  };
  const globalCustomers = {
    findByPhoneIncludingDeleted: vi.fn(),
    createWithProfile: vi.fn(),
    updateProfile: vi.fn(),
    restoreById: vi.fn(),
  };
  const tenantCustomers = {
    findLinkByGlobalCustomerId: vi.fn(),
    countActive: vi.fn(),
    createLink: vi.fn(),
    restoreLinkAndUpdate: vi.fn(),
  };
  const branches = { existsActiveInTenant: vi.fn() };
  const tenantPlans = { getMaxCustomers: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new CreateTenantCustomerUseCase(
    users as never,
    globalCustomers as never,
    tenantCustomers as never,
    branches as never,
    tenantPlans as never,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const baseInput = {
    tenantId: 'tenant-1',
    actorId: 'staff-1',
    phone: '09123456789',
    name: 'علی',
    staffContext,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    users.findOrCreateByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: 'علی',
      status: 'active',
    });
  });

  const globalCustomer = {
    id: 'global-1',
    userId: 'user-1',
    phone: '09123456789',
    name: 'علی',
    status: 'active' as const,
    email: null,
    nationalId: null,
    birthDate: null,
    gender: null,
    address: null,
    preferredContactChannel: null,
    marketingOptIn: false,
    deletedAt: null,
  };

  const tenantCustomer = {
    id: 'tc-1',
    tenantId: 'tenant-1',
    globalCustomerId: 'global-1',
    localCode: null,
    notes: null,
    defaultBranchId: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 1,
    tags: [],
    internalNotes: null,
    preferredContactChannel: null,
    marketingOptIn: null,
    creditScore: 100,
    overdueCount: 0,
    totalPurchaseRial: 0n,
    lastPurchaseAt: null,
    createdAt: new Date('2026-01-01'),
    createdById: 'staff-1',
  };

  it('creates global and tenant customer link', async () => {
    users.findOrCreateByPhone.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      name: 'علی',
      status: 'active',
    });
    globalCustomers.findByPhoneIncludingDeleted.mockResolvedValue(null);
    globalCustomers.createWithProfile.mockResolvedValue(globalCustomer);
    tenantCustomers.findLinkByGlobalCustomerId.mockResolvedValue(null);
    tenantPlans.getMaxCustomers.mockResolvedValue(500);
    tenantCustomers.countActive.mockResolvedValue(1);
    tenantCustomers.createLink.mockResolvedValue(tenantCustomer);

    const result = await useCase.execute(baseInput);

    expect(result).toMatchObject({
      customer: { id: 'tc-1' },
      globalCustomer: { id: 'global-1' },
      restored: false,
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.create', entityType: 'tenant_customer' }),
    );
  });

  it('rejects duplicate active tenant link', async () => {
    globalCustomers.findByPhoneIncludingDeleted.mockResolvedValue(globalCustomer);
    globalCustomers.updateProfile.mockResolvedValue(globalCustomer);
    tenantCustomers.findLinkByGlobalCustomerId.mockResolvedValue(tenantCustomer);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'CUSTOMER_EXISTS',
      httpStatus: 409,
    });
  });

  it('restores soft-deleted tenant link', async () => {
    globalCustomers.findByPhoneIncludingDeleted.mockResolvedValue(globalCustomer);
    globalCustomers.updateProfile.mockResolvedValue(globalCustomer);
    tenantCustomers.findLinkByGlobalCustomerId.mockResolvedValue({
      ...tenantCustomer,
      deletedAt: new Date(),
    });
    tenantCustomers.restoreLinkAndUpdate.mockResolvedValue({
      ...tenantCustomer,
      deletedAt: null,
    });

    const result = await useCase.execute(baseInput);

    expect(result.restored).toBe(true);
    expect(tenantCustomers.restoreLinkAndUpdate).toHaveBeenCalled();
    expect(tenantCustomers.countActive).not.toHaveBeenCalled();
  });

  it('rejects when plan customer limit reached', async () => {
    globalCustomers.findByPhoneIncludingDeleted.mockResolvedValue(null);
    globalCustomers.createWithProfile.mockResolvedValue(globalCustomer);
    tenantCustomers.findLinkByGlobalCustomerId.mockResolvedValue(null);
    tenantPlans.getMaxCustomers.mockResolvedValue(10);
    tenantCustomers.countActive.mockResolvedValue(10);

    await expect(useCase.execute(baseInput)).rejects.toMatchObject({
      code: 'PLAN_LIMIT',
      httpStatus: 403,
    });
  });

  it('rejects invalid branch', async () => {
    branches.existsActiveInTenant.mockResolvedValue(false);

    await expect(
      useCase.execute({ ...baseInput, defaultBranchId: '00000000-0000-0000-0000-000000000099' }),
    ).rejects.toMatchObject({
      code: 'INVALID_BRANCH',
      httpStatus: 400,
    });
  });
});
