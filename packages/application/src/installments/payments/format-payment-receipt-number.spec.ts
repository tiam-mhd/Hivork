import { describe, expect, it } from 'vitest';

import { formatPaymentReceiptNumber } from './format-payment-receipt-number.js';

describe('formatPaymentReceiptNumber', () => {
  it('formats tenant code, jalali year-month, and padded sequence', () => {
    const number = formatPaymentReceiptNumber(
      'hv',
      42,
      new Date('2026-07-02T12:00:00.000Z'),
    );

    expect(number).toMatch(/^HV-\d{6}-00042$/);
  });
});
