import { describe, expect, it } from 'vitest';

import { computeInstallmentPreview } from '@/hooks/use-installment-preview';
import { EMPTY_SALE_FORM_VALUES } from '@/lib/schemas/sale-form.schema';

function futureIsoDate(daysFromNow = 7): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

describe('computeInstallmentPreview', () => {
  it('matches BR-005 example for 10M/3 installments', () => {
    const preview = computeInstallmentPreview({
      ...EMPTY_SALE_FORM_VALUES,
      totalAmountRial: '10000000',
      downPaymentRial: '0',
      installmentCount: '3',
      firstDueDate: futureIsoDate(),
      intervalDays: '30',
    });

    expect(preview.isReady).toBe(true);
    expect(preview.items).toHaveLength(3);
    expect(preview.items[0]?.amountRial).toBe(3_333_334n);
    expect(preview.items[1]?.amountRial).toBe(3_333_333n);
    expect(preview.items[2]?.amountRial).toBe(3_333_333n);
    expect(preview.sumMatches).toBe(true);
    expect(preview.remainingRial).toBe(10_000_000n);
  });

  it('returns empty preview when inputs are incomplete', () => {
    const preview = computeInstallmentPreview(EMPTY_SALE_FORM_VALUES);
    expect(preview.isReady).toBe(false);
    expect(preview.items).toHaveLength(0);
  });
});
