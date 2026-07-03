import { describe, expect, it } from 'vitest';

import {
  ConfirmPaymentSchema,
  PaymentAttemptSchema,
  PaymentAttemptStatusSchema,
  RejectPaymentSchema,
  ReportPaymentSchema,
} from './payment.schema.js';

const INSTALLMENT_ID = '00000000-0000-0000-0000-000000000020';

describe('PaymentAttemptStatusSchema', () => {
  it('rejects invalid status', () => {
    expect(() => PaymentAttemptStatusSchema.parse('cancelled')).toThrow();
  });
});

describe('ReportPaymentSchema', () => {
  it('valid report passes', () => {
    const dto = ReportPaymentSchema.parse({
      installmentId: INSTALLMENT_ID,
      amountRial: '2000000',
      note: 'کارت به کارت کردم',
    });

    expect(dto.amountRial).toBe('2000000');
  });

  it('amount=0 fails', () => {
    expect(() =>
      ReportPaymentSchema.parse({
        installmentId: INSTALLMENT_ID,
        amountRial: '0',
      }),
    ).toThrow();
  });

  it('allows partial amount — BR-023', () => {
    const dto = ReportPaymentSchema.parse({
      installmentId: INSTALLMENT_ID,
      amountRial: '1000000',
    });

    expect(dto.amountRial).toBe('1000000');
  });
});

describe('ConfirmPaymentSchema', () => {
  it('parses confirm request with optimistic locking versions', () => {
    expect(
      ConfirmPaymentSchema.parse({
        note: 'رسید بانکی تطبیق شد',
        expectedAttemptVersion: 1,
        expectedInstallmentVersion: 3,
      }),
    ).toEqual({
      note: 'رسید بانکی تطبیق شد',
      expectedAttemptVersion: 1,
      expectedInstallmentVersion: 3,
    });
  });

  it('requires expected versions', () => {
    expect(() => ConfirmPaymentSchema.parse({ note: 'x' })).toThrow();
  });
});

describe('RejectPaymentSchema', () => {
  it('requires rejectedReason between 3 and 500 chars and expectedVersion', () => {
    expect(
      RejectPaymentSchema.parse({
        rejectedReason: 'رسید نادرست است',
        expectedVersion: 1,
      }),
    ).toEqual({
      rejectedReason: 'رسید نادرست است',
      expectedVersion: 1,
    });

    expect(() =>
      RejectPaymentSchema.parse({
        rejectedReason: 'ab',
        expectedVersion: 1,
      }),
    ).toThrow();
  });
});

describe('PaymentAttemptSchema', () => {
  it('parses pending payment response', () => {
    const attempt = PaymentAttemptSchema.parse({
      id: '00000000-0000-0000-0000-000000000030',
      installmentId: INSTALLMENT_ID,
      reportedByType: 'customer',
      reportedById: '00000000-0000-0000-0000-000000000040',
      amountRial: '2000000',
      note: null,
      status: 'pending',
      createdAt: '2025-01-15T10:30:00.000Z',
    });

    expect(attempt.status).toBe('pending');
    expect(attempt.reportedByType).toBe('customer');
  });
});
