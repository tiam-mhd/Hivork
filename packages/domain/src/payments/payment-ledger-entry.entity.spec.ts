import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain.error.js';
import { LedgerDomainErrorCode } from './errors/ledger.errors.js';
import {
  PaymentLedgerEntry,
  assertPositiveAmountRial,
  oppositeDirection,
} from './payment-ledger-entry.entity.js';
import { PaymentLedgerService } from './payment-ledger.service.js';
import {
  PaymentLedgerDirection,
  PaymentLedgerEntryStatus,
  PaymentLedgerEntryType,
  type PostPaymentInInput,
} from './payment-ledger.types.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BRANCH_ID = '00000000-0000-0000-0000-000000000002';
const STAFF_ID = '00000000-0000-0000-0000-000000000010';
const ATTEMPT_ID = '00000000-0000-0000-0000-000000000020';
const INSTALLMENT_ID = '00000000-0000-0000-0000-000000000030';
const SALE_ID = '00000000-0000-0000-0000-000000000040';

function basePaymentInInput(
  overrides: Partial<PostPaymentInInput> = {},
): PostPaymentInInput {
  return {
    tenantId: TENANT_ID,
    branchId: BRANCH_ID,
    amountRial: 5_000_000n,
    occurredAt: new Date('2026-07-01T12:00:00.000Z'),
    paymentMethod: 'cash',
    paymentAttemptId: ATTEMPT_ID,
    installmentId: INSTALLMENT_ID,
    saleId: SALE_ID,
    createdById: STAFF_ID,
    ...overrides,
  };
}

