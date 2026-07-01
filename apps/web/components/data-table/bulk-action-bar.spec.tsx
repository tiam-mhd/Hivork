import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BulkActionBar, type BulkAction } from './bulk-action-bar';
import { BulkConfirmDialog } from './bulk-confirm-dialog';

vi.mock('@/hooks/use-permission', () => ({
  usePermissions: () => new Set(['installments.customer.update']),
}));

type Row = { id: string };

const ACTIONS: BulkAction<Row>[] = [
  {
    id: 'tag',
    label: 'برچسب',
    permission: 'installments.customer.update',
    onExecute: async () => undefined,
  },
  {
    id: 'delete',
    label: 'حذف',
    variant: 'destructive',
    permission: 'installments.customer.delete',
    onExecute: async () => undefined,
  },
];

afterEach(() => {
  cleanup();
});

describe('BulkActionBar', () => {
  it('is hidden when selected count is zero', () => {
    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        onClearSelection={() => undefined}
        actions={ACTIONS}
        onActionClick={() => undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows selected count and permission-filtered actions', () => {
    render(
      <BulkActionBar
        selectedCount={3}
        onClearSelection={vi.fn()}
        actions={ACTIONS}
        onActionClick={() => undefined}
      />,
    );

    expect(screen.getByText('۳ مورد انتخاب شده')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'لغو انتخاب' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'برچسب' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'حذف' })).toBeNull();
  });

  it('shows message when no permitted actions', () => {
    render(
      <BulkActionBar
        selectedCount={2}
        onClearSelection={() => undefined}
        actions={[
          {
            id: 'secret',
            label: 'مخفی',
            permission: 'forbidden.permission',
            onExecute: async () => undefined,
          },
        ]}
        onActionClick={() => undefined}
      />,
    );

    expect(screen.getByText('عملیات مجاز نیست')).toBeTruthy();
  });
});

describe('BulkConfirmDialog', () => {
  it('calls onConfirm when destructive action is confirmed', () => {
    const onConfirm = vi.fn();
    render(
      <BulkConfirmDialog
        open
        title="حذف {n} مورد؟"
        description="این عمل قابل بازگشت است."
        selectedCount={2}
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'تأیید' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByText('حذف ۲ مورد؟')).toBeTruthy();
  });
});
