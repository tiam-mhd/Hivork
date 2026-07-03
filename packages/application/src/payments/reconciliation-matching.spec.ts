import { describe, expect, it } from 'vitest';

import {
  extractLedgerMatchKey,
  matchBankStatementToLedgerEntries,
  normalizeBankReference,
} from './reconciliation-matching.js';

describe('reconciliation matching', () => {
  it('matches by reference and detects amount mismatch', () => {
    const ledgerEntries = [
      {
        id: 'ledger-1',
        tenantId: 'tenant',
        branchId: 'branch',
        entryType: 'PAYMENT_IN',
        direction: 'CREDIT',
        amountRial: 4_500_000n,
        status: 'POSTED',
        occurredAt: new Date(),
        recordedAt: new Date(),
        paymentMethod: 'pos',
        description: null,
        paymentAttemptId: null,
        installmentId: null,
        saleId: null,
        settlementBatchId: 'batch',
        reversesEntryId: null,
        metadata: null,
        version: 1,
        paymentAttemptMetadata: { traceNumber: 'TRACE-99' },
        matchKey: extractLedgerMatchKey(
          {
            id: 'ledger-1',
            tenantId: 'tenant',
            branchId: 'branch',
            entryType: 'PAYMENT_IN',
            direction: 'CREDIT',
            amountRial: 4_500_000n,
            status: 'POSTED',
            occurredAt: new Date(),
            recordedAt: new Date(),
            paymentMethod: 'pos',
            description: null,
            paymentAttemptId: null,
            installmentId: null,
            saleId: null,
            settlementBatchId: 'batch',
            reversesEntryId: null,
            metadata: null,
            version: 1,
          },
          { traceNumber: 'TRACE-99' },
        ),
      },
    ];

    const result = matchBankStatementToLedgerEntries(
      [{ reference: 'trace-99', amountRial: 5_000_000n }],
      ledgerEntries,
    );

    expect(result.matchedCount).toBe(0);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0]?.discrepancyType).toBe('AMOUNT_MISMATCH');
  });

  it('normalizes Persian digits in references', () => {
    expect(normalizeBankReference('TRACE-۱۲۳')).toBe('TRACE-123');
  });
});
