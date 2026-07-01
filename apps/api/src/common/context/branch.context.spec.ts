import { describe, expect, it } from 'vitest';

import { buildBranchContext, resolveEffectiveBranchIds } from './branch.context.js';

describe('resolveEffectiveBranchIds', () => {
  it('narrows to active branch when set', () => {
    expect(
      resolveEffectiveBranchIds({
        assignedBranchIds: ['branch-1', 'branch-2'],
        activeBranchId: 'branch-2',
      }),
    ).toEqual(['branch-2']);
  });

  it('returns assigned branches when no active branch', () => {
    expect(
      resolveEffectiveBranchIds({
        assignedBranchIds: ['branch-1', 'branch-2'],
        activeBranchId: null,
      }),
    ).toEqual(['branch-1', 'branch-2']);
  });

  it('returns empty list when staff has no branch assignment and no active branch', () => {
    expect(
      resolveEffectiveBranchIds({
        assignedBranchIds: [],
        activeBranchId: null,
      }),
    ).toEqual([]);
  });
});

describe('buildBranchContext', () => {
  it('builds branch context from staff context', () => {
    expect(
      buildBranchContext({
        id: 'staff-1',
        tenantId: 'tenant-1',
        dataScope: 'branch',
        assignedBranchIds: ['branch-1'],
        primaryBranchId: 'branch-1',
        activeBranchId: 'branch-1',
      }),
    ).toEqual({
      activeBranchId: 'branch-1',
      primaryBranchId: 'branch-1',
      effectiveBranchIds: ['branch-1'],
    });
  });
});
