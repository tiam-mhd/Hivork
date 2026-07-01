import { ApplicationError } from '../../errors/application.error.js';
import type { IPdfExportPort } from '../../ports/pdf-export.port.js';
import {
  renderPrintLayoutHtml,
  type PrintLayoutData,
} from './render-print-layout-html.js';

export class PdfExportService {
  constructor(private readonly pdfPort: IPdfExportPort) {}

  async exportFromLayout(data: PrintLayoutData): Promise<Buffer> {
    const html = renderPrintLayoutHtml(data);

    try {
      return await this.pdfPort.htmlToPdf(html, { orientation: data.orientation });
    } catch {
      throw new ApplicationError(
        'PDF_GENERATION_FAILED',
        'PDF generation failed. Please try again.',
        500,
      );
    }
  }
}
