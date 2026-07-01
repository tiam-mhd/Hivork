import { ApplicationError } from '@hivork/application';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { StaffController } from './staff.controller.js';

describe('StaffController', () => {
  const createStaff = { execute: vi.fn() };
  const listStaff = { execute: vi.fn() };
  const getStaff = { execute: vi.fn() };
  const updateStaff = { execute: vi.fn() };
  const softDeleteStaff = { execute: vi.fn() };
  const assignRole = { execute: vi.fn() };
  const removeRole = { execute: vi.fn() };
  const listPermissionOverrides = { execute: vi.fn() };
  const createPermissionOverride = { execute: vi.fn() };
  const deletePermissionOverride = { execute: vi.fn() };
  const listRoles = { execute: vi.fn() };
  const getCurrentStaffMe = { execute: vi.fn() };
  const setActiveBranchUseCase = { execute: vi.fn() };
  const appConfig = { jwtRefreshTtlSeconds: 2_592_000 };

  const controller = new StaffController(
    createStaff as never,
    listStaff as never,
    getStaff as never,
    getCurrentStaffMe as never,
    updateStaff as never,
    softDeleteStaff as never,
    assignRole as never,
    removeRole as never,
    listPermissionOverrides as never,
    createPermissionOverride as never,
    deletePermissionOverride as never,
    listRoles as never,
    setActiveBranchUseCase as never,
    appConfig as never,
  );

  const ownerStaff = {
    id: '00000000-0000-4000-8000-000000000010',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  const staffRecord = {
    id: '00000000-0000-4000-8000-000000000020',
    phone: '09121234567',
    name: 'رضا کریمی',
    email: null,
    jobTitle: 'فروشنده',
    status: 'active' as const,
    dataScope: 'branch' as const,
    assignedBranchIds: ['00000000-0000-4000-8000-000000000001'],
    primaryBranchId: '00000000-0000-4000-8000-000000000001',
    roleIds: ['00000000-0000-4000-8000-000000000030'],
    lastLoginAt: null,
    version: 1,
    createdAt: new Date('2025-01-01T08:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    listRoles.execute.mockResolvedValue({
      data: [
        {
          id: '00000000-0000-4000-8000-000000000030',
          code: 'cashier',
          name: 'صندوقدار',
        },
      ],
    });
  });

  it('lists staff with mapped response', async () => {
    listStaff.execute.mockResolvedValue({
      data: [
        {
          id: staffRecord.id,
          phone: staffRecord.phone,
          name: staffRecord.name,
          email: staffRecord.email,
          jobTitle: staffRecord.jobTitle,
          status: staffRecord.status,
          dataScope: staffRecord.dataScope,
          assignedBranchIds: staffRecord.assignedBranchIds,
          primaryBranchId: staffRecord.primaryBranchId,
          lastLoginAt: staffRecord.lastLoginAt,
          createdAt: staffRecord.createdAt,
        },
      ],
      meta: { total: 1, hasNext: false, nextCursor: null },
    });

    const result = await controller.list(ownerStaff, {});

    expect(result.data[0]?.name).toBe('رضا کریمی');
    expect(result.meta.total).toBe(1);
  });

  it('creates staff and embeds roles', async () => {
    createStaff.execute.mockResolvedValue(staffRecord);

    const result = await controller.create(
      ownerStaff,
      {
        phone: '09121234567',
        name: 'رضا کریمی',
        dataScope: 'branch',
        assignedBranchIds: ['00000000-0000-4000-8000-000000000001'],
        primaryBranchId: '00000000-0000-4000-8000-000000000001',
        roleIds: ['00000000-0000-4000-8000-000000000030'],
      },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result.roles[0]?.code).toBe('cashier');
    expect(createStaff.execute).toHaveBeenCalled();
  });

  it('maps application errors from soft delete', async () => {
    softDeleteStaff.execute.mockRejectedValue(
      new ApplicationError('STAFF_CANNOT_DELETE_SELF', 'You cannot delete your own account.', 409),
    );

    await expect(
      controller.remove(
        ownerStaff,
        ownerStaff.id,
        undefined,
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({
      response: { code: 'STAFF_CANNOT_DELETE_SELF' },
    });
  });

  it('assigns role with 201 when created', async () => {
    const assignedAt = new Date('2025-01-01T08:00:00.000Z');
    assignRole.execute.mockResolvedValue({
      staffId: staffRecord.id,
      roleId: '00000000-0000-4000-8000-000000000030',
      role: { code: 'cashier', name: 'صندوقدار' },
      assignedAt,
      created: true,
    });

    const response = { status: vi.fn() };
    const result = await controller.assignStaffRole(
      ownerStaff,
      staffRecord.id,
      { roleId: '00000000-0000-4000-8000-000000000030' },
      { ip: '127.0.0.1', headers: {} } as never,
      response as never,
    );

    expect(response.status).toHaveBeenCalledWith(201);
    expect(result.role.code).toBe('cashier');
  });

  it('sets active branch for authenticated staff', async () => {
    setActiveBranchUseCase.execute.mockResolvedValue({
      activeBranchId: '00000000-0000-4000-8000-000000000001',
    });

    const result = await controller.setActiveBranch(ownerStaff, {
      branchId: '00000000-0000-4000-8000-000000000001',
    });

    expect(result.activeBranchId).toBe('00000000-0000-4000-8000-000000000001');
    expect(result.expiresIn).toBe(2_592_000);
  });

  it('maps BRANCH_NOT_ALLOWED from active branch', async () => {
    setActiveBranchUseCase.execute.mockRejectedValue(
      new ApplicationError('BRANCH_NOT_ALLOWED', 'Branch is not assigned to this staff.', 403),
    );

    await expect(
      controller.setActiveBranch(ownerStaff, {
        branchId: '00000000-0000-4000-8000-000000000099',
      }),
    ).rejects.toMatchObject({
      response: { code: 'BRANCH_NOT_ALLOWED' },
    });
  });

  it('creates a permission override with mapped response', async () => {
    const createdAt = new Date('2025-01-01T08:00:00.000Z');
    createPermissionOverride.execute.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000040',
      staffId: staffRecord.id,
      permission: 'installments.sale.create',
      effect: 'deny',
      reason: 'محدودیت موقت به دلیل آموزش',
      expiresAt: null,
      createdById: ownerStaff.id,
      createdAt,
    });

    const result = await controller.createStaffPermissionOverride(
      ownerStaff,
      staffRecord.id,
      {
        permission: 'installments.sale.create',
        effect: 'deny',
        reason: 'محدودیت موقت به دلیل آموزش',
      },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result.effect).toBe('deny');
    expect(createPermissionOverride.execute).toHaveBeenCalled();
  });
});
