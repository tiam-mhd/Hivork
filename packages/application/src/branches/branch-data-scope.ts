import { ApplicationError } from '../errors/application.error.js';
import type { BranchListScope } from '../ports/branch.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';

export function buildBranchListScope(staffContext: DataScopeStaffContext): BranchListScope {
  switch (staffContext.dataScope) {
    case 'all':
      return { dataScope: 'all' };
    case 'branch':
    case 'own':
      return {
        dataScope: staffContext.dataScope,
        branchIds: resolveEffectiveBranchIds(staffContext),
      };
  }
}

export function assertBranchInScope(
  branchId: string,
  staffContext: DataScopeStaffContext,
): void {
  if (staffContext.dataScope === 'all') {
    return;
  }

  const effective = resolveEffectiveBranchIds(staffContext);
  if (!effective.includes(branchId)) {
    throw new ApplicationError('BRANCH_NOT_FOUND', 'Branch was not found for this tenant.', 404);
  }
}
