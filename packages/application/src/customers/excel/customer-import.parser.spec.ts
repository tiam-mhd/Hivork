import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../../errors/application.error.js';
import {
  assertCustomerImportFileSize,
  assertCustomerImportXlsxFormat,
  CUSTOMER_IMPORT_MAX_FILE_BYTES,
  CUSTOMER_IMPORT_TEMPLATE_HEADERS,
  parseCustomerImportExcel,
} from './customer-import.parser.js';

async function buildCustomerImportWorkbook(
  rows: Array<Record<string, string | null | undefined>>,
  headers: string[] = [...CUSTOMER_IMPORT_TEMPLATE_HEADERS],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.addRow(headers);

  for (const row of rows) {
    sheet.addRow(headers.map((header) => row[header] ?? ''));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('parseCustomerImportExcel', () => {
  it('parses enterprise columns', async () => {
    const buffer = await buildCustomerImportWorkbook([
      {
        phone: '09121234567',
        name: 'حسین احمدی',
        local_code: 'C-001',
        email: 'a@example.com',
        national_id: '1234567890',
        category: 'vip',
        tags: 'vip,gold',
        address_line: 'خیابان ۱',
        city: 'تهران',
        phone2: '09129876543',
        emergency_name: 'مریم',
        emergency_phone: '09121112222',
        notes: 'VIP',
      },
    ]);

    const result = await parseCustomerImportExcel(buffer);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 2,
      phone: '09121234567',
      name: 'حسین احمدی',
      localCode: 'C-001',
      email: 'a@example.com',
      nationalId: '1234567890',
      category: 'vip',
      tags: 'vip,gold',
      addressLine: 'خیابان ۱',
      city: 'تهران',
      phone2: '09129876543',
      emergencyName: 'مریم',
      emergencyPhone: '09121112222',
      notes: 'VIP',
    });
  });

  it('accepts legacy template with core columns only', async () => {
    const buffer = await buildCustomerImportWorkbook(
      [{ phone: '09121234567', name: 'Ali' }],
      ['phone', 'name', 'local_code', 'notes'],
    );

    const result = await parseCustomerImportExcel(buffer);
    expect(result.rows[0]?.localCode).toBeNull();
  });

  it('rejects missing required headers with INVALID_TEMPLATE', async () => {
    const buffer = await buildCustomerImportWorkbook(
      [{ phone: '09121234567', name: 'Ali' }],
      ['phone'],
    );

    await expect(parseCustomerImportExcel(buffer)).rejects.toMatchObject({
      code: 'INVALID_TEMPLATE',
      httpStatus: 422,
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

    try {
      assertCustomerImportFileSize(oversized);
      expect.unreachable('expected FILE_TOO_LARGE');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'FILE_TOO_LARGE',
        httpStatus: 413,
      });
    }
  });
});

describe('assertCustomerImportXlsxFormat', () => {
  it('rejects buffers without zip signature', () => {
    expect(() => assertCustomerImportXlsxFormat(Buffer.from('abc'))).toThrow(ApplicationError);
  });
});
