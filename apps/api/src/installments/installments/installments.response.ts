import type { InstallmentSummary } from '@hivork/application';

export function toInstallmentSummaryResponse(item: InstallmentSummary) {
  return {
    id: item.id,
    saleId: item.saleId,
    ...(item.tenantId ? { tenantId: item.tenantId } : {}),
    customer: item.customer,
    branchId: item.branchId,
    sequenceNumber: item.sequenceNumber,
    dueDate: item.dueDate,
    amountRial: item.amountRial,
    status: item.status,
    ...(item.paidAt !== undefined ? { paidAt: item.paidAt } : {}),
    ...(item.daysOverdue !== undefined ? { daysOverdue: item.daysOverdue } : {}),
  };
}
