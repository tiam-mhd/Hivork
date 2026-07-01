import type {
  CreateTenantCustomerOutput,
  GetTenantCustomerOutput,
  ImportCustomersExcelOutput,
} from '@hivork/application';

export function toTenantCustomerResponse(result: CreateTenantCustomerOutput) {
  const { customer, globalCustomer } = result;

  return {
    id: customer.id,
    tenantId: customer.tenantId,
    globalCustomerId: customer.globalCustomerId,
    localCode: customer.localCode,
    tags: customer.tags,
    notes: customer.notes,
    internalNotes: customer.internalNotes,
    defaultBranchId: customer.defaultBranchId,
    preferredContactChannel: customer.preferredContactChannel,
    marketingOptIn: customer.marketingOptIn,
    creditScore: customer.creditScore,
    overdueCount: customer.overdueCount,
    totalPurchaseRial: customer.totalPurchaseRial.toString(),
    lastPurchaseAt: customer.lastPurchaseAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    customer: {
      id: globalCustomer.id,
      phone: globalCustomer.phone,
      name: globalCustomer.name,
      email: globalCustomer.email,
      nationalId: globalCustomer.nationalId,
      birthDate: globalCustomer.birthDate
        ? globalCustomer.birthDate.toISOString().slice(0, 10)
        : null,
      gender: globalCustomer.gender,
      address: globalCustomer.address,
      preferredContactChannel: globalCustomer.preferredContactChannel,
      marketingOptIn: globalCustomer.marketingOptIn,
      status: globalCustomer.status,
    },
  };
}

export function toTenantCustomerListItemResponse(
  item: import('@hivork/application').TenantCustomerListItem,
) {
  return {
    id: item.id,
    globalCustomer: item.globalCustomer,
    localCode: item.localCode,
    tags: item.tags,
    creditScore: item.creditScore,
    overdueCount: item.overdueCount,
    totalPurchaseRial: item.totalPurchaseRial.toString(),
    lastPurchaseAt: item.lastPurchaseAt?.toISOString() ?? null,
    preferredContactChannel: item.preferredContactChannel,
    createdAt: item.createdAt.toISOString(),
  };
}

export function toTenantCustomerDetailResponse(detail: GetTenantCustomerOutput) {
  return {
    id: detail.id,
    version: detail.version,
    globalCustomer: {
      id: detail.globalCustomer.id,
      phone: detail.globalCustomer.phone,
      name: detail.globalCustomer.name,
      email: detail.globalCustomer.email,
      nationalId: detail.globalCustomer.nationalId,
      birthDate: detail.globalCustomer.birthDate
        ? detail.globalCustomer.birthDate.toISOString().slice(0, 10)
        : null,
      gender: detail.globalCustomer.gender,
      address: detail.globalCustomer.address,
    },
    localCode: detail.localCode,
    tags: detail.tags,
    notes: detail.notes,
    internalNotes: detail.internalNotes,
    creditScore: detail.creditScore,
    overdueCount: detail.overdueCount,
    totalPurchaseRial: detail.totalPurchaseRial.toString(),
    lastPurchaseAt: detail.lastPurchaseAt?.toISOString() ?? null,
    preferredContactChannel: detail.preferredContactChannel,
    marketingOptIn: detail.marketingOptIn,
    defaultBranchId: detail.defaultBranchId,
    metadata: detail.metadata,
    createdAt: detail.createdAt.toISOString(),
    updatedAt: detail.updatedAt.toISOString(),
    ...(detail.salesSummary
      ? {
          salesSummary: {
            activeSalesCount: detail.salesSummary.activeSalesCount,
            completedSalesCount: detail.salesSummary.completedSalesCount,
            totalOverdueRial: detail.salesSummary.totalOverdueRial.toString(),
            lastSaleAt: detail.salesSummary.lastSaleAt?.toISOString() ?? null,
          },
        }
      : {}),
  };
}

export function toImportCustomersResponse(result: ImportCustomersExcelOutput) {
  return {
    totalRows: result.totalRows,
    successCount: result.successCount,
    errorCount: result.errorCount,
    errors: result.errors,
  };
}
