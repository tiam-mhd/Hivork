import type { SettlementBatchSummaryDto } from '@hivork/contracts/payments';

import type { SettlementBatchRecord } from '../ports/settlement-batch.repository.port.js';

function mapStatusToApi(status: 'OPEN' | 'CLOSED'): SettlementBatchSummaryDto['status'] {
  return status === 'OPEN' ? 'open' : 'closed';
}

function toDateOnlyIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function mapSettlementBatchToSummary(
  batch: SettlementBatchRecord,
): SettlementBatchSummaryDto {
  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    status: mapStatusToApi(batch.status),
    branchId: batch.branchId,
    periodFrom: toDateOnlyIso(batch.periodFrom),
    periodTo: toDateOnlyIso(batch.periodTo),
    totalAmountRial: batch.totalAmountRial.toString(),
    entryCount: batch.entryCount,
    ...(batch.note ? { note: batch.note } : {}),
    ...(batch.closedAt ? { closedAt: batch.closedAt.toISOString() } : {}),
    version: batch.version,
  };
}
