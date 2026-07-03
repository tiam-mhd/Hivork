import type {
  ReconciliationDiscrepancySummaryDto,
  ReconciliationReportSummaryDto,
} from '@hivork/contracts/payments';

import type {
  ReconciliationDiscrepancyRecord,
  ReconciliationReportRecord,
} from '../ports/reconciliation.repository.port.js';

function mapDiscrepancyTypeToApi(
  type: ReconciliationDiscrepancyRecord['discrepancyType'],
): ReconciliationDiscrepancySummaryDto['discrepancyType'] {
  switch (type) {
    case 'MISSING_IN_SYSTEM':
      return 'missing_in_system';
    case 'MISSING_IN_BANK':
      return 'missing_in_bank';
    default:
      return 'amount_mismatch';
  }
}

function mapDiscrepancyStatusToApi(
  status: ReconciliationDiscrepancyRecord['status'],
): ReconciliationDiscrepancySummaryDto['status'] {
  switch (status) {
    case 'RESOLVED':
      return 'resolved';
    case 'IGNORED':
      return 'ignored';
    default:
      return 'open';
  }
}

export function mapReconciliationReportToSummary(
  report: ReconciliationReportRecord,
): ReconciliationReportSummaryDto {
  return {
    id: report.id,
    settlementBatchId: report.settlementBatchId,
    matchedCount: report.matchedCount,
    discrepancyCount: report.discrepancyCount,
    bankTotalRial: report.bankTotalRial.toString(),
    systemTotalRial: report.systemTotalRial.toString(),
  };
}

export function mapReconciliationDiscrepancyToSummary(
  discrepancy: ReconciliationDiscrepancyRecord,
): ReconciliationDiscrepancySummaryDto {
  return {
    id: discrepancy.id,
    discrepancyType: mapDiscrepancyTypeToApi(discrepancy.discrepancyType),
    status: mapDiscrepancyStatusToApi(discrepancy.status),
    ...(discrepancy.bankReference ? { bankReference: discrepancy.bankReference } : {}),
    ...(discrepancy.bankAmountRial !== null
      ? { bankAmountRial: discrepancy.bankAmountRial.toString() }
      : {}),
    ...(discrepancy.ledgerEntryId ? { ledgerEntryId: discrepancy.ledgerEntryId } : {}),
    ...(discrepancy.systemAmountRial !== null
      ? { systemAmountRial: discrepancy.systemAmountRial.toString() }
      : {}),
    ...(discrepancy.resolveNote ? { resolveNote: discrepancy.resolveNote } : {}),
    ...(discrepancy.resolvedAt ? { resolvedAt: discrepancy.resolvedAt.toISOString() } : {}),
    version: discrepancy.version,
  };
}
