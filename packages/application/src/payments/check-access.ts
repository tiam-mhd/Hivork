import { ApplicationError } from '../errors/application.error.js';
import type { IBranchReader } from '../ports/branch.reader.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';

export async function assertCheckBranchAccess(
  branches: IBranchReader,
  tenantId: string,
  branchId: string,
  staffContext: DataScopeStaffContext,
): Promise<void> {
  const exists = await branches.existsActiveInTenant(tenantId, branchId);
  if (!exists) {
    throw new ApplicationError(
      'BRANCH_ACCESS_DENIED',
      'Branch is not available for this tenant.',
      403,
    );
  }

  if (staffContext.dataScope === 'all') {
    return;
  }

  const effective = resolveEffectiveBranchIds(staffContext);
  if (effective.length > 0 && !effective.includes(branchId)) {
    throw new ApplicationError(
      'BRANCH_ACCESS_DENIED',
      'Branch is not assigned to this staff.',
      403,
    );
  }
}
