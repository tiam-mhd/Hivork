import { describe, expect, it } from 'vitest';

import { renderPrintLayoutHtml } from './render-print-layout-html.js';

describe('renderPrintLayoutHtml', () => {
  it('renders tenant header, table, and RTL direction for fa-IR', () => {
    const html = renderPrintLayoutHtml({
      title: 'لیست مشتریان',
      locale: 'fa-IR',
      orientation: 'portrait',
      generatedAt: new Date('2026-06-30T12:00:00.000Z'),
      tenant: {
        name: 'فروشگاه نمونه',
        legalName: 'شرکت نمونه',
        taxId: '12345678901',
        logoUrl: null,
      },
      columns: [
        { id: 'name', header: 'نام' },
        { id: 'phone', header: 'موبایل' },
      ],
      rows: [
        ['علی', '09120000000'],
        ['سارا', '09130000000'],
      ],
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('فروشگاه نمونه');
    expect(html).toContain('لیست مشتریان');
    expect(html).toContain('شناسه مالیاتی: 12345678901');
    expect(html).toContain('<th>نام</th>');
    expect(html).toContain('<td>علی</td>');
  });
});
