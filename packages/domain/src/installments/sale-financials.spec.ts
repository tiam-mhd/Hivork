import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors/domain.error.js';
import { applyTaxRateBps, SaleFinancials } from './sale-financials.js';

describe('SaleFinancials.recalculateTotals (IFP-069)', () => {
  const singleLine = {
    quantity: 2,
    unitPriceRial: 5_000_000n,
    discountRial: 200_000n,
    taxRial: 100_000n,
  };

  it('sums line totals into subtotal (line tax included in subtotal)', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {});

    expect(result.subtotalRial).toBe(9_900_000n);
    expect(result.lineTaxRial).toBe(100_000n);
    expect(result.headerTaxRial).toBe(0n);
    expect(result.taxRial).toBe(100_000n);
    expect(result.totalAmountRial).toBe(9_900_000n);
  });

  it('tax inclusive — no header tax applied', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {
      taxInclusive: true,
      taxRateBps: 900,
      taxRial: 500_000n,
    });

    expect(result.headerTaxRial).toBe(0n);
    expect(result.totalAmountRial).toBe(9_900_000n);
  });

  it('tax exclusive — applies taxRateBps to subtotal', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {
      taxRateBps: 900,
    });

    expect(result.headerTaxRial).toBe(891_000n);
    expect(result.taxRial).toBe(991_000n);
    expect(result.totalAmountRial).toBe(10_791_000n);
  });

  it('fixed taxRial wins over taxRateBps', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {
      taxRial: 250_000n,
      taxRateBps: 900,
    });

    expect(result.headerTaxRial).toBe(250_000n);
    expect(result.totalAmountRial).toBe(10_150_000n);
  });

  it('adds insurance to total when included (default)', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {
      insuranceRial: 500_000n,
    });

    expect(result.insuranceRial).toBe(500_000n);
    expect(result.totalAmountRial).toBe(10_400_000n);
  });

  it('excludes insurance from total when tenant setting is false', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {
      insuranceRial: 500_000n,
      insuranceIncludedInTotal: false,
    });

    expect(result.insuranceRial).toBe(500_000n);
    expect(result.totalAmountRial).toBe(9_900_000n);
  });

  it('flags expired insurance without blocking recalculation', () => {
    const result = SaleFinancials.recalculateTotals([singleLine], {
      insuranceRial: 100_000n,
      insuranceExpiresAt: new Date('2025-01-01'),
      asOf: new Date('2026-07-01'),
    });

    expect(result.insuranceExpired).toBe(true);
    expect(result.totalAmountRial).toBe(10_000_000n);
  });

  it('uses precomputed lineTotalRial when provided', () => {
    const result = SaleFinancials.recalculateTotals(
      [{ ...singleLine, lineTotalRial: 8_000_000n }],
      { taxRial: 0n },
    );

    expect(result.subtotalRial).toBe(8_000_000n);
  });

  it('rejects invalid tax rate via assertValidTaxRateBps', () => {
    expect(() => SaleFinancials.assertValidTaxRateBps(10_001)).toThrow(DomainError);
    expect(() =>
      SaleFinancials.recalculateTotals([singleLine], { taxRateBps: 10_001 }),
    ).toThrow(DomainError);
  });
});

describe('applyTaxRateBps', () => {
  it('rounds half up at 900 bps (9%)', () => {
    expect(applyTaxRateBps(10_000_000n, 900)).toBe(900_000n);
    expect(applyTaxRateBps(10_000_001n, 900)).toBe(900_000n);
  });
});
