import {
  ExportService,
  resolveCustomerExportColumns,
  type CustomerXlsxExportParams,
  type ICustomerXlsxExportWriter,
} from '@hivork/application';
import type { PassThrough } from 'node:stream';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomerXlsxExportWriter implements ICustomerXlsxExportWriter {
  constructor(private readonly exportService: ExportService) {}

  async exportCustomers(params: CustomerXlsxExportParams): Promise<{ stream: PassThrough }> {
    const columns = params.columns ?? resolveCustomerExportColumns();
    const moneyHeaderNote =
      'مبالغ ستون تومان برای نمایش هستند؛ ستون ریال مقدار دقیق ذخیره‌شده در سیستم است.';

    return this.exportService.exportToXlsx({
      sheetName: 'مشتریان',
      columns,
      moneyHeaderNote: columns.some((column) => column.moneyRial) ? moneyHeaderNote : undefined,
      fetchBatch: params.fetchBatch,
      maxRows: params.maxRows,
    });
  }
}
