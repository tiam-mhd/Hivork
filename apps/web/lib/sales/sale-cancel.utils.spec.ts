import type { SaleDetailDto } from '@hivork/contracts/installments';
import { describe, expect, it } from 'vitest';

import { canCancelSale } from '@/lib/sales/sale-cancel.utils';

function makeSale(
  overrides: Partial<SaleDetailDto> = {},
): Pick<SaleDetailDto, 'status' | 'installments'> {
  return {
    status: 'active',
    installments: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        sequenceNumber: 1,
        dueDate: '2026-08-01T00:00:00.000Z',
        amountRial: '1000000',
        status: 'pending',
      },
    ],
    ...overrides,
  };
}

describe('canCancelSale', () => {
  it('allows cancel when active with no paid installments and permission', () => {
    expect(canCancelSale(true, makeSale()).allowed).toBe(true);
  });

  it('denies cancel without permission', () => {
    expect(canCancelSale(false, makeSale()).allowed).toBe(false);
  });

  it('denies cancel when sale is cancelled', () => {
    const result = canCancelSale(true, makeSale({ status: 'cancelled' }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('لغو شده');
  });

  it('denies cancel when any installment is paid', () => {
    const result = canCancelSale(
      true,
      makeSale({
        installments: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            sequenceNumber: 1,
            dueDate: '2026-08-01T00:00:00.000Z',
            amountRial: '1000000',
            status: 'paid',
          },
          {
            id: '00000000-0000-0000-0000-000000000002',
            sequenceNumber: 2,
            dueDate: '2026-09-01T00:00:00.000Z',
            amountRial: '1000000',
            status: 'pending',
          },
        ],
      }),
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('پرداخت‌شده');
  });
});
