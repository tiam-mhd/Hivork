import { ApplicationError } from '../errors/application.error.js';

export type DataScopeStaffContext = {
  staffId: string;
  dataScope: 'all' | 'branch' | 'own';
  assignedBranchIds: string[];
  activeBranchId: string | null;
};

export type DataScopeFilter = Record<string, unknown>;

export function resolveEffectiveBranchIds(ctx: DataScopeStaffContext): string[] {
  const allowed = ctx.assignedBranchIds;

  if (ctx.activeBranchId) {
    if (allowed.length > 0 && !allowed.includes(ctx.activeBranchId)) {
      throw new ApplicationError(
        'BRANCH_NOT_ALLOWED',
        'Active branch is not assigned to this staff.',
        403,
      );
    }

    return [ctx.activeBranchId];
  }

  return allowed;
}

export function buildDataScopeFilter(ctx: DataScopeStaffContext): DataScopeFilter {
  switch (ctx.dataScope) {
    case 'all':
      return {};
    case 'branch': {
      const effective = resolveEffectiveBranchIds(ctx);
      return effective.length > 0 ? { branchId: { in: effective } } : {};
    }
    case 'own':
      return { createdById: ctx.staffId };
  }
}
