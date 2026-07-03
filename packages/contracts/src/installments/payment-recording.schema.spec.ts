import { describe, expect, it } from 'vitest';

import {
  BankTransferDetailsSchema,
  CheckPaymentDetailsSchema,
  FeePaymentSchema,
  InitOnlinePaymentSchema,
  PartialPaymentSchema,
  PaymentAttemptDetailSchema,
  PaymentMethodSchema,
  PosDetailsSchema,
  RecordBankTransferPaymentSchema,
  RecordCashPaymentSchema,
  RecordCheckPaymentSchema,
  RecordFeePaymentSchema,
  RecordManualPaymentSchema,
  RecordPaymentRequestSchema,
  RecordPosPaymentSchema,
} from './payment-recording.schema.js';

const INSTALLMENT_ID = '00000000-0000-0000-0000-000000000020';
const EVIDENCE_FILE_ID = '00000000-0000-0000-0000-000000000021';
const IDEMPOTENCY_KEY = '00000000-0000-0000-0000-000000000022';

const basePayment = {
  installmentId: INSTALLMENT_ID,
  amountRial: '5000000',
};

describe('PaymentMethodSchema', () => {
  it('accepts all supported methods', () => {
    for (const method of [
      'cash',
      'manual',
      'bank_transfer',
      'online',
      'pos',
      'check',
      'fee',
    ] as const) {
      expect(PaymentMethodSchema.parse(method)).toBe(method);
    }
  });

  it('rejects unknown method', () => {
    expect(() => PaymentMethodSchema.parse('wallet')).toThrow();
  });
});

describe('RecordCashPaymentSchema', () => {
  it('parses valid cash payment', () => {
    const dto = RecordCashPaymentSchema.parse({
      ...basePayment,
      method: 'cash',
      note: 'دریافت نقدی',
      evidenceFileId: EVIDENCE_FILE_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      paidAt: '2026-07-15T14:30:00.000Z',
    });

    expect(dto.method).toBe('cash');
    expect(dto.amountRial).toBe('5000000');
  });
});

describe('RecordManualPaymentSchema', () => {
  it('parses valid manual payment', () => {
    const dto = RecordManualPaymentSchema.parse({
      ...basePayment,
      method: 'manual',
    });

    expect(dto.method).toBe('manual');
  });
});

describe('RecordBankTransferPaymentSchema', () => {
  it('parses valid bank transfer payment', () => {
    const dto = RecordBankTransferPaymentSchema.parse({
      ...basePayment,
      method: 'bank_transfer',
      bankName: 'ملی',
      referenceNumber: 'REF-12345',
      transferDate: '2026-07-15',
      accountLast4: '1234',
    });

    expect(dto.method).toBe('bank_transfer');
    expect(dto.referenceNumber).toBe('REF-12345');
  });

  it('rejects missing bank reference fields', () => {
    expect(() =>
      RecordBankTransferPaymentSchema.parse({
        ...basePayment,
        method: 'bank_transfer',
        bankName: 'ملی',
        transferDate: '2026-07-15',
      }),
    ).toThrow();
  });
});

describe('RecordPosPaymentSchema', () => {
  it('parses valid pos payment', () => {
    const dto = RecordPosPaymentSchema.parse({
      ...basePayment,
      method: 'pos',
      terminalId: 'POS-01',
      traceNumber: 'TRACE-99',
      cardLast4: '4321',
    });

    expect(dto.method).toBe('pos');
    expect(dto.terminalId).toBe('POS-01');
  });
});

describe('RecordCheckPaymentSchema', () => {
  it('parses valid check payment', () => {
    const dto = RecordCheckPaymentSchema.parse({
      ...basePayment,
      method: 'check',
      checkNumber: '123456',
      bankName: 'ملت',
      dueDate: '2026-08-01',
      drawerName: 'علی رضایی',
    });

    expect(dto.method).toBe('check');
    expect(dto.drawerName).toBe('علی رضایی');
  });
});

describe('RecordFeePaymentSchema', () => {
  it('parses valid fee payment', () => {
    const dto = RecordFeePaymentSchema.parse({
      ...basePayment,
      method: 'fee',
      feeType: 'late_fee',
      feeDescription: 'جریمه دیرکرد',
    });

    expect(dto.feeType).toBe('late_fee');
  });
});

describe('InitOnlinePaymentSchema', () => {
  it('parses online payment init request', () => {
    const dto = InitOnlinePaymentSchema.parse({
      installmentId: INSTALLMENT_ID,
      amountRial: '2500000',
      returnUrl: 'https://shop.example.com/payments/callback',
    });

    expect(dto.returnUrl).toContain('https://');
  });
});

