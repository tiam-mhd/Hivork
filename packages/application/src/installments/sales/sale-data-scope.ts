import { ApplicationError } from '../../errors/application.error.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';

export type SaleListScopeFilter = {
  branchIds?: string[];
  createdByStaffId?: string;
};

export function isSaleInScope(
  sale: SaleRecord,
  actorId: string,
  staffContext: DataScopeStaffContext,
): boolean {
  switch (staffContext.dataScope) {
    case 'all':
      return true;
    case 'branch': {
      const effective = resolveEffectiveBranchIds(staffContext);
      return effective.length === 0 || effective.includes(sale.branchId);
    }
    case 'own':
      return sale.createdByStaffId === actorId;
  }
}

export function resolveSaleListScope(
  staffContext: DataScopeStaffContext,
  actorId: string,
  options?: { branchId?: string; activeBranchId?: string },
): SaleListScopeFilter {
  const filter: SaleListScopeFilter = {};

  if (staffContext.dataScope === 'own') {
    filter.createdByStaffId = actorId;
  }

  if (staffContext.dataScope === 'branch') {
    const effective = resolveEffectiveBranchIds(staffContext);
    if (effective.length > 0) {
      filter.branchIds = effective;
    }
  }

  const requestedBranch = options?.branchId ?? options?.activeBranchId;
  if (!requestedBranch) {
    return filter;
  }

  if (filter.branchIds && !filter.branchIds.includes(requestedBranch)) {
    throw new ApplicationError(
      'BRANCH_NOT_ALLOWED',
      'Branch is outside your data scope.',
      403,
    );
  }

  filter.branchIds = [requestedBranch];
  return filter;
}
