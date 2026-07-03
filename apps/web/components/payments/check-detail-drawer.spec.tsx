import type { CheckSummaryDto } from '@hivork/contracts/payments';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CheckDetailDrawer } from '@/components/payments/check-detail-drawer';

vi.mock('@/hooks/use-permission', () => ({
  usePermission: () => false,
}));

vi.mock('@/hooks/use-api-error', () => ({
  useApiError: () => ({ resolve: (error: unknown) => String(error) }),
}));

vi.mock('@/lib/api/payments', () => ({
  getCheckTracking: vi.fn().mockResolvedValue({ timeline: [], followUpNotes: [] }),
  getCheckImage: vi.fn().mockRejectedValue(new Error('no image')),
  addCheckTrackingNote: vi.fn(),
  uploadCheckImage: vi.fn(),
}));

const baseCheck: CheckSummaryDto = {
  id: '11111111-1111-4111-8111-111111111111',
  checkNumber: '123456',
  bankName: 'ملت',
  amountRial: '100000000',
  dueDate: '2026-08-01T00:00:00.000Z',
  checkType: 'received',
  status: 'due',
  installmentId: null,
  bankBranchCode: null,
  sayadId: null,
};

describe('CheckDetailDrawer permission gates', () => {
  it('hides collect, transfer, bounce, and tracking actions without permissions', () => {
    render(
      <CheckDetailDrawer
        check={baseCheck}
        open
        onClose={() => undefined}
        onUpdated={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: 'وصول' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'انتقال' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'برگشت' })).toBeNull();
    expect(screen.queryByLabelText(/آپلود تصویر/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'افزودن یادداشت' })).toBeNull();
  });
});
