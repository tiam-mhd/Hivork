import { toWesternDigits } from '@hivork/i18n';

import type { PaymentLedgerEntryRecord } from '../ports/payment-ledger.repository.port.js';
import type { ReconciliationDiscrepancyType } from '../ports/reconciliation.repository.port.js';

export type BankStatementMatchRow = {
  reference: string;
  amountRial: bigint;
};

export type LedgerReconciliationEntry = PaymentLedgerEntryRecord & {
  paymentAttemptMetadata: Record<string, unknown> | null;
  matchKey: string | null;
};

export type ReconciliationMatchDiscrepancy = {
  discrepancyType: ReconciliationDiscrepancyType;
  bankReference: string | null;
  bankAmountRial: bigint | null;
  ledgerEntryId: string | null;
  systemAmountRial: bigint | null;
};

export type ReconciliationMatchResult = {
  matchedCount: number;
  bankTotalRial: bigint;
  systemTotalRial: bigint;
  discrepancies: ReconciliationMatchDiscrepancy[];
};

export function normalizeBankReference(reference: string): string {
  return toWesternDigits(reference).trim().toUpperCase();
}

export function extractLedgerMatchKey(
  entry: PaymentLedgerEntryRecord,
  paymentAttemptMetadata: Record<string, unknown> | null,
): string | null {
  const entryMetadata = entry.metadata ?? {};
  const candidates = [
    entryMetadata.referenceNumber,
    entryMetadata.traceNumber,
    paymentAttemptMetadata?.referenceNumber,
    paymentAttemptMetadata?.traceNumber,
    paymentAttemptMetadata?.gatewayTransactionId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return normalizeBankReference(candidate);
    }
  }

  return null;
}

export function matchBankStatementToLedgerEntries(
  bankRows: BankStatementMatchRow[],
  ledgerEntries: LedgerReconciliationEntry[],
): ReconciliationMatchResult {
  const ledgerByKey = new Map<string, LedgerReconciliationEntry[]>();

  for (const entry of ledgerEntries) {
    if (!entry.matchKey) {
      continue;
    }

    const bucket = ledgerByKey.get(entry.matchKey) ?? [];
    bucket.push(entry);
    ledgerByKey.set(entry.matchKey, bucket);
  }

  const matchedLedgerIds = new Set<string>();
  const discrepancies: ReconciliationMatchDiscrepancy[] = [];
  let matchedCount = 0;
  let bankTotalRial = 0n;

  for (const bankRow of bankRows) {
    bankTotalRial += bankRow.amountRial;
    const key = normalizeBankReference(bankRow.reference);
    const candidates = ledgerByKey.get(key) ?? [];
    const unmatchedCandidate = candidates.find((entry) => !matchedLedgerIds.has(entry.id));

    if (!unmatchedCandidate) {
      discrepancies.push({
        discrepancyType: 'MISSING_IN_SYSTEM',
        bankReference: bankRow.reference,
        bankAmountRial: bankRow.amountRial,
        ledgerEntryId: null,
        systemAmountRial: null,
      });
      continue;
    }

    matchedLedgerIds.add(unmatchedCandidate.id);

    if (unmatchedCandidate.amountRial !== bankRow.amountRial) {
      discrepancies.push({
        discrepancyType: 'AMOUNT_MISMATCH',
        bankReference: bankRow.reference,
        bankAmountRial: bankRow.amountRial,
        ledgerEntryId: unmatchedCandidate.id,
        systemAmountRial: unmatchedCandidate.amountRial,
      });
      continue;
    }

    matchedCount += 1;
  }

  for (const entry of ledgerEntries) {
    if (!matchedLedgerIds.has(entry.id)) {
      discrepancies.push({
        discrepancyType: 'MISSING_IN_BANK',
        bankReference: entry.matchKey,
        bankAmountRial: null,
        ledgerEntryId: entry.id,
        systemAmountRial: entry.amountRial,
      });
    }
  }

  const systemTotalRial = ledgerEntries.reduce((sum, entry) => sum + entry.amountRial, 0n);

  return {
    matchedCount,
    bankTotalRial,
    systemTotalRial,
    discrepancies,
  };
}
