import { describe, expect, it } from 'vitest';

import { getInstallmentStatusPresentation } from '@/lib/sales/installment-status';

describe('installment status presentation (IFP-099)', () => {
  it('uses blue styling for pending installments', () => {
    const pending = getInstallmentStatusPresentation('pending');
    expect(pending.className).toContain('blue');
  });

  it('uses red styling for overdue installments', () => {
    const overdue = getInstallmentStatusPresentation('overdue');
    expect(overdue.className).toContain('red');
  });

  it('uses green styling for paid installments', () => {
    const paid = getInstallmentStatusPresentation('paid');
    expect(paid.className).toContain('emerald');
  });

  it('uses muted styling for waived installments', () => {
    const waived = getInstallmentStatusPresentation('waived');
    expect(waived.className).toContain('muted');
  });
});
