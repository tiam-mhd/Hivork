import type {
  CancelSaleResult,
  GetSaleEnterpriseOutput,
  SaleDetail,
  SaleSummary,
} from '@hivork/application';

export function parseDateOnlyUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Inclusive end-of-day UTC for date-range `to` filters. */
export function parseDateOnlyUtcEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

export function toSaleInstallmentResponse(installment: SaleDetail['installments'][number]) {
  return {
    id: installment.id,
    sequenceNumber: installment.sequenceNumber,
    dueDate: installment.dueDate,
    amountRial: installment.amountRial,
    status: installment.status,
    ...(installment.paidAt !== undefined ? { paidAt: installment.paidAt } : {}),
    ...(installment.confirmedBy !== undefined ? { confirmedBy: installment.confirmedBy } : {}),
    version: installment.version,
  };
}

export function toSaleDetailResponse(sale: SaleDetail | GetSaleEnterpriseOutput) {
  return {
    id: sale.id,
    tenantCustomerId: sale.tenantCustomerId,
    ...('customer' in sale && sale.customer ? { customer: sale.customer } : {}),
    branchId: sale.branchId,
    title: sale.title,
    ...(sale.description !== undefined ? { description: sale.description } : {}),
    ...(sale.invoiceNumber !== undefined ? { invoiceNumber: sale.invoiceNumber } : {}),
    totalAmountRial: sale.totalAmountRial,
    downPaymentRial: sale.downPaymentRial,
    ...(sale.discountRial !== undefined ? { discountRial: sale.discountRial } : {}),
    ...(sale.taxRial !== undefined ? { taxRial: sale.taxRial } : {}),
    installmentCount: sale.installmentCount,
    ...(sale.firstDueDate !== undefined ? { firstDueDate: sale.firstDueDate } : {}),
    ...(sale.intervalDays !== undefined ? { intervalDays: sale.intervalDays } : {}),
    status: sale.status,
    ...(sale.contractDate !== undefined ? { contractDate: sale.contractDate } : {}),
    ...(sale.cancelledAt !== undefined ? { cancelledAt: sale.cancelledAt } : {}),
    ...(sale.cancelReason !== undefined ? { cancelReason: sale.cancelReason } : {}),
    installments: sale.installments.map(toSaleInstallmentResponse),
    createdAt: sale.createdAt,
    ...(sale.updatedAt !== undefined ? { updatedAt: sale.updatedAt } : {}),
    ...(sale.version !== undefined ? { version: sale.version } : {}),
  };
}

export function toSaleEnterpriseDetailResponse(sale: GetSaleEnterpriseOutput) {
  const base = toSaleDetailResponse(sale);

  return {
    ...base,
    status: sale.status,
    contractNumber: sale.contractNumber,
    customTerms: sale.customTerms,
    signatureStatus: sale.signatureStatus,
    signedAt: sale.signedAt,
    insuranceRial: sale.insuranceRial,
    insuranceProvider: sale.insuranceProvider,
    extendedFromSaleId: sale.extendedFromSaleId,
    copiedFromSaleId: sale.copiedFromSaleId,
    terminatedAt: sale.terminatedAt,
    closedAt: sale.closedAt,
    archivedAt: sale.archivedAt,
    ...(sale.versions ? { versions: sale.versions } : {}),
    ...(sale.attachments ? { attachments: sale.attachments } : {}),
  };
}

export function toSaleSummaryResponse(sale: SaleSummary) {
  return {
    id: sale.id,
    tenantCustomerId: sale.tenantCustomerId,
    ...(sale.customer ? { customer: sale.customer } : {}),
    branchId: sale.branchId,
    title: sale.title,
    totalAmountRial: sale.totalAmountRial,
    downPaymentRial: sale.downPaymentRial,
    installmentCount: sale.installmentCount,
    status: sale.status,
    ...(sale.paidCount !== undefined ? { paidCount: sale.paidCount } : {}),
    ...(sale.contractDate !== undefined ? { contractDate: sale.contractDate } : {}),
    createdAt: sale.createdAt,
    ...(sale.updatedAt !== undefined ? { updatedAt: sale.updatedAt } : {}),
  };
}

export function toCancelSaleResponse(result: CancelSaleResult) {
  return {
    status: result.status,
    cancelledAt: result.cancelledAt.toISOString(),
  };
}
