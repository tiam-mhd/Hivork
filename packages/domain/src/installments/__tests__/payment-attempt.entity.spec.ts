import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';
import {
  InstallmentDomainErrorCode,
  PaymentAttemptDomainErrorCode,
  SaleDomainErrorCode,
} from '../errors.js';
import { InstallmentStatus } from '../installment.types.js';
import { PaymentAttempt } from '../payment-attempt.entity.js';
import { PaymentAttemptStatus, ReportedByType, type ReportPaymentInput } from '../payment-attempt.types.js';

const INSTALLMENT_ID = '00000000-0000-0000-0000-000000000020';
const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const INSTALLMENT_AMOUNT = 3_333_334n;

function baseReportInput(overrides: Partial<ReportPaymentInput> = {}): ReportPaymentInput {
  return {
    installmentId: INSTALLMENT_ID,
    tenantId: TENANT_ID,
    reportedByType: ReportedByType.CUSTOMER,
    reportedById: '00000000-0000-0000-0000-000000000030',
    amountRial: INSTALLMENT_AMOUNT,
    ...overrides,
  };
}

describe('PaymentAttempt entity (TASK-067)', () => {
  describe('report', () => {
    it('PaymentAttempt.report_creates_pending', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);

      expect(attempt.status).toBe(PaymentAttemptStatus.PENDING);
      expect(attempt.isPending()).toBe(true);
      expect(attempt.isTerminal()).toBe(false);
      expect(attempt.installmentId).toBe(INSTALLMENT_ID);
      expect(attempt.reportedByType).toBe(ReportedByType.CUSTOMER);
    });

    it('PaymentAttempt.report_rejects_paid_installment', () => {
      expect(() =>
        PaymentAttempt.report(baseReportInput(), InstallmentStatus.PAID),
      ).toThrow(new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_PAID));
    });

    it('rejects report on waived installment', () => {
      expect(() =>
        PaymentAttempt.report(baseReportInput(), InstallmentStatus.WAIVED),
      ).toThrow(new DomainError(InstallmentDomainErrorCode.INSTALLMENT_ALREADY_WAIVED));
    });

    it('PaymentAttempt.report_allows_partial_amount — BR-023', () => {
      const partial = PaymentAttempt.report(
        baseReportInput({ amountRial: 1_000_000n }),
        InstallmentStatus.PENDING,
      );
      const excess = PaymentAttempt.report(
        baseReportInput({ amountRial: 5_000_000n }),
        InstallmentStatus.OVERDUE,
      );

      expect(partial.amountRial).toBe(1_000_000n);
      expect(excess.amountRial).toBe(5_000_000n);
    });

    it('rejects zero report amount', () => {
      expect(() =>
        PaymentAttempt.report(baseReportInput({ amountRial: 0n }), InstallmentStatus.PENDING),
      ).toThrow(new DomainError(SaleDomainErrorCode.AMOUNT_MUST_BE_POSITIVE));
    });

    it('stores optional idempotency key and note', () => {
      const attempt = PaymentAttempt.report(
        baseReportInput({
          idempotencyKey: '00000000-0000-0000-0000-000000000099',
          note: '  واریز از مشتری  ',
        }),
        InstallmentStatus.PENDING,
      );

      expect(attempt.idempotencyKey).toBe('00000000-0000-0000-0000-000000000099');
      expect(attempt.note).toBe('واریز از مشتری');
    });
  });

  describe('confirm', () => {
    it('PaymentAttempt.confirm_from_pending', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);

      attempt.confirm('staff-confirm-1');

      expect(attempt.status).toBe(PaymentAttemptStatus.CONFIRMED);
      expect(attempt.confirmedByStaffId).toBe('staff-confirm-1');
      expect(attempt.confirmedAt).toBeInstanceOf(Date);
      expect(attempt.isTerminal()).toBe(true);
    });

    it('PaymentAttempt.confirm_rejects_when_confirmed', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);
      attempt.confirm('staff-1');

      expect(() => attempt.confirm('staff-2')).toThrow(
        new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED),
      );
    });

    it('rejects confirm when already rejected', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);
      attempt.reject('staff-1', 'مدرک ناقص');

      expect(() => attempt.confirm('staff-2')).toThrow(
        new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED),
      );
    });
  });

  describe('reject', () => {
    it('PaymentAttempt.reject_from_pending', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);

      attempt.reject('staff-reject-1', '  رسید نامعتبر  ');

      expect(attempt.status).toBe(PaymentAttemptStatus.REJECTED);
      expect(attempt.rejectedReason).toBe('رسید نامعتبر');
      expect(attempt.rejectedAt).toBeInstanceOf(Date);
      expect(attempt.confirmedByStaffId).toBeNull();
      expect(attempt.isTerminal()).toBe(true);
    });

    it('PaymentAttempt.reject_requires_reason', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);

      expect(() => attempt.reject('staff-1', '   ')).toThrow(
        new DomainError(PaymentAttemptDomainErrorCode.REJECT_REASON_REQUIRED),
      );
    });

    it('rejects reject when already confirmed', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);
      attempt.confirm('staff-1');

      expect(() => attempt.reject('staff-2', 'دیر شده')).toThrow(
        new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_CONFIRMED),
      );
    });

    it('rejects reject when already rejected', () => {
      const attempt = PaymentAttempt.report(baseReportInput(), InstallmentStatus.PENDING);
      attempt.reject('staff-1', 'اول');

      expect(() => attempt.reject('staff-2', 'دوم')).toThrow(
        new DomainError(PaymentAttemptDomainErrorCode.PAYMENT_ALREADY_REJECTED),
      );
    });
  });

  describe('reconstitute', () => {
    it('round-trips via toProps', () => {
      const created = PaymentAttempt.report(
        baseReportInput({ reportedByType: ReportedByType.STAFF }),
        InstallmentStatus.PENDING,
      );
      created.confirm('staff-1');
      const restored = PaymentAttempt.reconstitute(created.toProps());

      expect(restored.id).toBe(created.id);
      expect(restored.status).toBe(PaymentAttemptStatus.CONFIRMED);
      expect(restored.reportedByType).toBe(ReportedByType.STAFF);
    });
  });
});
