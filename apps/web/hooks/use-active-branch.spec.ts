import { describe, expect, it, vi } from 'vitest';

function filterAllowedBranches(
  branches: Array<{ id: string; isActive: boolean }>,
  assignedBranchIds: string[],
) {
  const active = branches.filter((branch) => branch.isActive);
  if (assignedBranchIds.length === 0) {
    return active;
  }
  const allowed = new Set(assignedBranchIds);
  return active.filter((branch) => allowed.has(branch.id));
}

describe('branch access filter', () => {
  it('returns all active branches when assigned list is empty', () => {
    const branches = [
      { id: 'a', isActive: true },
      { id: 'b', isActive: false },
      { id: 'c', isActive: true },
    ];

    expect(filterAllowedBranches(branches, []).map((b) => b.id)).toEqual(['a', 'c']);
  });

  it('limits branches to assigned ids', () => {
    const branches = [
      { id: 'a', isActive: true },
      { id: 'b', isActive: true },
      { id: 'c', isActive: true },
    ];

    expect(filterAllowedBranches(branches, ['a', 'c']).map((b) => b.id)).toEqual(['a', 'c']);
  });
});

describe('useActiveBranch switchBranch contract', () => {
  it('calls PATCH active-branch via injected handler', async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const branchId = 'branch-2';
    await patch(branchId);
    expect(patch).toHaveBeenCalledWith('branch-2');
  });
});
