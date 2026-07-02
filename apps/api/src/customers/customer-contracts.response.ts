import type { CustomerContractListRecord } from '@hivork/application';

export function toCustomerContractResponse(item: CustomerContractListRecord) {
  return {
    saleId: item.saleId,
    title: item.title,
    status: item.status,
    totalAmountRial: item.totalAmountRial.toString(),
    paidAmountRial: item.paidAmountRial.toString(),
    installmentCount: item.installmentCount,
    contractDate: item.contractDate.toISOString().slice(0, 10),
    branchName: item.branchName,
    sellerName: item.sellerName,
    overdueCount: item.overdueCount,
  };
}
