import ExcelJS from 'exceljs';

import { ApplicationError } from '../../errors/application.error.js';

export const CUSTOMER_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const CUSTOMER_IMPORT_MAX_ROWS = 10_000;

const REQUIRED_HEADERS = ['phone', 'name'] as const;
const OPTIONAL_HEADERS = ['local_code', 'notes'] as const;

export type CustomerImportParsedRow = {
  rowNumber: number;
  phone: string | null;
  name: string | null;
  localCode: string | null;
  notes: string | null;
};

export type CustomerImportParseResult = {
  rows: CustomerImportParsedRow[];
};

export function assertCustomerImportFileSize(buffer: Buffer): void {
  if (buffer.length === 0) {
    throw new ApplicationError('VALIDATION_ERROR', 'Import file is empty.', 400);
  }

  if (buffer.length > CUSTOMER_IMPORT_MAX_FILE_BYTES) {
    throw new ApplicationError('VALIDATION_ERROR', 'Import file exceeds the 5MB limit.', 400);
  }
}

export function assertCustomerImportXlsxFormat(buffer: Buffer): void {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ApplicationError('VALIDATION_ERROR', 'Import file must be an Excel .xlsx workbook.', 400);
  }
}

export async function parseCustomerImportExcel(buffer: Buffer): Promise<CustomerImportParseResult> {
  assertCustomerImportFileSize(buffer);
  assertCustomerImportXlsxFormat(buffer);

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    throw new ApplicationError('VALIDATION_ERROR', 'Import file must be an Excel .xlsx workbook.', 400);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new ApplicationError('VALIDATION_ERROR', 'Import workbook has no worksheets.', 400);
  }

  const headerRow = worksheet.getRow(1);
  const columnIndexes = resolveHeaderIndexes(headerRow);

  const rows: CustomerImportParsedRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const parsed = {
      rowNumber,
      phone: cellToString(row.getCell(columnIndexes.phone).value),
      name: cellToString(row.getCell(columnIndexes.name).value),
      localCode:
        columnIndexes.localCode !== undefined
          ? cellToString(row.getCell(columnIndexes.localCode).value)
          : null,
      notes:
        columnIndexes.notes !== undefined
          ? cellToString(row.getCell(columnIndexes.notes).value)
          : null,
    };

    if (isBlankRow(parsed)) {
      return;
    }

    rows.push(parsed);
  });

  if (rows.length > CUSTOMER_IMPORT_MAX_ROWS) {
    throw new ApplicationError(
      'VALIDATION_ERROR',
      `Import file exceeds the maximum of ${CUSTOMER_IMPORT_MAX_ROWS} rows.`,
      400,
    );
  }

  return { rows };
}

type HeaderIndexes = {
  phone: number;
  name: number;
  localCode?: number;
  notes?: number;
};

function resolveHeaderIndexes(headerRow: ExcelJS.Row): HeaderIndexes {
  const headerMap = new Map<string, number>();

  headerRow.eachCell((cell, colNumber) => {
    const normalized = normalizeHeader(cellToString(cell.value));
    if (normalized) {
      headerMap.set(normalized, colNumber);
    }
  });

  const missing = REQUIRED_HEADERS.filter((header) => !headerMap.has(header));
  if (missing.length > 0) {
    throw new ApplicationError(
      'VALIDATION_ERROR',
      `Import file is missing required columns: ${missing.join(', ')}.`,
      400,
    );
  }

  const indexes: HeaderIndexes = {
    phone: headerMap.get('phone')!,
    name: headerMap.get('name')!,
  };

  for (const optionalHeader of OPTIONAL_HEADERS) {
    const index = headerMap.get(optionalHeader);
    if (index !== undefined) {
      if (optionalHeader === 'local_code') {
        indexes.localCode = index;
      } else if (optionalHeader === 'notes') {
        indexes.notes = index;
      }
    }
  }

  return indexes;
}

function normalizeHeader(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function cellToString(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }

  if (value instanceof Date) {
    return null;
  }

  if (typeof value === 'object') {
    if ('text' in value && value.text !== undefined && value.text !== null) {
      return cellToString(value.text as ExcelJS.CellValue);
    }

    if ('result' in value && value.result !== undefined && value.result !== null) {
      return cellToString(value.result as ExcelJS.CellValue);
    }

    if ('richText' in value && Array.isArray(value.richText)) {
      const text = value.richText.map((part) => part.text ?? '').join('').trim();
      return text.length > 0 ? text : null;
    }
  }

  const fallback = String(value).trim();
  return fallback.length > 0 ? fallback : null;
}

function isBlankRow(row: Omit<CustomerImportParsedRow, 'rowNumber'>): boolean {
  return !row.phone && !row.name && !row.localCode && !row.notes;
}
