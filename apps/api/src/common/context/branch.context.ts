import type { StaffContext } from '../types/auth-context.js';

export interface BranchContext {
  activeBranchId: string | null;
  primaryBranchId: string | null;
  effectiveBranchIds: string[];
}

export function resolveEffectiveBranchIds(params: {
  assignedBranchIds: string[];
  activeBranchId: string | null;
}): string[] {
  if (params.activeBranchId) {
    return [params.activeBranchId];
  }

  return params.assignedBranchIds;
}

export function buildBranchContext(staff: StaffContext): BranchContext {
  return {
    activeBranchId: staff.activeBranchId,
    primaryBranchId: staff.primaryBranchId,
    effectiveBranchIds: resolveEffectiveBranchIds({
      assignedBranchIds: staff.assignedBranchIds,
      activeBranchId: staff.activeBranchId,
    }),
  };
}
