import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SoftDeleteStaffUseCase } from './soft-delete-staff.use-case.js';

describe('SoftDeleteStaffUseCase', () => {
  const staff = {
    findActiveByIdForTenant: vi.fn(),
    findDeletedByIdForTenant: vi.fn(),
    isOwner: vi.fn(),
    softDelete: vi.fn(),
  };
  const audit = { log: vi.fn() };

  const useCase = new SoftDeleteStaffUseCase(staff as never, audit);

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  const activeStaff = {
    id: 'staff-2',
    tenantId: 'tenant-1',
    phone: '09121234567',
    name: 'کارمند',
    status: 'active' as const,
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    staff.findActiveByIdForTenant.mockResolvedValue(activeStaff);
    staff.isOwner.mockResolvedValue(false);
    staff.softDelete.mockResolvedValue({
      id: 'staff-2',
      deletedAt: new Date(),
      deletedById: 'staff-1',
      deleteReason: null,
    });
  });

  it('soft deletes staff and audits', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffId: 'staff-2',
      staffContext,
    });

    expect(result.deletedAt).toBeTruthy();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'staff.delete', entityType: 'staff' }),
    );
  });

  it('rejects deleting self', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-1',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'STAFF_CANNOT_DELETE_SELF', httpStatus: 409 });
  });

  it('rejects deleting owner', async () => {
    staff.isOwner.mockResolvedValue(true);

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-2',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'STAFF_LAST_OWNER', httpStatus: 409 });
  });
});
