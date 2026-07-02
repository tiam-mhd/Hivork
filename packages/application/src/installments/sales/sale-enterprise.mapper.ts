import type { SaleCustomerEmbed, SaleRecord } from '../../ports/sale.repository.port.js';
import type { InstallmentRecord } from '../../ports/installment.repository.port.js';
import { isInsuranceExpired } from '@hivork/domain';
import { mapSaleToDetail, type SaleDetail } from './sale-detail.mapper.js';

export type SaleDetailEnterprise = Omit<SaleDetail, 'status'> & {
  status:
    | 'active'
    | 'completed'
    | 'cancelled'
    | 'terminated'
    | 'closed'
    | 'archived';
  contractNumber: string | null;
  customTerms: string | null;
  signatureStatus: 'unsigned' | 'pending' | 'signed';
  signedAt: string | null;
  insuranceRial: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insuranceExpiresAt: string | null;
  insuranceExpiredWarning?: boolean;
  taxRateBps: number | null;
  taxInclusive: boolean;
  extendedFromSaleId: string | null;
  copiedFromSaleId: string | null;
  terminatedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
};

const ENTERPRISE_STATUS_MAP: Record<string, SaleDetailEnterprise['status']> = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  TERMINATED: 'terminated',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
};

const SIGNATURE_STATUS_MAP: Record<string, SaleDetailEnterprise['signatureStatus']> = {
  UNSIGNED: 'unsigned',
  PENDING: 'pending',
  SIGNED: 'signed',
};

export function mapSaleToEnterpriseDetail(
  sale: SaleRecord,
  installments: InstallmentRecord[],
  customer?: SaleCustomerEmbed,
): SaleDetailEnterprise & { customer?: SaleCustomerEmbed } {
  const base = mapSaleToDetail(sale, installments);

  return {
    ...base,
    customer,
    status: ENTERPRISE_STATUS_MAP[sale.status] ?? 'active',
    contractNumber: sale.contractNumber,
    customTerms: sale.customTerms,
    signatureStatus: SIGNATURE_STATUS_MAP[sale.signatureStatus] ?? 'unsigned',
    signedAt: sale.signedAt?.toISOString() ?? null,
    insuranceRial: sale.insuranceRial?.toString() ?? null,
    insuranceProvider: sale.insuranceProvider,
    insurancePolicyNumber: sale.insurancePolicyNumber,
    insuranceExpiresAt: sale.insuranceExpiresAt
      ? sale.insuranceExpiresAt.toISOString().slice(0, 10)
      : null,
    insuranceExpiredWarning: isInsuranceExpired(sale.insuranceExpiresAt),
    taxRateBps: sale.taxRateBps,
    taxInclusive: sale.taxInclusive,
    extendedFromSaleId: sale.extendedFromSaleId,
    copiedFromSaleId: sale.copiedFromSaleId,
    terminatedAt: sale.terminatedAt?.toISOString() ?? null,
    closedAt: sale.closedAt?.toISOString() ?? null,
    archivedAt: sale.archivedAt?.toISOString() ?? null,
  };
}
