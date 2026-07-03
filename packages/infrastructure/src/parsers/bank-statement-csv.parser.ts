function toWesternDigits(value: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return value.replace(/[۰-۹٠-٩]/g, (char) => {
    const persianIndex = persian.indexOf(char);
    if (persianIndex >= 0) {
      return String(persianIndex);
    }
    const arabicIndex = arabic.indexOf(char);
    if (arabicIndex >= 0) {
      return String(arabicIndex);
    }
    return char;
  });
}

export type BankStatementRow = {
  date: string;
  reference: string;
  amountRial: bigint;
  description: string;
};

export type BankStatementParseErrorCode = 'BANK_STATEMENT_EMPTY' | 'BANK_STATEMENT_INVALID';

export class BankStatementParseError extends Error {
  constructor(
    readonly code: BankStatementParseErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BankStatementParseError';
  }
}

const EXPECTED_HEADERS = ['date', 'reference', 'amountrial', 'description'] as const;

function normalizeHeader(value: string): string {
  return toWesternDigits(value).trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function parseAmountRial(raw: string, lineNumber: number): bigint {
  const normalized = toWesternDigits(raw).trim().replace(/,/g, '');
  if (!/^\d+$/.test(normalized)) {
    throw new BankStatementParseError(
      'BANK_STATEMENT_INVALID',
      `Invalid amountRial on line ${lineNumber}.`,
    );
  }

  return BigInt(normalized);
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

export function parseBankStatementCsv(
  fileBuffer: Buffer,
  encoding: BufferEncoding = 'utf-8',
): BankStatementRow[] {
  const text = fileBuffer.toString(encoding).replace(/^\uFEFF/, '').trim();
  if (!text) {
    throw new BankStatementParseError('BANK_STATEMENT_EMPTY', 'Bank statement file is empty.');
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new BankStatementParseError(
      'BANK_STATEMENT_INVALID',
      'Bank statement must include a header row and at least one data row.',
    );
  }

  const headerFields = parseCsvLine(lines[0]!).map(normalizeHeader);
  for (let index = 0; index < EXPECTED_HEADERS.length; index += 1) {
    if (headerFields[index] !== EXPECTED_HEADERS[index]) {
      throw new BankStatementParseError(
        'BANK_STATEMENT_INVALID',
        'Bank statement CSV must have columns: date, reference, amountRial, description.',
      );
    }
  }

  const rows: BankStatementRow[] = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const lineNumber = lineIndex + 1;
    const fields = parseCsvLine(lines[lineIndex]!);

    if (fields.length < 4) {
      throw new BankStatementParseError(
        'BANK_STATEMENT_INVALID',
        `Invalid CSV row on line ${lineNumber}.`,
      );
    }

    const reference = toWesternDigits(fields[1] ?? '').trim();
    if (!reference) {
      throw new BankStatementParseError(
        'BANK_STATEMENT_INVALID',
        `Missing bank reference on line ${lineNumber}.`,
      );
    }

    rows.push({
      date: toWesternDigits(fields[0] ?? '').trim(),
      reference,
      amountRial: parseAmountRial(fields[2] ?? '', lineNumber),
      description: (fields[3] ?? '').trim(),
    });
  }

  if (rows.length === 0) {
    throw new BankStatementParseError('BANK_STATEMENT_EMPTY', 'Bank statement file is empty.');
  }

  return rows;
}
