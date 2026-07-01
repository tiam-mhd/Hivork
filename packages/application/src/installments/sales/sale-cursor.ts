import { ApplicationError } from '../../errors/application.error.js';

export type SaleCursorPayload = {
  createdAt: string;
  id: string;
  contractDate?: string;
};

export type SaleListSort = 'createdAt:desc' | 'createdAt:asc' | 'contractDate:desc';

export function encodeSaleCursor(
  sort: SaleListSort,
  createdAt: Date,
  id: string,
  contractDate?: Date,
): string {
  const payload: SaleCursorPayload = {
    createdAt: createdAt.toISOString(),
    id,
    ...(sort === 'contractDate:desc' && contractDate
      ? { contractDate: contractDate.toISOString() }
      : {}),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeSaleCursor(cursor: string, sort: SaleListSort): SaleCursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as SaleCursorPayload;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error('invalid cursor shape');
    }

    if (sort === 'contractDate:desc') {
      if (!parsed.contractDate || Number.isNaN(Date.parse(parsed.contractDate))) {
        throw new Error('invalid contract date cursor');
      }
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
