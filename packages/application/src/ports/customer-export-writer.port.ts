import type { PassThrough } from 'node:stream';

import type { ExportLocaleDto, TenantBrandingDto } from '@hivork/contracts/core';

import type { ExportColumnDef, ExportToXlsxParams } from '../core/export/export.service.js';
import type { PrintLayoutData } from '../core/export/render-print-layout-html.js';
import type { TenantCustomerListItem } from './tenant-customer.repository.port.js';

export type CustomerXlsxExportParams = Omit<
  ExportToXlsxParams<TenantCustomerListItem>,
  'sheetName' | 'columns'
> & {
  columns?: ExportColumnDef<TenantCustomerListItem>[];
};

export type CustomerPdfExportParams = {
  locale: ExportLocaleDto;
  tenant: TenantBrandingDto;
  generatedAt: Date;
  columns: PrintLayoutData['columns'];
  rows: string[][];
};

export interface ICustomerXlsxExportWriter {
  exportCustomers(params: CustomerXlsxExportParams): Promise<{ stream: PassThrough }>;
}

export interface ICustomerPdfExportWriter {
  exportCustomers(params: CustomerPdfExportParams): Promise<Buffer>;
}

export const CUSTOMER_XLSX_EXPORT_WRITER = Symbol('CUSTOMER_XLSX_EXPORT_WRITER');
export const CUSTOMER_PDF_EXPORT_WRITER = Symbol('CUSTOMER_PDF_EXPORT_WRITER');
