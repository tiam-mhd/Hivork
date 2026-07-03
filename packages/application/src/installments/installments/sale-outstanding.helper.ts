import type { InstallmentRecord } from '../../ports/installment.repository.port.js';

/** Sum of pending + overdue installment amounts still owed on a sale (IFP-096). */
export function computeSaleOutstandingRial(installments: InstallmentRecord[]): bigint {
  return installments
    .filter((row) => row.status === 'PENDING' || row.status === 'OVERDUE')
    .reduce((sum, row) => sum + row.amountRial, 0n);
}
