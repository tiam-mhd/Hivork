import ExcelJS from 'exceljs';

import { ApplicationError } from '../../errors/application.error.js';

export const CUSTOMER_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const CUSTOMER_IMPORT_MAX_ROWS = 10_000;
export const CUSTOMER_IMPORT_TEMPLATE_VERSION = '2';

export const CUSTOMER_IMPORT_REQUIRED_HEADERS = ['phone', 'name'] as const;

export const CUSTOMER_IMPORT_OPTIONAL_HEADERS = [
  'local_code',
  'email',
  'national_id',
  'category',
  'tags',
  'address_line',
  'city',
  'phone2',
  'emergency_name',
  'emergency_phone',
  'notes',
] as const;

export const CUSTOMER_IMPORT_TEMPLATE_HEADERS = [
  ...CUSTOMER_IMPORT_REQUIRED_HEADERS,
  ...CUSTOMER_IMPORT_OPTIONAL_HEADERS,
] as const;

export type CustomerImportParsedRow = {
  rowNumber: number;
  phone: string | null;
  name: string | null;
  localCode: string | null;
  email: string | null;
  nationalId: string | null;
  category: string | null;
  tags: string | null;
  addressLine: string | null;
  city: string | null;
  phone2: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
};

export type CustomerImportParseResult = {
  rows: CustomerImportParsedRow[];
  templateVersion: string | null;
};

export function assertCustomerImportFileSize(buffer: Buffer): void {
  if (buffer.length === 0) {
    throw new ApplicationError('VALIDATION_ERROR', 'Import file is empty.', 400);
  }

  if (buffer.length > CUSTOMER_IMPORT_MAX_FILE_BYTES) {
    throw new ApplicationError('FILE_TOO_LARGE', 'Import file exceeds the 5MB limit.', 413);
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
    throw new ApplicationError('INVALID_TEMPLATE', 'Import workbook has no worksheets.', 422);
  }

  const templateVersion = readTemplateVersion(workbook);
  if (
    templateVersion !== null &&
    templateVersion !== CUSTOMER_IMPORT_TEMPLATE_VERSION &&
    templateVersion !== '1'
  ) {
    throw new ApplicationError(
      'INVALID_TEMPLATE',
      `Unsupported customer import template version: ${templateVersion}.`,
      422,
    );
  }

  const headerRow = worksheet.getRow(1);
  const columnIndexes = resolveHeaderIndexes(headerRow);

  const rows: CustomerImportParsedRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const parsed: CustomerImportParsedRow = {
      rowNumber,
      phone: cellToString(row.getCell(columnIndexes.phone).value),
      name: cellToString(row.getCell(columnIndexes.name).value),
      localCode: readOptionalCell(row, columnIndexes.localCode),
      email: readOptionalCell(row, columnIndexes.email),
      nationalId: readOptionalCell(row, columnIndexes.nationalId),
      category: readOptionalCell(row, columnIndexes.category),
      tags: readOptionalCell(row, columnIndexes.tags),
      addressLine: readOptionalCell(row, columnIndexes.addressLine),
      city: readOptionalCell(row, columnIndexes.city),
      phone2: readOptionalCell(row, columnIndexes.phone2),
      emergencyName: readOptionalCell(row, columnIndexes.emergencyName),
      emergencyPhone: readOptionalCell(row, columnIndexes.emergencyPhone),
      notes: readOptionalCell(row, columnIndexes.notes),
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

  return { rows, templateVersion };
}

type HeaderIndexes = {
  phone: number;
  name: number;
  localCode?: number;
  email?: number;
  nationalId?: number;
  category?: number;
  tags?: number;
  addressLine?: number;
  city?: number;
  phone2?: number;
  emergencyName?: number;
  emergencyPhone?: number;
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

  const missing = CUSTOMER_IMPORT_REQUIRED_HEADERS.filter((header) => !headerMap.has(header));
  if (missing.length > 0) {
    throw new ApplicationError(
      'INVALID_TEMPLATE',
      `Import file is missing required columns: ${missing.join(', ')}.`,
      422,
    );
  }

  const indexes: HeaderIndexes = {
    phone: headerMap.get('phone')!,
    name: headerMap.get('name')!,
  };

  const optionalMap: Record<string, keyof HeaderIndexes> = {
    local_code: 'localCode',
    email: 'email',
    national_id: 'nationalId',
    category: 'category',
    tags: 'tags',
    address_line: 'addressLine',
    city: 'city',
    phone2: 'phone2',
    emergency_name: 'emergencyName',
    emergency_phone: 'emergencyPhone',
    notes: 'notes',
  };

  for (const [header, key] of Object.entries(optionalMap)) {
    const index = headerMap.get(header);
    if (index !== undefined) {
      indexes[key] = index;
    }
  }

  return indexes;
}

function readOptionalCell(row: ExcelJS.Row, index: number | undefined): string | null {
  if (index === undefined) {
    return null;
  }

  return cellToString(row.getCell(index).value);
}

function readTemplateVersion(workbook: ExcelJS.Workbook): string | null {
  const custom = workbook as ExcelJS.Workbook & {
    custom?: { customerImportTemplateVersion?: string };
  };

  const fromCustom = custom.custom?.customerImportTemplateVersion;
  if (typeof fromCustom === 'string' && fromCustom.trim()) {
    return fromCustom.trim();
  }

  return null;
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
  return (
    !row.phone &&
    !row.name &&
    !row.localCode &&
    !row.email &&
    !row.nationalId &&
    !row.category &&
    !row.tags &&
    !row.addressLine &&
    !row.city &&
    !row.phone2 &&
    !row.emergencyName &&
    !row.emergencyPhone &&
    !row.notes
  );
}
