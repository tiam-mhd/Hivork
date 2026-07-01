import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../errors/application.error.js';
import { buildDataScopeFilter, resolveEffectiveBranchIds } from './build-data-scope-filter.js';

const baseCtx = {
  staffId: 'staff-1',
  assignedBranchIds: ['branch-1', 'branch-2'],
  activeBranchId: null as string | null,
};

describe('buildDataScopeFilter', () => {
  it('returns no filter for dataScope=all', () => {
    expect(
      buildDataScopeFilter({
        ...baseCtx,
        dataScope: 'all',
      }),
    ).toEqual({});
  });

  it('returns branchId filter for branch-scoped staff', () => {
    expect(
      buildDataScopeFilter({
        ...baseCtx,
        dataScope: 'branch',
      }),
    ).toEqual({
      branchId: { in: ['branch-1', 'branch-2'] },
    });
  });

  it('narrows branch filter to active branch only', () => {
    expect(
      buildDataScopeFilter({
        ...baseCtx,
        dataScope: 'branch',
        activeBranchId: 'branch-2',
      }),
    ).toEqual({
      branchId: { in: ['branch-2'] },
    });
  });

  it('returns createdById filter for own scope', () => {
    expect(
      buildDataScopeFilter({
        ...baseCtx,
        dataScope: 'own',
      }),
    ).toEqual({
      createdById: 'staff-1',
    });
  });

  it('returns empty branch filter when branch scope has no assignments', () => {
    expect(
      buildDataScopeFilter({
        staffId: 'staff-1',
        dataScope: 'branch',
        assignedBranchIds: [],
        activeBranchId: null,
      }),
    ).toEqual({});
  });
});

describe('resolveEffectiveBranchIds', () => {
  it('throws BRANCH_NOT_ALLOWED when active branch is outside assignment', () => {
    try {
      resolveEffectiveBranchIds({
        staffId: 'staff-1',
        dataScope: 'branch',
        assignedBranchIds: ['branch-1'],
        activeBranchId: 'branch-2',
      });
      expect.fail('expected ApplicationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect(error).toMatchObject({
        code: 'BRANCH_NOT_ALLOWED',
        httpStatus: 403,
      });
    }
  });

  it('allows active branch when assignment list is empty', () => {
    expect(
      resolveEffectiveBranchIds({
        staffId: 'staff-1',
        dataScope: 'branch',
        assignedBranchIds: [],
        activeBranchId: 'branch-9',
      }),
    ).toEqual(['branch-9']);
  });
});
