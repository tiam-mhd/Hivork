import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PrintLayout } from './print-layout';

afterEach(() => {
  cleanup();
});

describe('PrintLayout', () => {
  it('renders tenant branding and table rows', () => {
    render(
      <PrintLayout
        title="لیست مشتریان"
        tenant={{ name: 'فروشگاه نمونه', taxId: '123' }}
        locale="fa-IR"
        generatedAt="2026-06-30T12:00:00.000Z"
        columns={[
          { id: 'name', header: 'نام' },
          { id: 'phone', header: 'موبایل' },
        ]}
        rows={[['علی', '09120000000']]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'فروشگاه نمونه' })).toBeTruthy();
    expect(screen.getByText('لیست مشتریان')).toBeTruthy();
    expect(screen.getByText('نام')).toBeTruthy();
    expect(screen.getByText('علی')).toBeTruthy();
    expect(screen.getByText(/شناسه مالیاتی/)).toBeTruthy();
  });
});
