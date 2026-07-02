import type { InstallmentRecord, SaleRecord } from '../../ports/index.js';
import type { ContractVersionSnapshot } from '../../ports/contract-version.repository.port.js';

export function buildContractVersionSnapshot(
  sale: SaleRecord,
  installments: InstallmentRecord[],
): ContractVersionSnapshot {
  const sortedInstallments = [...installments].sort(
    (left, right) => left.sequenceNumber - right.sequenceNumber,
  );

  return {
    sale: {
      id: sale.id,
      tenantId: sale.tenantId,
      branchId: sale.branchId,
      status: sale.status,
      contractNumber: sale.contractNumber,
      totalAmountRial: sale.totalAmountRial.toString(),
      downPaymentRial: sale.downPaymentRial.toString(),
      installmentCount: sale.installmentCount,
      firstDueDate: sale.firstDueDate.toISOString(),
      intervalDays: sale.intervalDays,
      contractDate: sale.contractDate.toISOString(),
      extendedFromSaleId: sale.extendedFromSaleId,
      metadata: sale.metadata,
    },
    installmentSchedule: sortedInstallments.map((installment) => ({
      id: installment.id,
      sequenceNumber: installment.sequenceNumber,
      dueDate: installment.dueDate.toISOString(),
      amountRial: installment.amountRial.toString(),
      status: installment.status,
    })),
  };
}

export function parseDateOnlyUtc(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0, 0));
}

export function resolveLastInstallmentDueDate(installments: InstallmentRecord[]): Date {
  if (installments.length === 0) {
    throw new Error('Sale has no installments');
  }

  return installments.reduce((latest, installment) =>
    installment.dueDate > latest ? installment.dueDate : latest,
  installments[0]!.dueDate);
}
