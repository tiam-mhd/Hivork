import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import {
  assertCustomerImportFileSize,
  assertCustomerImportXlsxFormat,
  CUSTOMER_IMPORT_MAX_FILE_BYTES,
  parseCustomerImportExcel,
} from './customer-import.parser.js';

async function buildCustomerImportWorkbook(
  rows: Array<{
    phone?: string | null;
    name?: string | null;
    local_code?: string | null;
    notes?: string | null;
  }>,
  headers: string[] = ['phone', 'name', 'local_code', 'notes'],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(headers);

  for (const row of rows) {
    sheet.addRow([
      row.phone ?? '',
      row.name ?? '',
      row.local_code ?? '',
      row.notes ?? '',
    ]);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('parseCustomerImportExcel', () => {
  it('parses valid rows with optional columns', async () => {
    const buffer = await buildCustomerImportWorkbook([
      { phone: '09121234567', name: 'حسین احمدی', local_code: 'C-001', notes: 'VIP' },
      { phone: '09351234567', name: 'مریم رضایی' },
    ]);

    const result = await parseCustomerImportExcel(buffer);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      phone: '09121234567',
      name: 'حسین احمدی',
      localCode: 'C-001',
      notes: 'VIP',
    });
  });

  it('accepts case-insensitive headers', async () => {
    const buffer = await buildCustomerImportWorkbook(
      [{ phone: '09121234567', name: 'Ali' }],
      ['Phone', 'Name', 'Local_Code'],
    );

    const result = await parseCustomerImportExcel(buffer);
    expect(result.rows[0]?.localCode).toBeNull();
  });

  it('rejects missing required headers', async () => {
    const buffer = await buildCustomerImportWorkbook(
      [{ phone: '09121234567', name: 'Ali' }],
      ['phone'],
    );

    await expect(parseCustomerImportExcel(buffer)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
    });
  });

  it('returns zero rows for header-only workbook', async () => {
    const buffer = await buildCustomerImportWorkbook([]);
    const result = await parseCustomerImportExcel(buffer);
    expect(result.rows).toEqual([]);
  });

  it('rejects non-xlsx files', async () => {
    await expect(parseCustomerImportExcel(Buffer.from('plain text'))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
    });
  });
});

describe('assertCustomerImportFileSize', () => {
  it('rejects files larger than 5MB', () => {
    const oversized = Buffer.alloc(CUSTOMER_IMPORT_MAX_FILE_BYTES + 1, 0x50);

    expect(() => assertCustomerImportFileSize(oversized)).toThrow(ApplicationError);
    expect(() => assertCustomerImportFileSize(oversized)).toThrow(/5MB/);
  });
});

describe('assertCustomerImportXlsxFormat', () => {
  it('rejects buffers without zip signature', () => {
    expect(() => assertCustomerImportXlsxFormat(Buffer.from('abc'))).toThrow(ApplicationError);
  });
});
