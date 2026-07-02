import {
  PdfExportService,
  type CustomerPdfExportParams,
  type ICustomerPdfExportWriter,
} from '@hivork/application';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomerPdfExportWriter implements ICustomerPdfExportWriter {
  constructor(private readonly pdfExportService: PdfExportService) {}

  async exportCustomers(params: CustomerPdfExportParams): Promise<Buffer> {
    return this.pdfExportService.exportFromLayout({
      title: params.locale === 'fa-IR' ? 'لیست مشتریان' : 'Customer list',
      locale: params.locale,
      orientation: 'landscape',
      tenant: params.tenant,
      generatedAt: params.generatedAt,
      columns: params.columns,
      rows: params.rows,
    });
  }
}
