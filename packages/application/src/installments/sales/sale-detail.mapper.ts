import type { InstallmentRecord, SaleRecord } from '../../ports/index.js';

export type SaleInstallmentDetail = {
  id: string;
  sequenceNumber: number;
  dueDate: string;
  amountRial: string;
  status: 'pending' | 'overdue' | 'paid' | 'waived';
  paidAt?: string | null;
  confirmedBy?: string | null;
  version: number;
};

export type SaleDetail = {
  id: string;
  tenantCustomerId: string;
  branchId: string;
  title: string | null;
  description?: string | null;
  invoiceNumber?: string | null;
  totalAmountRial: string;
  downPaymentRial: string;
  discountRial?: string | null;
  taxRial?: string | null;
  installmentCount: number;
  firstDueDate?: string;
  intervalDays?: number;
  status: 'active' | 'completed' | 'cancelled';
  contractDate?: string;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  version?: number;
  installments: SaleInstallmentDetail[];
};

const SALE_STATUS_MAP: Record<string, SaleDetail['status']> = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const INSTALLMENT_STATUS_MAP: Record<string, SaleInstallmentDetail['status']> = {
  PENDING: 'pending',
  OVERDUE: 'overdue',
  PAID: 'paid',
  WAIVED: 'waived',
};

export function mapSaleToDetail(sale: SaleRecord, installments: InstallmentRecord[]): SaleDetail {
  return {
    id: sale.id,
    tenantCustomerId: sale.tenantCustomerId,
    branchId: sale.branchId,
    title: sale.title,
    description: sale.description,
    invoiceNumber: sale.invoiceNumber,
    totalAmountRial: sale.totalAmountRial.toString(),
    downPaymentRial: sale.downPaymentRial.toString(),
    discountRial: sale.discountRial?.toString() ?? null,
    taxRial: sale.taxRial?.toString() ?? null,
    installmentCount: sale.installmentCount,
    firstDueDate: sale.firstDueDate.toISOString(),
    intervalDays: sale.intervalDays,
    status: SALE_STATUS_MAP[sale.status] ?? 'active',
    contractDate: sale.contractDate.toISOString(),
    cancelledAt: sale.cancelledAt?.toISOString() ?? null,
    cancelReason: sale.cancelReason,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    version: sale.version,
    installments: installments.map((installment) => ({
      id: installment.id,
      sequenceNumber: installment.sequenceNumber,
      dueDate: installment.dueDate.toISOString(),
      amountRial: installment.amountRial.toString(),
      status: INSTALLMENT_STATUS_MAP[installment.status] ?? 'pending',
      paidAt: installment.paidAt?.toISOString() ?? null,
      confirmedBy: installment.confirmedByStaffId,
      version: installment.version,
    })),
  };
}

export function saleDetailToRecord(detail: SaleDetail): Record<string, unknown> {
  return detail as unknown as Record<string, unknown>;
}

export function saleDetailFromRecord(value: Record<string, unknown>): SaleDetail {
  return value as unknown as SaleDetail;
}
