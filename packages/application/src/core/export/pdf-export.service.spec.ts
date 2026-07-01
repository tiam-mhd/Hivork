import { describe, expect, it } from 'vitest';

import { PdfExportService } from './pdf-export.service.js';
import type { IPdfExportPort } from '../../ports/pdf-export.port.js';
import type { PrintLayoutData } from './render-print-layout-html.js';

class MockPdfPort implements IPdfExportPort {
  async htmlToPdf(): Promise<Buffer> {
    return Buffer.from('%PDF-1.4 mock-content');
  }
}

const sampleLayout: PrintLayoutData = {
  title: 'لیست مشتریان',
  locale: 'fa-IR',
  orientation: 'portrait',
  generatedAt: new Date('2026-06-30T12:00:00.000Z'),
  tenant: { name: 'Demo' },
  columns: [{ id: 'name', header: 'نام' }],
  rows: [['علی']],
};

describe('PdfExportService', () => {
  it('returns PDF magic bytes from html layout', async () => {
    const service = new PdfExportService(new MockPdfPort());
    const buffer = await service.exportFromLayout(sampleLayout);

    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
  });
});
