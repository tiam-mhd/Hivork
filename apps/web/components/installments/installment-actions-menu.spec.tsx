import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InstallmentActionsMenu } from '@/components/installments/installment-actions-menu';
import type { InstallmentDetailView } from '@/hooks/use-installment-detail';

vi.mock('@/hooks/use-permission', () => ({
  usePermission: () => false,
}));

const baseDetail: InstallmentDetailView = {
  version: 1,
  installment: {
    id: '11111111-1111-4111-8111-111111111111',
    sequenceNumber: 1,
    dueDate: '2026-07-01T00:00:00.000Z',
    amountRial: '10000000',
    status: 'pending',
    version: 1,
  },
  sale: {
    id: '22222222-2222-4222-8222-222222222222',
    tenantCustomerId: '33333333-3333-4333-8333-333333333333',
    branchId: '44444444-4444-4444-8444-444444444444',
    title: 'قرارداد تست',
    totalAmountRial: '10000000',
    downPaymentRial: '0',
    installmentCount: 1,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    installments: [],
  } as unknown as InstallmentDetailView['sale'],
};

describe('InstallmentActionsMenu permission gates', () => {
  it('hides actions when staff lacks permissions', () => {
    render(
      <InstallmentActionsMenu
        detail={baseDetail}
        version={1}
        onRefresh={() => undefined}
        onVersionChange={() => undefined}
        onToast={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'بخشودگی' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ثبت تخفیف' })).toBeNull();
    expect(screen.getByText(/عملیاتی در دسترس نیست/)).toBeTruthy();
  });
});
