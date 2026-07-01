import { describe, expect, it, vi } from 'vitest';

import { GetCurrentStaffMeUseCase } from './get-current-staff-me.use-case.js';

describe('GetCurrentStaffMeUseCase', () => {
  it('returns staff profile with sorted permissions', async () => {
    const staff = {
      id: 'staff-1',
      tenantId: 'tenant-1',
      phone: '09120000000',
      name: 'Owner',
      status: 'active' as const,
      dataScope: 'all' as const,
      assignedBranchIds: [],
      primaryBranchId: null,
      lastLoginAt: null,
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
      version: 1,
      email: null,
      jobTitle: null,
      invitedAt: null,
      invitedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      updatedById: null,
      roleIds: [],
    };

    const staffRepository = {
      findActiveByIdForTenant: vi.fn().mockResolvedValue(staff),
    };
    const getStaffPermissions = {
      execute: vi.fn().mockResolvedValue(new Set(['installments.sale.view', 'core.staff.view'])),
    };

    const useCase = new GetCurrentStaffMeUseCase(staffRepository, getStaffPermissions);
    const result = await useCase.execute({
      staffId: 'staff-1',
      tenantId: 'tenant-1',
      activeBranchId: 'branch-1',
    });

    expect(result.permissions).toEqual(['core.staff.view', 'installments.sale.view']);
    expect(result.activeBranchId).toBe('branch-1');
  });
});
