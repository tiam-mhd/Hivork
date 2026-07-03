import { describe, expect, it } from 'vitest';

import { validateDiscount } from './discount-calculator.service.js';

describe('discount-calculator.service', () => {
  const settings = {
    discount_max_percent_bps: 5000,
    min_installment_rial: 1_000_000n,
  };

  it('accepts valid discount within limits', () => {
    const result = validateDiscount({
      currentAmountRial: 10_000_000n,
      discountRial: 2_000_000n,
      settings,
    });

    expect(result.newAmountRial).toBe(8_000_000n);
  });

  it('rejects discount exceeding installment amount', () => {
    expect(() =>
      validateDiscount({
        currentAmountRial: 5_000_000n,
        discountRial: 6_000_000n,
        settings,
      }),
    ).toThrow('DISCOUNT_EXCEEDS_AMOUNT');
  });

  it('rejects discount below minimum installment amount', () => {
    expect(() =>
      validateDiscount({
        currentAmountRial: 5_000_000n,
        discountRial: 4_500_000n,
        settings,
      }),
    ).toThrow('INSTALLMENT_AMOUNT_TOO_LOW');
  });

  it('rejects discount exceeding max percent', () => {
    expect(() =>
      validateDiscount({
        currentAmountRial: 10_000_000n,
        discountRial: 6_000_000n,
        settings,
      }),
    ).toThrow('DISCOUNT_MAX_EXCEEDED');
  });
});
