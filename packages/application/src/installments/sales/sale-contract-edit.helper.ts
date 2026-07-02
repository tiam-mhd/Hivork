import { InstallmentStatus, type InstallmentSnapshot } from '@hivork/domain';

import { ApplicationError } from '../../errors/application.error.js';
import type { IInstallmentRepository } from '../../ports/installment.repository.port.js';
import type { SaleRecord } from '../../ports/sale.repository.port.js';
import type { DataScopeStaffContext } from '../../rbac/build-data-scope-filter.js';
import { saleRecordToDomain } from './sale-record.mapper.js';
import { assertSaleAccessible } from './sale-lifecycle-guards.js';

function toInstallmentSnapshots(
  rows: Awaited<ReturnType<IInstallmentRepository['findBySaleId']>>,
): InstallmentSnapshot[] {
  return rows.map((row) => ({
    id: row.id,
    sequenceNumber: row.sequenceNumber,
    dueDate: row.dueDate,
    amountRial: row.amountRial,
    status: row.status as InstallmentStatus,
  }));
}

export async function assertSaleEditableForContractMetadata(
  record: SaleRecord | null,
  staffId: string,
  staffContext: DataScopeStaffContext,
  branchId: string,
  installments: IInstallmentRepository,
  tenantId: string,
  saleId: string,
): Promise<SaleRecord> {
  const sale = assertSaleAccessible(record, staffId, staffContext, branchId);

  if (sale.archivedAt) {
    throw new ApplicationError(
      'SALE_ARCHIVED_READONLY',
      'Archived contracts are read-only.',
      409,
    );
  }

  const installmentRows = await installments.findBySaleId(tenantId, saleId);
  const domainSale = saleRecordToDomain(sale);

  if (!domainSale.canEditFinancials(toInstallmentSnapshots(installmentRows))) {
    throw new ApplicationError(
      'SALE_HAS_PAID_INSTALLMENT',
      'Contract metadata cannot be changed after a paid installment exists.',
      409,
    );
  }

  return sale;
}
