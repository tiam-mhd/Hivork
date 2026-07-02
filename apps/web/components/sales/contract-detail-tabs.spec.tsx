import type { SaleDetailEnterpriseDto } from '@hivork/contracts/installments';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ContractDetailTabs } from './contract-detail-tabs';

vi.mock('@/lib/api/sale-detail', () => ({
  fetchSaleAttachments: vi.fn().mockResolvedValue({ data: [] }),
  fetchSaleCollaterals: vi.fn().mockResolvedValue({ data: [] }),
  fetchSaleGuarantors: vi.fn().mockResolvedValue({ data: [] }),
  fetchSaleLineItems: vi.fn().mockResolvedValue({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000111',
        saleId: '00000000-0000-0000-0000-000000000001',
        title: 'موبایل',
        sku: 'SKU-1',
        quantity: 1,
        unitPriceRial: '1000000',
        discountRial: '0',
        taxRial: '0',
        lineTotalRial: '1000000',
        sortOrder: 0,
        createdAt: '2026-07-02T00:00:00.000Z',
        updatedAt: '2026-07-02T00:00:00.000Z',
        createdById: null,
        version: 1,
      },
    ],
  }),
  fetchSaleVersions: vi.fn().mockResolvedValue({ data: [] }),
}));

afterEach(() => {
  cleanup();
});

const SALE: SaleDetailEnterpriseDto = {
  id: '00000000-0000-0000-0000-000000000001',
  tenantCustomerId: '00000000-0000-0000-0000-000000000002',
  branchId: '00000000-0000-0000-0000-000000000003',
  title: 'قرارداد نمونه',
  totalAmountRial: '12000000',
  downPaymentRial: '2000000',
  installmentCount: 3,
  status: 'archived',
  paidCount: 0,
  contractDate: '2026-07-01T00:00:00.000Z',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  installments: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      sequenceNumber: 1,
      dueDate: '2026-08-01T00:00:00.000Z',
      amountRial: '3333333',
      status: 'pending',
      paidAt: null,
      confirmedBy: null,
    },
  ],
  version: 1,
  contractNumber: 'CTR-1405-000001',
  customTerms: 'شرایط اختصاصی نمونه',
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
  archivedAt: '2026-07-02T00:00:00.000Z',
  versions: [],
  attachments: [],
  customer: {
    id: '00000000-0000-0000-0000-000000000020',
    phone: '09120000000',
    name: 'مشتری نمونه',
  },
};

describe('ContractDetailTabs', () => {
  it('renders archived banner and tabs', () => {
    render(<ContractDetailTabs sale={SALE} canEdit={false} />);

    expect(screen.getByText('این قرارداد بایگانی شده و در حالت فقط‌خواندنی نمایش داده می‌شود.')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'خلاصه' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'نسخه‌ها' })).toBeTruthy();
  });

  it('loads line items when items tab is selected', async () => {
    render(<ContractDetailTabs sale={SALE} canEdit />);

    fireEvent.click(screen.getByRole('tab', { name: 'اقلام' }));

    await waitFor(() => {
      expect(screen.getByText('موبایل')).toBeTruthy();
    });
  });
});
