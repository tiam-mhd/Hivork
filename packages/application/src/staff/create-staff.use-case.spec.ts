import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateStaffUseCase } from './create-staff.use-case.js';

describe('CreateStaffUseCase', () => {
  const staff = {
    findActiveByUserInTenant: vi.fn(),
    countActive: vi.fn(),
    create: vi.fn(),
  };
  const users = {
    findOrCreateByPhone: vi.fn(),
  };
  const branches = { existsActiveInTenant: vi.fn() };
  const tenantPlans = { getMaxStaff: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new CreateStaffUseCase(
    staff as never,
    users as never,
    branches as never,
    tenantPlans as never,
    audit,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    tenantPlans.getMaxStaff.mockResolvedValue(10);
    staff.countActive.mockResolvedValue(1);
    users.findOrCreateByPhone.mockResolvedValue({
      id: 'user-2',
      phone: '09121234567',
      name: 'کارمند جدید',
      status: 'active',
    });
    staff.findActiveByUserInTenant.mockResolvedValue(null);
    branches.existsActiveInTenant.mockResolvedValue(true);
    staff.create.mockResolvedValue({
      id: 'staff-2',
      tenantId: 'tenant-1',
      userId: 'user-2',
      phone: '09121234567',
      name: 'کارمند جدید',
      status: 'active',
      dataScope: 'all',
      assignedBranchIds: [],
      primaryBranchId: null,
    });
  });

  it('creates staff and audits', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      phone: '09121234567',
      name: 'کارمند جدید',
      dataScope: 'all',
    });

    expect(result.name).toBe('کارمند جدید');
    expect(staff.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'staff.create', entityType: 'staff' }),
    );
  });

  it('rejects duplicate membership per tenant', async () => {
    staff.findActiveByUserInTenant.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        phone: '09121234567',
        name: 'کارمند',
        dataScope: 'all',
      }),
    ).rejects.toMatchObject({ code: 'STAFF_PHONE_DUPLICATE', httpStatus: 409 });
  });

  it('rejects when plan staff limit is reached', async () => {
    tenantPlans.getMaxStaff.mockResolvedValue(2);
    staff.countActive.mockResolvedValue(2);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        phone: '09129876543',
        name: 'کارمند',
        dataScope: 'all',
      }),
    ).rejects.toMatchObject({ code: 'TENANT_PLAN_LIMIT_EXCEEDED', httpStatus: 403 });
  });

  it('rejects branch data scope without assigned branches', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        phone: '09129876543',
        name: 'کارمند',
        dataScope: 'branch',
        assignedBranchIds: [],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 400 });
  });
});
