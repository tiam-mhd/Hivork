import { ApplicationError } from '@hivork/application';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { RolesController } from './roles.controller.js';

describe('RolesController', () => {
  const createRole = { execute: vi.fn() };
  const listRoles = { execute: vi.fn() };
  const getRole = { execute: vi.fn() };
  const updateRole = { execute: vi.fn() };
  const softDeleteRole = { execute: vi.fn() };

  const controller = new RolesController(
    createRole as never,
    listRoles as never,
    getRole as never,
    updateRole as never,
    softDeleteRole as never,
  );

  const ownerStaff = {
    id: '00000000-0000-4000-8000-000000000010',
    tenantId: 'tenant-1',
    dataScope: 'all' as const,
    assignedBranchIds: [],
    primaryBranchId: null,
    activeBranchId: null,
  };

  const roleRecord = {
    id: '00000000-0000-4000-8000-000000000020',
    code: 'accountant',
    name: 'حسابدار',
    isSystem: false,
    permissions: ['installments.report.dashboard'],
    dataScope: 'all' as const,
    version: 1,
    createdAt: new Date('2025-01-01T08:00:00.000Z'),
    updatedAt: new Date('2025-01-01T08:00:00.000Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists roles with mapped response', async () => {
    listRoles.execute.mockResolvedValue({
      data: [roleRecord],
    });

    const result = await controller.list(ownerStaff);

    expect(result.data[0]?.code).toBe('accountant');
    expect(result.data[0]?.permissions).toContain('installments.report.dashboard');
  });

  it('creates a custom role', async () => {
    createRole.execute.mockResolvedValue(roleRecord);

    const result = await controller.create(
      ownerStaff,
      {
        code: 'accountant',
        name: 'حسابدار',
        permissions: ['installments.report.dashboard'],
        dataScope: 'all',
      },
      { ip: '127.0.0.1', headers: {} } as never,
    );

    expect(result.name).toBe('حسابدار');
    expect(createRole.execute).toHaveBeenCalled();
  });

  it('maps ROLE_IS_SYSTEM when updating owner role', async () => {
    updateRole.execute.mockRejectedValue(
      new ApplicationError('ROLE_IS_SYSTEM', 'System roles cannot be modified.', 409),
    );

    await expect(
      controller.update(
        ownerStaff,
        '00000000-0000-4000-8000-000000000099',
        { name: 'مالک جدید' },
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({
      response: { code: 'ROLE_IS_SYSTEM' },
    });
  });

  it('maps PERMISSION_DENIED when non-owner creates role', async () => {
    createRole.execute.mockRejectedValue(
      new ApplicationError(
        'PERMISSION_DENIED',
        'You do not have permission to manage roles.',
        403,
      ),
    );

    await expect(
      controller.create(
        ownerStaff,
        {
          code: 'custom_role',
          name: 'نقش سفارشی',
          permissions: ['core.branch.view'],
          dataScope: 'branch',
        },
        { ip: '127.0.0.1', headers: {} } as never,
      ),
    ).rejects.toMatchObject({
      response: { code: 'PERMISSION_DENIED' },
    });
  });
});
