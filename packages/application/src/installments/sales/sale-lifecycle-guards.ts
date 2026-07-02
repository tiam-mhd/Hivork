import { ApplicationError } from '../../errors/application.error.js';
import type { IBranchReader } from '../../ports/branch.reader.port.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import {
  resolveEffectiveBranchIds,
  type DataScopeStaffContext,
} from '../../rbac/build-data-scope-filter.js';
import { isSaleInScope } from './sale-data-scope.js';

export async function assertBranchAccessForSale(
  branches: IBranchReader,
  tenantId: string,
  branchId: string,
  staffContext: DataScopeStaffContext,
): Promise<void> {
  const exists = await branches.existsActiveInTenant(tenantId, branchId);
  if (!exists) {
    throw new ApplicationError(
      'BRANCH_TENANT_MISMATCH',
      'Branch is not available for this tenant.',
      422,
    );
  }

  if (staffContext.dataScope === 'all') {
    return;
  }

  const effective = resolveEffectiveBranchIds(staffContext);
  if (effective.length > 0 && !effective.includes(branchId)) {
    throw new ApplicationError(
      'BRANCH_NOT_ALLOWED',
      'Branch is not assigned to this staff.',
      403,
    );
  }
}

export function assertSaleAccessible(
  record: SaleRecord | null,
  staffId: string,
  staffContext: DataScopeStaffContext,
  branchId: string,
): SaleRecord {
  if (!record || record.deletedAt) {
    throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
  }

  if (!isSaleInScope(record, staffId, staffContext)) {
    throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
  }

  if (record.branchId !== branchId) {
    throw new ApplicationError('SALE_NOT_FOUND', 'Sale was not found.', 404);
  }

  return record;
}

export function assertReasonProvided(reason: string, label = 'Reason'): void {
  if (reason.trim().length < 3) {
    throw new ApplicationError('FIELD_REQUIRED', `${label} is required.`, 400);
  }
}