describe('amount validation', () => {
  it('rejects zero amount', () => {
    expect(() =>
      RecordCashPaymentSchema.parse({
        ...basePayment,
        amountRial: '0',
        method: 'cash',
      }),
    ).toThrow();
  });

  it('rejects decimal amount', () => {
    expect(() =>
      RecordCashPaymentSchema.parse({
        ...basePayment,
        amountRial: '1000.50',
        method: 'cash',
      }),
    ).toThrow();
  });

  it('rejects leading-zero amount', () => {
    expect(() =>
      RecordCashPaymentSchema.parse({
        ...basePayment,
        amountRial: '0500000',
        method: 'cash',
      }),
    ).toThrow();
  });
});

describe('RecordPaymentRequestSchema', () => {
  it('narrows bank transfer variant', () => {
    const dto = RecordPaymentRequestSchema.parse({
      ...basePayment,
      method: 'bank_transfer',
      bankName: 'ملی',
      referenceNumber: 'REF-1',
      transferDate: '2026-07-15',
    });

    expect(dto.method).toBe('bank_transfer');
    if (dto.method === 'bank_transfer') {
      expect(dto.bankName).toBe('ملی');
    }
  });

  it('narrows fee variant', () => {
    const dto = RecordPaymentRequestSchema.parse({
      ...basePayment,
      method: 'fee',
      feeType: 'service_fee',
      feeDescription: 'هزینه خدمات',
    });

    expect(dto.method).toBe('fee');
    if (dto.method === 'fee') {
      expect(dto.feeDescription).toBe('هزینه خدمات');
    }
  });
});

describe('PartialPaymentSchema', () => {
  it('allows partial amount when setting enabled', () => {
    expect(
      PartialPaymentSchema.parse({
        amountRial: '1000000',
        remainingAmountRial: '5000000',
        allowPartial: true,
      }),
    ).toEqual({
      amountRial: '1000000',
      remainingAmountRial: '5000000',
      allowPartial: true,
    });
  });

  it('rejects partial amount when setting disabled', () => {
    expect(() =>
      PartialPaymentSchema.parse({
        amountRial: '1000000',
        remainingAmountRial: '5000000',
        allowPartial: false,
      }),
    ).toThrow(/PARTIAL_PAYMENT_NOT_ALLOWED/);
  });

  it('rejects amount above remaining', () => {
    expect(() =>
      PartialPaymentSchema.parse({
        amountRial: '6000000',
        remainingAmountRial: '5000000',
        allowPartial: true,
      }),
    ).toThrow(/AMOUNT_EXCEEDS_REMAINING/);
  });
});

describe('note length', () => {
  it('rejects note longer than 2000 chars', () => {
    expect(() =>
      RecordCashPaymentSchema.parse({
        ...basePayment,
        method: 'cash',
        note: 'a'.repeat(2001),
      }),
    ).toThrow();
  });
});

describe('detail-only schemas', () => {
  it('parses bank transfer details', () => {
    expect(
      BankTransferDetailsSchema.parse({
        bankName: 'ملی',
        referenceNumber: 'REF-1',
        transferDate: '2026-07-15',
      }).referenceNumber,
    ).toBe('REF-1');
  });

  it('parses pos details', () => {
    expect(
      PosDetailsSchema.parse({
        terminalId: 'POS-1',
        traceNumber: 'T-1',
      }).terminalId,
    ).toBe('POS-1');
  });

  it('parses check details', () => {
    expect(
      CheckPaymentDetailsSchema.parse({
        checkNumber: '123',
        bankName: 'ملت',
        dueDate: '2026-08-01',
        drawerName: 'علی',
      }).drawerName,
    ).toBe('علی');
  });

  it('parses fee details', () => {
    expect(
      FeePaymentSchema.parse({
        feeType: 'other',
        feeDescription: 'سایر',
      }).feeType,
    ).toBe('other');
  });
});

describe('PaymentAttemptDetailSchema', () => {
  it('parses pending payment attempt response', () => {
    const dto = PaymentAttemptDetailSchema.parse({
      id: '00000000-0000-0000-0000-000000000030',
      installmentId: INSTALLMENT_ID,
      amountRial: '5000000',
      status: 'pending',
      reportedByType: 'staff',
      method: 'cash',
      methodDetails: { method: 'cash' },
      note: 'نقدی',
      createdAt: '2026-07-15T14:30:00.000Z',
      confirmedAt: null,
      version: 1,
    });

    expect(dto.status).toBe('pending');
    expect(dto.method).toBe('cash');
  });
});
