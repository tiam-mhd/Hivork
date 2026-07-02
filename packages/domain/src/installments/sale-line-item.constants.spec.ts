import { describe, expect, it } from 'vitest';

import { MAX_SALE_LINE_ITEMS_PER_SALE } from './sale-line-item.constants.js';

describe('SaleLineItem constants (IFP-068)', () => {
  it('defines max line items per sale', () => {
    expect(MAX_SALE_LINE_ITEMS_PER_SALE).toBe(100);
  });
});
