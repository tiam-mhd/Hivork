import { describe, expect, it } from 'vitest';

import {
  ListEnabledPaymentMethodsResponseSchema,
  PaymentMethodConfigSchema,
  PaymentMethodPlanTierSchema,
} from './payment-method-config.schema.js';
import {
  CreateUnifiedPaymentSchema,
  INTERNAL_TO_UNIFIED_PAYMENT_METHOD,
  mapInternalMethodToUnified,
  mapUnifiedMethodToInternal,
  UNIFIED_TO_INTERNAL_PAYMENT_METHOD,
  UnifiedPaymentMethodSchema,
  UnifiedPaymentResponseSchema,
} from './unified-payment.schema.js';

const INSTALLMENT_ID = '00000000-0000-0000-0000-000000000020';

const basePayment = {
  installmentId: INSTALLMENT_ID,
  amountRial: '5000000',
};

describe('UnifiedPaymentMethodSchema', () => {
  it('accepts all seven product-facing methods', () => {
    for (const method of [
      'online',
      'in_person',
      'cash',
      'card',
      'check',
      'bank_transfer',
      'wallet',
    ] as const) {
      expect(UnifiedPaymentMethodSchema.parse(method)).toBe(method);
    }
  });

  it('rejects unknown method', () => {
    expect(() => UnifiedPaymentMethodSchema.parse('pos')).toThrow();
  });
});

describe('CreateUnifiedPaymentSchema', () => {
  it('parses cash variant', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'cash',
      note: 'دریافت نقدی',
    });

    expect(dto.method).toBe('cash');
    if (dto.method === 'cash') {
      expect(dto.note).toBe('دریافت نقدی');
    }
  });

  it('parses in_person variant', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'in_person',
      receivedAt: '2026-07-15T14:30:00.000Z',
    });

    expect(dto.method).toBe('in_person');
  });

  it('parses bank_transfer variant', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'bank_transfer',
      bankName: 'ملی',
      referenceNumber: 'REF-12345',
      transferDate: '2026-07-15',
    });

    expect(dto.method).toBe('bank_transfer');
    if (dto.method === 'bank_transfer') {
      expect(dto.referenceNumber).toBe('REF-12345');
    }
  });

  it('rejects bank_transfer missing referenceNumber', () => {
    expect(() =>
      CreateUnifiedPaymentSchema.parse({
        ...basePayment,
        method: 'bank_transfer',
        bankName: 'ملی',
        transferDate: '2026-07-15',
      }),
    ).toThrow();
  });

  it('parses card variant', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'card',
      terminalId: 'POS-01',
      traceNumber: 'TRACE-99',
    });

    expect(dto.method).toBe('card');
    if (dto.method === 'card') {
      expect(dto.terminalId).toBe('POS-01');
    }
  });

  it('parses online variant', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'online',
      returnUrl: 'https://shop.example.com/payments/callback',
    });

    expect(dto.method).toBe('online');
  });

  it('parses check variant', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'check',
      checkNumber: '123456',
      bankName: 'ملت',
      dueDate: '2026-08-01',
      drawerName: 'علی رضایی',
    });

    expect(dto.method).toBe('check');
  });

  it('parses wallet variant with provider', () => {
    const dto = CreateUnifiedPaymentSchema.parse({
      ...basePayment,
      method: 'wallet',
      walletProvider: 'zarinpal_wallet',
    });

    expect(dto.method).toBe('wallet');
    if (dto.method === 'wallet') {
      expect(dto.walletProvider).toBe('zarinpal_wallet');
    }
  });

  it('rejects wallet without provider', () => {
    expect(() =>
      CreateUnifiedPaymentSchema.parse({
        ...basePayment,
        method: 'wallet',
      }),
    ).toThrow();
  });

  it('rejects invalid amountRial', () => {
    expect(() =>
      CreateUnifiedPaymentSchema.parse({
        ...basePayment,
        amountRial: '0',
        method: 'cash',
      }),
    ).toThrow();
  });

  it('rejects unknown discriminant', () => {
    expect(() =>
      CreateUnifiedPaymentSchema.parse({
        ...basePayment,
        method: 'fee',
      }),
    ).toThrow();
  });
});

describe('UnifiedPaymentResponseSchema', () => {
  it('parses response with optional ledgerEntryId and redirectUrl', () => {
    const dto = UnifiedPaymentResponseSchema.parse({
      paymentAttempt: {
        id: '00000000-0000-0000-0000-000000000030',
        installmentId: INSTALLMENT_ID,
        amountRial: '5000000',
        status: 'pending',
        method: 'online',
        createdAt: '2026-07-15T14:30:00.000Z',
        version: 1,
      },
      ledgerEntryId: '00000000-0000-0000-0000-000000000040',
      redirectUrl: 'https://gateway.example.com/pay/token',
    });

    expect(dto.paymentAttempt.method).toBe('online');
    expect(dto.ledgerEntryId).toBeTruthy();
    expect(dto.redirectUrl).toContain('https://');
  });
});

describe('PaymentMethodConfigSchema', () => {
  it('parses enabled method config', () => {
    const dto = PaymentMethodConfigSchema.parse({
      method: 'cash',
      enabled: true,
      displayOrder: 0,
      labelFa: 'نقدی',
    });

    expect(dto.enabled).toBe(true);
  });

  it('parses pro-gated online method', () => {
    const dto = PaymentMethodConfigSchema.parse({
      method: 'online',
      enabled: false,
      displayOrder: 10,
      labelFa: 'پرداخت آنلاین',
      requiresPlan: 'pro',
    });

    expect(PaymentMethodPlanTierSchema.parse(dto.requiresPlan)).toBe('pro');
  });

  it('rejects empty labelFa', () => {
    expect(() =>
      PaymentMethodConfigSchema.parse({
        method: 'cash',
        enabled: true,
        displayOrder: 0,
        labelFa: '   ',
      }),
    ).toThrow();
  });
});

describe('ListEnabledPaymentMethodsResponseSchema', () => {
  it('parses methods list with disabledReason', () => {
    const dto = ListEnabledPaymentMethodsResponseSchema.parse({
      methods: [
        {
          method: 'cash',
          enabled: true,
          displayOrder: 0,
          labelFa: 'نقدی',
        },
        {
          method: 'online',
          enabled: false,
          displayOrder: 1,
          labelFa: 'آنلاین',
          requiresPlan: 'pro',
          disabledReason: 'plan_required',
        },
      ],
    });

    expect(dto.methods).toHaveLength(2);
    expect(dto.methods[1]?.disabledReason).toBe('plan_required');
  });
});

describe('payment method mapping', () => {
  it('maps unified methods to internal IFP-086 codes', () => {
    expect(UNIFIED_TO_INTERNAL_PAYMENT_METHOD.card).toBe('pos');
    expect(UNIFIED_TO_INTERNAL_PAYMENT_METHOD.in_person).toBe('manual');
    expect(mapUnifiedMethodToInternal('cash')).toBe('cash');
  });

  it('maps internal codes back to unified product methods', () => {
    expect(INTERNAL_TO_UNIFIED_PAYMENT_METHOD.pos).toBe('card');
    expect(INTERNAL_TO_UNIFIED_PAYMENT_METHOD.manual).toBe('cash');
    expect(mapInternalMethodToUnified('pos')).toBe('card');
  });

  it('prefers unifiedMethod hint for manual in_person', () => {
    expect(mapInternalMethodToUnified('manual', 'in_person')).toBe('in_person');
  });
});
