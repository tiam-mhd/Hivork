import { describe, expect, it } from 'vitest';

import {
  BulkUpsertLineItemsSchema,
  CreateSaleLineItemSchema,
  RecalculateSaleFinancialsSchema,
  SaleLineItemSchema,
  UpdateSaleFinancialsSchema,
} from './sale-line-item.schema.js';

const SALE_ID = '00000000-0000-0000-0000-000000000010';
const ITEM_ID = '00000000-0000-0000-0000-000000000020';

describe('SaleLineItemSchema (IFP-071)', () => {
  it('parses line item payload', () => {
    const parsed = SaleLineItemSchema.parse({
      id: ITEM_ID,
      saleId: SALE_ID,
      title: 'گوشی سامسونگ',
      sku: 'SKU-001',
      quantity: 2,
      unitPriceRial: '5000000',
      discountRial: '200000',
      taxRial: '100000',
      lineTotalRial: '9900000',
      sortOrder: 0,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      createdById: '00000000-0000-0000-0000-000000000099',
      version: 1,
    });

    expect(parsed.lineTotalRial).toBe('9900000');
  });
});

describe('CreateSaleLineItemSchema', () => {
  it('applies quantity and discount defaults', () => {
    const parsed = CreateSaleLineItemSchema.parse({
      title: 'محصول',
      unitPriceRial: '1000000',
    });

    expect(parsed.quantity).toBe(1);
    expect(parsed.discountRial).toBe('0');
    expect(parsed.taxRial).toBe('0');
  });
});

describe('BulkUpsertLineItemsSchema', () => {
  it('rejects more than 100 items', () => {
    expect(() =>
      BulkUpsertLineItemsSchema.parse({
        expectedVersion: 1,
        items: Array.from({ length: 101 }, (_, index) => ({
          title: `Item ${index}`,
          unitPriceRial: '1000',
        })),
      }),
    ).toThrow();
  });
});

describe('UpdateSaleFinancialsSchema', () => {
  it('accepts tax rate in basis points', () => {
    const parsed = UpdateSaleFinancialsSchema.parse({
      expectedVersion: 2,
      taxRateBps: 900,
      taxInclusive: false,
    });

    expect(parsed.taxRateBps).toBe(900);
  });

  it('rejects taxRateBps above 10000', () => {
    expect(() =>
      UpdateSaleFinancialsSchema.parse({
        expectedVersion: 1,
        taxRateBps: 10_001,
      }),
    ).toThrow();
  });
});

describe('RecalculateSaleFinancialsSchema', () => {
  it('defaults regenerateInstallments to false', () => {
    expect(
      RecalculateSaleFinancialsSchema.parse({ expectedVersion: 3 }).regenerateInstallments,
    ).toBe(false);
  });
});
