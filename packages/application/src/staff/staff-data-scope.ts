import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../rbac/build-data-scope-filter.js';
import type { StaffListScope } from '../ports/staff.repository.port.js';
import { ApplicationError } from '../errors/application.error.js';

export function buildStaffListScope(staffContext: DataScopeStaffContext): StaffListScope {
  switch (staffContext.dataScope) {
    case 'all':
      return { dataScope: 'all' };
    case 'branch':
      return {
        dataScope: 'branch',
        branchIds: resolveEffectiveBranchIds(staffContext),
      };
    case 'own':
      return { dataScope: 'own', staffId: staffContext.staffId };
  }
}

export function assertStaffInScope(
  staff: { id: string; assignedBranchIds: string[]; primaryBranchId: string | null },
  staffContext: DataScopeStaffContext,
): void {
  if (staffContext.dataScope === 'all') {
    return;
  }

  if (staffContext.dataScope === 'own') {
    if (staff.id !== staffContext.staffId) {
      throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
    }
    return;
  }

  const effective = resolveEffectiveBranchIds(staffContext);
  if (effective.length === 0) {
    throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
  }

  const overlaps =
    staff.assignedBranchIds.some((id) => effective.includes(id)) ||
    (staff.primaryBranchId !== null && effective.includes(staff.primaryBranchId));

  if (!overlaps) {
    throw new ApplicationError('STAFF_NOT_FOUND', 'Staff was not found for this tenant.', 404);
  }
}