describe('PaymentLedgerEntry (IFP-102)', () => {
  const service = new PaymentLedgerService();

  describe('post / amount invariants', () => {
    it('rejects zero amount with AMOUNT_INVALID', () => {
      expect(() =>
        service.postPaymentIn(basePaymentInInput({ amountRial: 0n })),
      ).toThrow(new DomainError(LedgerDomainErrorCode.AMOUNT_INVALID));
    });

    it('rejects negative amount with AMOUNT_INVALID', () => {
      expect(() =>
        service.postPaymentIn(basePaymentInInput({ amountRial: -100n })),
      ).toThrow(new DomainError(LedgerDomainErrorCode.AMOUNT_INVALID));
    });

    it('assertPositiveAmountRial rejects non-positive bigint', () => {
      expect(() => assertPositiveAmountRial(0n)).toThrow(
        new DomainError(LedgerDomainErrorCode.AMOUNT_INVALID),
      );
    });

    it('posts valid payment in as POSTED CREDIT PAYMENT_IN', () => {
      const entry = service.postPaymentIn(basePaymentInInput());

      expect(entry.status).toBe(PaymentLedgerEntryStatus.POSTED);
      expect(entry.direction).toBe(PaymentLedgerDirection.CREDIT);
      expect(entry.entryType).toBe(PaymentLedgerEntryType.PAYMENT_IN);
      expect(entry.amountRial).toBe(5_000_000n);
      expect(entry.paymentAttemptId).toBe(ATTEMPT_ID);
    });

    it('stores occurredAt and recordedAt from input', () => {
      const occurredAt = new Date('2026-06-15T08:30:00.000Z');
      const recordedAt = new Date('2026-06-15T08:31:00.000Z');
      const entry = service.postPaymentIn(
        basePaymentInInput({ occurredAt, recordedAt }),
      );

      expect(entry.occurredAt).toEqual(occurredAt);
      expect(entry.recordedAt).toEqual(recordedAt);
    });

    it('rejects missing tenant or branch', () => {
      expect(() =>
        service.postPaymentIn(basePaymentInInput({ tenantId: '  ' })),
      ).toThrow(new DomainError(LedgerDomainErrorCode.FIELD_REQUIRED));
    });

    it('rejects entry type / direction mismatch', () => {
      expect(() =>
        PaymentLedgerEntry.post({
          tenantId: TENANT_ID,
          branchId: BRANCH_ID,
          entryType: PaymentLedgerEntryType.PAYMENT_IN,
          direction: PaymentLedgerDirection.DEBIT,
          amountRial: 1_000n,
          occurredAt: new Date(),
        }),
      ).toThrow(new DomainError(LedgerDomainErrorCode.ENTRY_TYPE_DIRECTION_MISMATCH));
    });
  });

  describe('refund entries', () => {
    it('posts refund as DEBIT REFUND', () => {
      const paymentIn = service.postPaymentIn(basePaymentInInput());
      const entry = service.postRefund({
        tenantId: TENANT_ID,
        branchId: BRANCH_ID,
        amountRial: 250_000n,
        occurredAt: new Date('2026-07-02T12:00:00.000Z'),
        reversesEntryId: paymentIn.id,
      });

      expect(entry.entryType).toBe(PaymentLedgerEntryType.REFUND);
      expect(entry.direction).toBe(PaymentLedgerDirection.DEBIT);
      expect(entry.status).toBe(PaymentLedgerEntryStatus.POSTED);
      expect(entry.reversesEntryId).toBe(paymentIn.id);
    });

    it('postRefundAgainstPaymentIn links to source entry', () => {
      const paymentIn = service.postPaymentIn(basePaymentInInput());
      const refund = service.postRefundAgainstPaymentIn(paymentIn, {
        amountRial: 100_000n,
        occurredAt: new Date('2026-07-02T13:00:00.000Z'),
      });

      expect(refund.reversesEntryId).toBe(paymentIn.id);
      expect(refund.amountRial).toBe(100_000n);
    });
  });

  describe('void / reversal', () => {
    it('void on posted entry returns voided original and DEBIT reversal with same amount', () => {
      const entry = service.postPaymentIn(basePaymentInInput());
      const voidedAt = new Date('2026-07-03T09:00:00.000Z');

      const result = entry.void(STAFF_ID, '  ابطال پرداخت تست  ', voidedAt);

      expect(result.original.status).toBe(PaymentLedgerEntryStatus.VOIDED);
      expect(result.original.voidedById).toBe(STAFF_ID);
      expect(result.original.voidReason).toBe('ابطال پرداخت تست');
      expect(result.original.voidedAt).toEqual(voidedAt);

      expect(result.reversal.direction).toBe(PaymentLedgerDirection.DEBIT);
      expect(result.reversal.amountRial).toBe(5_000_000n);
      expect(result.reversal.reversesEntryId).toBe(entry.id);
      expect(result.reversal.entryType).toBe(PaymentLedgerEntryType.PAYMENT_IN);
      expect(result.reversal.status).toBe(PaymentLedgerEntryStatus.POSTED);
    });

    it('void on already voided entry throws LEDGER_ALREADY_VOIDED', () => {
      const entry = service.postPaymentIn(basePaymentInInput());
      entry.void(STAFF_ID, 'اولین ابطال');

      expect(() => entry.void(STAFF_ID, 'دومین ابطال')).toThrow(
        new DomainError(LedgerDomainErrorCode.LEDGER_ALREADY_VOIDED),
      );
    });

    it('void requires non-empty reason', () => {
      const entry = service.postPaymentIn(basePaymentInInput());

      expect(() => entry.void(STAFF_ID, '   ')).toThrow(
        new DomainError(LedgerDomainErrorCode.VOID_REASON_REQUIRED),
      );
    });

    it('void requires voidedBy staff id', () => {
      const entry = service.postPaymentIn(basePaymentInInput());

      expect(() => entry.void('', 'دلیل ابطال')).toThrow(
        new DomainError(LedgerDomainErrorCode.FIELD_REQUIRED),
      );
    });

    it('createReversal throws REVERSAL_AMOUNT_MISMATCH when amount differs', () => {
      const entry = service.postPaymentIn(basePaymentInInput());

      expect(() =>
        PaymentLedgerEntry.createReversal(entry, {
          amountRial: 4_999_999n,
          occurredAt: new Date(),
        }),
      ).toThrow(new DomainError(LedgerDomainErrorCode.REVERSAL_AMOUNT_MISMATCH));
    });

    it('cannot void a reversal line directly', () => {
      const entry = service.postPaymentIn(basePaymentInInput());
      const { reversal } = entry.void(STAFF_ID, 'ابطال');
      const reversalEntry = PaymentLedgerEntry.reconstitute(reversal);

      expect(() => reversalEntry.void(STAFF_ID, 'تلاش دوباره')).toThrow(
        new DomainError(LedgerDomainErrorCode.LEDGER_ALREADY_VOIDED),
      );
    });

    it('oppositeDirection flips CREDIT to DEBIT and back', () => {
      expect(oppositeDirection(PaymentLedgerDirection.CREDIT)).toBe(
        PaymentLedgerDirection.DEBIT,
      );
      expect(oppositeDirection(PaymentLedgerDirection.DEBIT)).toBe(
        PaymentLedgerDirection.CREDIT,
      );
    });
  });

  describe('reconstitute', () => {
    it('reconstitute preserves bigint amount without coercion', () => {
      const entry = service.postPaymentIn(basePaymentInInput({ amountRial: 9_876_543_210n }));
      const restored = PaymentLedgerEntry.reconstitute(entry.toProps());

      expect(restored.amountRial).toBe(9_876_543_210n);
      expect(typeof restored.amountRial).toBe('bigint');
    });
  });
});
