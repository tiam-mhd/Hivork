import { describe, expect, it } from 'vitest';

import { resolveQuickActionVisibility } from './quick-actions.utils';

describe('resolveQuickActionVisibility', () => {
  it('hides sale action without installments.sale.create', () => {
    const result = resolveQuickActionVisibility((p) => p === 'installments.customer.create');
    expect(result.showSale).toBe(false);
    expect(result.showCustomer).toBe(true);
    expect(result.showAny).toBe(true);
  });

  it('hides all actions when no create permissions', () => {
    const result = resolveQuickActionVisibility(() => false);
    expect(result.showSale).toBe(false);
    expect(result.showCustomer).toBe(false);
    expect(result.showAny).toBe(false);
  });
});
