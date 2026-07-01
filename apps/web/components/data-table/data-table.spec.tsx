import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTable } from './data-table';
import { DataTableEmpty } from './data-table-empty';
import { DataTableError } from './data-table-error';
import { DataTableSkeleton } from './data-table-skeleton';

type DemoRow = { id: string; name: string };

const COLUMNS = [{ id: 'name', header: 'نام' }];

afterEach(() => {
  cleanup();
});

describe('DataTableSkeleton', () => {
  it('renders N skeleton rows', () => {
    const { container } = render(<DataTableSkeleton columnCount={3} rowCount={4} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(4);
  });
});

describe('DataTableEmpty', () => {
  it('shows empty CTA when action is provided', () => {
    render(
      <DataTableEmpty
        title="موردی یافت نشد"
        description="اولین مورد را اضافه کنید"
        action={<button type="button">افزودن</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'افزودن' })).toBeTruthy();
    expect(screen.getByText('موردی یافت نشد')).toBeTruthy();
  });
});

describe('DataTableError', () => {
  it('calls onRetry when retry is clicked', () => {
    const onRetry = vi.fn();

    render(<DataTableError message="خطا در بارگذاری" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'تلاش مجدد' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('DataTable', () => {
  it('renders skeleton when loading with no data', () => {
    const { container } = render(
      <DataTable<DemoRow>
        aria-label="جدول نمونه"
        columns={COLUMNS}
        data={[]}
        isLoading
        isError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => undefined}
        sortWhitelist={[]}
        skeletonRowCount={3}
      />,
    );

    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('renders empty state with CTA', () => {
    render(
      <DataTable<DemoRow>
        aria-label="جدول نمونه"
        columns={COLUMNS}
        data={[]}
        isLoading={false}
        isError={false}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => undefined}
        sortWhitelist={[]}
        emptyTitle="خالی"
        emptyAction={<button type="button">ایجاد</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'ایجاد' })).toBeTruthy();
  });

  it('renders error state and retries', () => {
    const onRetry = vi.fn();

    render(
      <DataTable<DemoRow>
        aria-label="جدول نمونه"
        columns={COLUMNS}
        data={[]}
        isLoading={false}
        isError
        error={new Error('شبکه')}
        onRetry={onRetry}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => undefined}
        sortWhitelist={[]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'تلاش مجدد' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
