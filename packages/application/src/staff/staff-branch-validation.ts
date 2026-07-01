import type { IBranchReader } from '../ports/branch.reader.port.js';
import { ApplicationError } from '../errors/application.error.js';

export async function assertStaffBranchAssignments(
  branches: IBranchReader,
  tenantId: string,
  assignedBranchIds: string[],
  primaryBranchId: string | null | undefined,
): Promise<void> {
  if (assignedBranchIds.length > 0) {
    const unique = [...new Set(assignedBranchIds)];
    if (unique.length !== assignedBranchIds.length) {
      throw new ApplicationError('VALIDATION_ERROR', 'Duplicate branch ids are not allowed.', 400);
    }

    for (const branchId of unique) {
      const exists = await branches.existsActiveInTenant(tenantId, branchId);
      if (!exists) {
        throw new ApplicationError('BRANCH_NOT_FOUND', 'Assigned branch was not found.', 400, {
          branchId,
        });
      }
    }

    if (primaryBranchId && !unique.includes(primaryBranchId)) {
      throw new ApplicationError(
        'VALIDATION_ERROR',
        'Primary branch must be included in assigned branches.',
        400,
        { field: 'primaryBranchId' },
      );
    }

    return;
  }

  if (primaryBranchId) {
    const exists = await branches.existsActiveInTenant(tenantId, primaryBranchId);
    if (!exists) {
      throw new ApplicationError('BRANCH_NOT_FOUND', 'Primary branch was not found.', 400, {
        branchId: primaryBranchId,
      });
    }
  }
}

export function assertBranchDataScopeForStaff(
  dataScope: 'all' | 'branch' | 'own',
  assignedBranchIds: string[],
): void {
  if (dataScope === 'branch' && assignedBranchIds.length === 0) {
    throw new ApplicationError(
      'VALIDATION_ERROR',
      'Branch data scope requires at least one assigned branch.',
      400,
      { field: 'assignedBranchIds' },
    );
  }
}
