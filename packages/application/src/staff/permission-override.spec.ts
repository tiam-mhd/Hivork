import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreatePermissionOverrideUseCase } from './create-permission-override.use-case.js';
import { DeletePermissionOverrideUseCase } from './delete-permission-override.use-case.js';

describe('CreatePermissionOverrideUseCase', () => {
  const staff = {
    findActiveByIdForTenant: vi.fn(),
    findDeletedByIdForTenant: vi.fn(),
    isOwner: vi.fn(),
  };
  const overrides = {
    findActiveByStaffAndPermission: vi.fn(),
    create: vi.fn(),
  };
  const staffPermissions = { findPermissionSourcesByStaffId: vi.fn() };
  const permissionRegistry = { resolvePermissionIds: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new CreatePermissionOverrideUseCase(
    staff as never,
    overrides as never,
    staffPermissions as never,
    permissionRegistry as never,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    staff.isOwner.mockImplementation(async (id: string) => id === 'staff-1');
    staff.findActiveByIdForTenant.mockResolvedValue({
      id: 'staff-2',
      assignedBranchIds: [],
      primaryBranchId: null,
    });
    permissionRegistry.resolvePermissionIds.mockResolvedValue(
      new Map([['installments.sale.cancel', 'perm-1']]),
    );
    overrides.findActiveByStaffAndPermission.mockResolvedValue(null);
    overrides.create.mockResolvedValue({
      id: 'override-1',
      staffId: 'staff-2',
      permission: 'installments.sale.cancel',
      effect: 'grant',
      reason: 'جایگزین موقت مدیر',
      expiresAt: null,
      createdById: 'staff-1',
      createdAt: new Date(),
    });
  });

  it('creates override and audits', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffId: 'staff-2',
      permission: 'installments.sale.cancel',
      effect: 'grant',
      reason: 'جایگزین موقت مدیر',
      staffContext,
    });

    expect(result.permission).toBe('installments.sale.cancel');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'permission.override.create' }),
    );
  });

  it('rejects missing reason', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-2',
        permission: 'installments.sale.cancel',
        effect: 'grant',
        reason: 'abc',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'FIELD_REQUIRED', httpStatus: 400 });
  });

  it('rejects duplicate override', async () => {
    overrides.findActiveByStaffAndPermission.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-2',
        permission: 'installments.sale.cancel',
        effect: 'grant',
        reason: 'جایگزین موقت مدیر',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'OVERRIDE_ALREADY_EXISTS', httpStatus: 409 });
  });

  it('rejects deny override on owner', async () => {
    staff.findActiveByIdForTenant.mockResolvedValue({
      id: 'staff-owner',
      assignedBranchIds: [],
      primaryBranchId: null,
    });
    staff.isOwner.mockImplementation(async (id: string) => id === 'staff-1' || id === 'staff-owner');

    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        actorId: 'staff-1',
        staffId: 'staff-owner',
        permission: 'installments.sale.cancel',
        effect: 'deny',
        reason: 'محدودیت موقت',
        staffContext,
      }),
    ).rejects.toMatchObject({ code: 'DELETE_FORBIDDEN', httpStatus: 409 });
  });
});

describe('DeletePermissionOverrideUseCase', () => {
  const staff = {
    findActiveByIdForTenant: vi.fn(),
    findDeletedByIdForTenant: vi.fn(),
    isOwner: vi.fn(),
  };
  const overrides = {
    findActiveByIdForStaff: vi.fn(),
    softDelete: vi.fn(),
  };
  const staffPermissions = { findPermissionSourcesByStaffId: vi.fn() };
  const audit = { log: vi.fn() };

  const useCase = new DeletePermissionOverrideUseCase(
    staff as never,
    overrides as never,
    staffPermissions as never,
    audit,
  );

  const staffContext = {
    staffId: 'staff-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    activeBranchId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    staff.isOwner.mockResolvedValue(true);
    staff.findActiveByIdForTenant.mockResolvedValue({
      id: 'staff-2',
      assignedBranchIds: [],
      primaryBranchId: null,
    });
    overrides.findActiveByIdForStaff.mockResolvedValue({
      id: 'override-1',
      permission: 'installments.sale.cancel',
      effect: 'grant',
      reason: 'جایگزین موقت',
      expiresAt: null,
    });
    overrides.softDelete.mockResolvedValue({
      id: 'override-1',
      permission: 'installments.sale.cancel',
      effect: 'grant',
      reason: 'جایگزین موقت',
      expiresAt: null,
    });
  });

  it('removes override and audits', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      actorId: 'staff-1',
      staffId: 'staff-2',
      overrideId: 'override-1',
      staffContext,
    });

    expect(result.removed).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'permission.override.remove' }),
    );
  });
});
