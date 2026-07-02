import ExcelJS from 'exceljs';

import {
  CUSTOMER_IMPORT_TEMPLATE_HEADERS,
  type CustomerImportParsedRow,
} from './customer-import.parser.js';
import type { ImportCustomerRowError } from '../import-row-validator.js';

const ERROR_HEADER = 'error_code';
const ERROR_MESSAGE_HEADER = 'error_message';

export async function buildCustomerImportErrorReportBuffer(
  rows: CustomerImportParsedRow[],
  errors: ImportCustomerRowError[],
): Promise<Buffer> {
  const errorsByRow = new Map(errors.map((error) => [error.row, error]));
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Import Errors');

  sheet.addRow([...CUSTOMER_IMPORT_TEMPLATE_HEADERS, ERROR_HEADER, ERROR_MESSAGE_HEADER]);

  for (const row of rows) {
    const rowError = errorsByRow.get(row.rowNumber);
    if (!rowError) {
      continue;
    }

    sheet.addRow([
      row.phone ?? '',
      row.name ?? '',
      row.localCode ?? '',
      row.email ?? '',
      row.nationalId ?? '',
      row.category ?? '',
      row.tags ?? '',
      row.addressLine ?? '',
      row.city ?? '',
      row.phone2 ?? '',
      row.emergencyName ?? '',
      row.emergencyPhone ?? '',
      row.notes ?? '',
      rowError.error,
      rowError.message ?? '',
    ]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
