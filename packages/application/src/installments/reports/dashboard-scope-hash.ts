import type { SaleListScopeFilter } from '../sales/sale-data-scope.js';

export function buildDashboardScopeHash(scope: SaleListScopeFilter): string {
  if (scope.createdByStaffId) {
    return `own:${scope.createdByStaffId}`;
  }

  if (scope.branchIds?.length) {
    return `branch:${[...scope.branchIds].sort().join(',')}`;
  }

  return 'all';
}
