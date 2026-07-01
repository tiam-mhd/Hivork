import type { SaleCustomerEmbed, SaleListItem, SaleDetailRecord } from '../../ports/sale.repository.port.js';
import type { InstallmentRecord } from '../../ports/installment.repository.port.js';
import { mapSaleToDetail, type SaleDetail, type SaleInstallmentDetail } from './sale-detail.mapper.js';

export type SaleSummary = {
  id: string;
  tenantCustomerId: string;
  customer?: SaleCustomerEmbed;
  branchId: string;
  title: string | null;
  totalAmountRial: string;
  downPaymentRial: string;
  installmentCount: number;
  status: 'active' | 'completed' | 'cancelled';
  paidCount?: number;
  contractDate?: string;
  createdAt: string;
  updatedAt?: string;
};

const SALE_STATUS_MAP: Record<string, SaleSummary['status']> = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export function mapSaleListItemToSummary(item: SaleListItem): SaleSummary {
  const { sale, customer, paidCount } = item;

  return {
    id: sale.id,
    tenantCustomerId: sale.tenantCustomerId,
    customer,
    branchId: sale.branchId,
    title: sale.title,
    totalAmountRial: sale.totalAmountRial.toString(),
    downPaymentRial: sale.downPaymentRial.toString(),
    installmentCount: sale.installmentCount,
    status: SALE_STATUS_MAP[sale.status] ?? 'active',
    paidCount,
    contractDate: sale.contractDate.toISOString(),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}

export function mapSaleDetailRecord(
  detail: SaleDetailRecord,
  installments: InstallmentRecord[],
): SaleDetail & { customer: SaleCustomerEmbed } {
  const mapped = mapSaleToDetail(detail.sale, installments);

  return {
    ...mapped,
    customer: detail.customer,
  };
}

export type { SaleDetail, SaleInstallmentDetail };
