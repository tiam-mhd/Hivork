import { describe, expect, it } from 'vitest';

import { computeLineTotal, SaleLineItem } from './sale-line-item.entity.js';
import { MAX_SALE_LINE_ITEMS_PER_SALE } from './sale-line-item.constants.js';
import { DomainError } from '../errors/domain.error.js';

describe('computeLineTotal (IFP-068)', () => {
  it('calculates quantity * unitPrice - discount + tax', () => {
    expect(
      computeLineTotal({
        quantity: 2,
        unitPriceRial: 1_000_000n,
        discountRial: 200_000n,
        taxRial: 90_000n,
      }),
    ).toBe(1_890_000n);
  });

  it('rejects quantity zero', () => {
    expect(() =>
      computeLineTotal({
        quantity: 0,
        unitPriceRial: 1_000_000n,
      }),
    ).toThrow(/QUANTITY_INVALID/);
  });

  it('rejects discount greater than line subtotal', () => {
    expect(() =>
      computeLineTotal({
        quantity: 1,
        unitPriceRial: 1_000_000n,
        discountRial: 1_000_001n,
      }),
    ).toThrow(DomainError);
    expect(() =>
      computeLineTotal({
        quantity: 1,
        unitPriceRial: 1_000_000n,
        discountRial: 1_000_001n,
      }),
    ).toThrow(/DISCOUNT_EXCEEDS_LINE_TOTAL/);
  });
});

describe('SaleLineItem (IFP-068)', () => {
  const baseInput = {
    tenantId: 'tenant-1',
    saleId: 'sale-1',
    title: '  گوشی موبایل  ',
    unitPriceRial: 20_000_000n,
    createdById: 'staff-1',
  };

  it('creates line item with computed total', () => {
    const item = SaleLineItem.create({
      ...baseInput,
      quantity: 1,
      discountRial: 1_000_000n,
      taxRial: 500_000n,
      sku: ' SKU-001 ',
    });

    expect(item.title).toBe('گوشی موبایل');
    expect(item.lineTotalRial).toBe(19_500_000n);
    expect(item.toProps().sku).toBe('SKU-001');
  });

  it('enforces max line items per sale', () => {
    expect(() => SaleLineItem.assertLimit(MAX_SALE_LINE_ITEMS_PER_SALE)).toThrow(
      /LINE_ITEM_LIMIT_EXCEEDED/,
    );
  });
});
