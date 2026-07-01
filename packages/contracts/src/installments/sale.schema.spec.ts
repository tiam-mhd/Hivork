import { describe, expect, it } from 'vitest';

import {
  CancelSaleSchema,
  CreateSaleSchema,
  ListSalesQuerySchema,
  SaleDetailSchema,
} from './sale.schema.js';
import {
  bigintRialNonNegativeTransformSchema,
  bigintRialPositiveTransformSchema,
  bigintRialStringSchema,
  dateOnlySchema,
  parseBigIntRial,
} from '../common/money.schema.js';

const VALID_CREATE = {
  tenantCustomerId: '00000000-0000-0000-0000-000000000001',
  branchId: '00000000-0000-0000-0000-000000000002',
  title: 'موبایل سامسونگ S23',
  totalAmountRial: '25000000',
  downPaymentRial: '5000000',
  installmentCount: 10,
  firstDueDate: '2025-02-01',
  contractDate: '2025-01-15',
};

describe('money.schema', () => {
  it('parses positive rial string to bigint', () => {
    expect(parseBigIntRial('25000000')).toBe(25_000_000n);
    expect(bigintRialPositiveTransformSchema.parse('1000')).toBe(1000n);
    expect(bigintRialNonNegativeTransformSchema.parse('0')).toBe(0n);
  });

  it('rejects non-digit rial strings', () => {
    expect(() => bigintRialStringSchema.parse('12.5')).toThrow();
    expect(() => bigintRialStringSchema.parse('0')).toThrow();
  });

  it('validates date-only format', () => {
    expect(dateOnlySchema.parse('2025-02-01')).toBe('2025-02-01');
    expect(() => dateOnlySchema.parse('2025/02/01')).toThrow();
  });
});

describe('CreateSaleSchema', () => {
  it('valid payload passes', () => {
    const result = CreateSaleSchema.parse(VALID_CREATE);
    expect(result.totalAmountRial).toBe('25000000');
    expect(result.downPaymentRial).toBe('5000000');
    expect(result.intervalDays).toBe(30);
  });

  it('downPayment > total → AMOUNT_EXCEEDS_TOTAL', () => {
    const result = CreateSaleSchema.safeParse({
      ...VALID_CREATE,
      totalAmountRial: '5000000',
      downPaymentRial: '6000000',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === 'AMOUNT_EXCEEDS_TOTAL')).toBe(
        true,
      );
    }
  });

  it('installmentCount=0 fails', () => {
    expect(() => CreateSaleSchema.parse({ ...VALID_CREATE, installmentCount: 0 })).toThrow();
  });

  it('installmentCount=121 fails', () => {
    expect(() => CreateSaleSchema.parse({ ...VALID_CREATE, installmentCount: 121 })).toThrow();
  });

  it('invalid date format fails', () => {
    expect(() =>
      CreateSaleSchema.parse({ ...VALID_CREATE, firstDueDate: '2025/02/01' }),
    ).toThrow();
  });

  it('full prepay requires installmentCount=1 — BR-004', () => {
    expect(() =>
      CreateSaleSchema.parse({
        ...VALID_CREATE,
        totalAmountRial: '5000000',
        downPaymentRial: '5000000',
        installmentCount: 3,
      }),
    ).toThrow();
  });
});

describe('CancelSaleSchema', () => {
  it('reason min 3 chars', () => {
    expect(CancelSaleSchema.parse({ reason: 'مشتری پشیمان شد' }).reason).toBe('مشتری پشیمان شد');
    expect(() => CancelSaleSchema.parse({ reason: 'ab' })).toThrow();
  });
});

describe('ListSalesQuerySchema', () => {
  it('limit default 20, max 100', () => {
    expect(ListSalesQuerySchema.parse({}).limit).toBe(20);
    expect(ListSalesQuerySchema.parse({ limit: '50' }).limit).toBe(50);
    expect(() => ListSalesQuerySchema.parse({ limit: 101 })).toThrow();
  });
});

describe('SaleDetailSchema', () => {
  it('parses full API response sample', () => {
    const parsed = SaleDetailSchema.parse({
      id: '00000000-0000-0000-0000-000000000010',
      tenantCustomerId: '00000000-0000-0000-0000-000000000001',
      customer: {
        id: '00000000-0000-0000-0000-000000000001',
        phone: '09121234567',
        name: 'حسین احمدی',
      },
      branchId: '00000000-0000-0000-0000-000000000002',
      title: 'موبایل سامسونگ S23',
      totalAmountRial: '25000000',
      downPaymentRial: '5000000',
      installmentCount: 10,
      status: 'active',
      createdAt: '2025-01-15T10:30:00.000Z',
      installments: [
        {
          id: '00000000-0000-0000-0000-000000000020',
          sequenceNumber: 1,
          dueDate: '2025-02-01T00:00:00.000Z',
          amountRial: '2000000',
          status: 'pending',
        },
        {
          id: '00000000-0000-0000-0000-000000000021',
          sequenceNumber: 2,
          dueDate: '2025-03-01T00:00:00.000Z',
          amountRial: '2000000',
          status: 'paid',
          paidAt: '2025-02-02T10:00:00.000Z',
          confirmedBy: '00000000-0000-0000-0000-000000000099',
        },
      ],
    });

    expect(parsed.installments).toHaveLength(2);
    expect(parsed.customer?.phone).toBe('09121234567');
  });
});
