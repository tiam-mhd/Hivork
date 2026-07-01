import type { InstallmentListItem } from '../../ports/installment.repository.port.js';
import { computeDaysOverdue } from './installment-days-overdue.js';

export type InstallmentSummary = {
  id: string;
  saleId: string;
  tenantId?: string;
  customer: {
    id: string;
    phone: string;
    name: string | null;
  };
  branchId: string;
  sequenceNumber: number;
  dueDate: string;
  amountRial: string;
  status: 'pending' | 'overdue' | 'paid' | 'waived';
  paidAt?: string | null;
  daysOverdue?: number;
};

const STATUS_MAP: Record<string, InstallmentSummary['status']> = {
  PENDING: 'pending',
  OVERDUE: 'overdue',
  PAID: 'paid',
  WAIVED: 'waived',
};

export function mapInstallmentListItemToSummary(item: InstallmentListItem): InstallmentSummary {
  const status = STATUS_MAP[item.installment.status] ?? 'pending';

  return {
    id: item.installment.id,
    saleId: item.installment.saleId,
    tenantId: item.installment.tenantId,
    customer: item.customer,
    branchId: item.branchId,
    sequenceNumber: item.installment.sequenceNumber,
    dueDate: item.installment.dueDate.toISOString(),
    amountRial: item.installment.amountRial.toString(),
    status,
    paidAt: item.installment.paidAt?.toISOString() ?? null,
    daysOverdue: computeDaysOverdue(item.installment.dueDate, status),
  };
}
