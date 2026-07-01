import type { RoleResponseDto } from '@hivork/contracts/core';
import { describe, expect, it } from 'vitest';

import {
  formValuesToCreateDto,
  normalizeStaffPhoneInput,
  validateStaffForm,
} from './staff-form.schema';
import {
  canDeleteStaff,
  isStaffOwner,
  rolesByIdMap,
} from './staff.utils';

const roles: RoleResponseDto[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'owner',
    name: 'مالک',
    isSystem: true,
    permissions: [],
    dataScope: 'all',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'cashier',
    name: 'صندوقدار',
    isSystem: true,
    permissions: [],
    dataScope: 'branch',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('normalizeStaffPhoneInput', () => {
  it('normalizes 912... to 0912...', () => {
    expect(normalizeStaffPhoneInput('9121234567')).toBe('09121234567');
  });
});

describe('validateStaffForm', () => {
  it('requires branch for branch-scoped role', () => {
    const errors = validateStaffForm(
      {
        phone: '09121234567',
        name: 'رضا',
        roleId: roles[1]!.id,
        assignedBranchIds: [],
        status: 'active',
      },
      { mode: 'create', roles },
    );

    expect(errors.assignedBranchIds).toBeTruthy();
  });
});

describe('formValuesToCreateDto', () => {
  it('builds POST payload with role and branches', () => {
    const branchId = '33333333-3333-4333-8333-333333333333';
    const dto = formValuesToCreateDto({
      phone: '09129876543',
      name: 'رضا کریمی',
      roleId: roles[1]!.id,
      assignedBranchIds: [branchId],
      status: 'active',
    });

    expect(dto.phone).toBe('09129876543');
    expect(dto.dataScope).toBe('branch');
    expect(dto.roleIds).toEqual([roles[1]!.id]);
    expect(dto.assignedBranchIds).toEqual([branchId]);
  });
});

describe('canDeleteStaff', () => {
  const rolesMap = rolesByIdMap(roles);

  it('disables delete for owner row', () => {
    expect(
      canDeleteStaff(
        'staff-1',
        [roles[0]!.id],
        rolesMap,
        'current-staff',
      ),
    ).toBe(false);
  });

  it('disables delete for current user', () => {
    expect(
      canDeleteStaff(
        'current-staff',
        [roles[1]!.id],
        rolesMap,
        'current-staff',
      ),
    ).toBe(false);
  });
});

describe('isStaffOwner', () => {
  it('detects owner role', () => {
    expect(isStaffOwner([roles[0]!.id], rolesByIdMap(roles))).toBe(true);
  });
});
