import { describe, expect, it } from 'vitest';

import { Staff } from './staff.entity.js';

function createStaff(
  overrides: Partial<{
    dataScope: 'all' | 'branch' | 'own';
    assignedBranchIds: string[];
    primaryBranchId: string | null;
    status: 'active' | 'suspended';
  }> = {},
): Staff {
  return new Staff(
    'staff-1',
    'tenant-1',
    'user-1',
    'کارمند',
    overrides.status ?? 'active',
    overrides.dataScope ?? 'all',
    overrides.assignedBranchIds ?? [],
    overrides.primaryBranchId ?? null,
  );
}

describe('Staff', () => {
  describe('canAccessBranch', () => {
    it('allows any branch when dataScope is all and assign is empty', () => {
      const staff = createStaff({ dataScope: 'all', assignedBranchIds: [] });

      expect(staff.canAccessBranch('branch-1')).toBe(true);
      expect(staff.canAccessBranch('branch-2')).toBe(true);
    });

    it('restricts to assigned branches when assign list is non-empty', () => {
      const staff = createStaff({
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
      });

      expect(staff.canAccessBranch('branch-1')).toBe(true);
      expect(staff.canAccessBranch('branch-3')).toBe(false);
    });
  });

  describe('setPrimaryBranch', () => {
    it('clears primary branch with null', () => {
      const staff = createStaff({ assignedBranchIds: ['branch-1'] });
      staff.setPrimaryBranch('branch-1');
      staff.setPrimaryBranch(null);

      expect(staff.primaryBranchId).toBeNull();
    });

    it('rejects primary branch outside assign when assign is non-empty', () => {
      const staff = createStaff({ assignedBranchIds: ['branch-1'] });

      expect(() => staff.setPrimaryBranch('branch-2')).toThrow(
        expect.objectContaining({ code: 'BRANCH_NOT_ALLOWED' }),
      );
    });

    it('allows primary branch when assign is empty (all branches)', () => {
      const staff = createStaff({ assignedBranchIds: [] });
      staff.setPrimaryBranch('branch-9');

      expect(staff.primaryBranchId).toBe('branch-9');
    });
  });

  describe('effectiveBranchIds', () => {
    it('returns empty array when dataScope is not branch', () => {
      const staff = createStaff({ dataScope: 'all', assignedBranchIds: ['branch-1'] });

      expect(staff.effectiveBranchIds('branch-1')).toEqual([]);
    });

    it('narrows to active session branch when allowed', () => {
      const staff = createStaff({
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
      });

      expect(staff.effectiveBranchIds('branch-2')).toEqual(['branch-2']);
    });

    it('throws when active session branch is not allowed', () => {
      const staff = createStaff({
        dataScope: 'branch',
        assignedBranchIds: ['branch-1'],
      });

      expect(() => staff.effectiveBranchIds('branch-2')).toThrow(
        expect.objectContaining({ code: 'BRANCH_NOT_ALLOWED' }),
      );
    });

    it('returns assigned branches when no active session branch', () => {
      const staff = createStaff({
        dataScope: 'branch',
        assignedBranchIds: ['branch-1', 'branch-2'],
      });

      expect(staff.effectiveBranchIds()).toEqual(['branch-1', 'branch-2']);
    });
  });

  it('blocks authentication for suspended or deleted staff', () => {
    const suspended = createStaff();
    suspended.suspend();
    expect(suspended.canAuthenticate).toBe(false);

    const deleted = createStaff();
    deleted.softDelete('admin-1');
    expect(deleted.canAuthenticate).toBe(false);
  });

  it('assignBranches rejects duplicate ids', () => {
    const staff = createStaff();

    expect(() => staff.assignBranches(['branch-1', 'branch-1'])).toThrow(
      expect.objectContaining({ code: 'DUPLICATE_BRANCH_IDS' }),
    );
  });

  it('soft deletes and restores', () => {
    const staff = createStaff();

    staff.softDelete('admin-1');
    expect(staff.isDeleted).toBe(true);

    staff.restore();
    expect(staff.isDeleted).toBe(false);
  });
});
