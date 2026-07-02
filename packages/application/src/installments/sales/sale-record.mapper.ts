import { Sale, SaleStatus } from '@hivork/domain';

import type { SaleRecord } from '../../ports/sale.repository.port.js';

export function saleRecordToDomain(record: SaleRecord): Sale {
  return Sale.reconstitute({
    id: record.id,
    tenantId: record.tenantId,
    branchId: record.branchId,
    tenantCustomerId: record.tenantCustomerId,
    createdByStaffId: record.createdByStaffId,
    title: record.title,
    description: record.description,
    invoiceNumber: record.invoiceNumber,
    totalAmountRial: record.totalAmountRial,
    downPaymentRial: record.downPaymentRial,
    discountRial: record.discountRial,
    taxRial: record.taxRial,
    installmentCount: record.installmentCount,
    firstDueDate: record.firstDueDate,
    intervalDays: record.intervalDays,
    contractDate: record.contractDate,
    status: record.status as SaleStatus,
    cancelledAt: record.cancelledAt,
    cancelledById: record.cancelledById,
    cancelReason: record.cancelReason,
    terminatedAt: record.terminatedAt ?? null,
    terminatedById: record.terminatedById ?? null,
    terminateReason: record.terminateReason ?? null,
    closedAt: record.closedAt ?? null,
    closedById: record.closedById ?? null,
    closeReason: record.closeReason ?? null,
    archivedAt: record.archivedAt ?? null,
    archivedById: record.archivedById ?? null,
    archiveReason: record.archiveReason ?? null,
    version: record.version,
    metadata: record.metadata ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}
