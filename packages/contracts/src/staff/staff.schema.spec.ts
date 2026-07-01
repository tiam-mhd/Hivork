import { describe, expect, it } from 'vitest';

import { SetActiveBranchSchema } from './set-active-branch.schema.js';
import { StaffResponseSchema } from './staff-response.schema.js';
import { UpdateStaffSchema } from './update-staff.schema.js';

describe('TASK-052 staff contracts', () => {
  it('validates staff response with active branch session', () => {
    expect(
      StaffResponseSchema.parse({
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: '00000000-0000-0000-0000-000000000002',
        phone: '09123456789',
        name: 'Owner',
        status: 'active',
        dataScope: 'all',
        assignedBranchIds: [],
        primaryBranchId: '00000000-0000-0000-0000-000000000003',
        activeBranchId: '00000000-0000-0000-0000-000000000003',
        lastLoginAt: '2026-06-01T10:00:00.000Z',
      }),
    ).toMatchObject({ activeBranchId: '00000000-0000-0000-0000-000000000003' });
  });

  it('validates set active branch payload', () => {
    expect(
      SetActiveBranchSchema.parse({
        branchId: '00000000-0000-0000-0000-000000000003',
      }),
    ).toEqual({ branchId: '00000000-0000-0000-0000-000000000003' });

    expect(SetActiveBranchSchema.parse({ branchId: null })).toEqual({ branchId: null });
  });

  it('validates partial staff update payload', () => {
    expect(
      UpdateStaffSchema.parse({
        name: 'مدیر جدید',
        dataScope: 'branch',
        assignedBranchIds: ['00000000-0000-0000-0000-000000000003'],
      }),
    ).toMatchObject({ dataScope: 'branch' });
  });
});
