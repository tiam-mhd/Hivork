import type { SaleDetailEnterpriseDto } from '@hivork/contracts/installments';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContractLifecycleActions } from './contract-lifecycle-actions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-permission', () => ({
  usePermission: () => true,
}));

vi.mock('@/hooks/use-api-error', () => ({
  useApiError: () => ({
    resolve: () => 'خطا',
  }),
}));

vi.mock('@/components/date-picker', () => ({
  DatePicker: ({ label, value, onChange }: { label?: string; value?: string; onChange: (value?: string) => void }) => (
    <label>
      <span>{label}</span>
      <input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}));

HTMLDialogElement.prototype.showModal = function showModal() {
  this.open = true;
};

HTMLDialogElement.prototype.close = function close() {
  this.open = false;
};

const SALE: SaleDetailEnterpriseDto = {
  id: '00000000-0000-0000-0000-000000000001',
  tenantCustomerId: '00000000-0000-0000-0000-000000000002',
  branchId: '00000000-0000-0000-0000-000000000003',
  title: 'قرارداد نمونه',
  totalAmountRial: '12000000',
  downPaymentRial: '2000000',
  installmentCount: 3,
  status: 'active',
  paidCount: 0,
  contractDate: '2026-07-01T00:00:00.000Z',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  installments: [],
  version: 1,
  contractNumber: 'CTR-1405-000001',
  customTerms: null,
  signatureStatus: 'unsigned',
  signedAt: null,
  insuranceRial: '0',
  insuranceProvider: null,
  insurancePolicyNumber: null,
  insuranceExpiresAt: null,
  insuranceExpiredWarning: false,
  taxRateBps: null,
  taxInclusive: false,
  extendedFromSaleId: null,
  copiedFromSaleId: null,
  terminatedAt: null,
  closedAt: null,
  archivedAt: null,
  versions: [],
  attachments: [],
  customer: {
    id: '00000000-0000-0000-0000-000000000020',
    phone: '09120000000',
    name: 'مشتری نمونه',
  },
};

describe('ContractLifecycleActions', () => {
  it('requires terminate confirmations before enabling submit', () => {
    render(
      <ContractLifecycleActions
        sale={SALE}
        onUpdated={() => undefined}
        onToast={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'فسخ قرارداد' }));

    const submit = screen.getByRole('button', { name: 'تایید فسخ' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('دلیل فسخ'), { target: { value: 'عدم تعهد' } });
    fireEvent.click(screen.getByLabelText('فسخ قرارداد را تایید می‌کنم.'));
    fireEvent.change(screen.getByLabelText('برای تایید، عبارت زیر را وارد کنید'), {
      target: { value: 'CTR-1405-000001' },
    });

    expect(submit.disabled).toBe(false);
  });
});
