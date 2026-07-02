import { ApplicationError } from '../errors/application.error.js';

export type CustomerContractCursorPayload = {
  contractDate: string;
  id: string;
};

export function encodeCustomerContractCursor(item: { contractDate: Date; id: string }): string {
  const contractDate = item.contractDate.toISOString().slice(0, 10);
  const payload: CustomerContractCursorPayload = {
    contractDate,
    id: item.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCustomerContractCursor(cursor: string): CustomerContractCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as CustomerContractCursorPayload;

    if (typeof parsed.id !== 'string' || typeof parsed.contractDate !== 'string') {
      throw new Error('invalid cursor shape');
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.contractDate)) {
      throw new Error('invalid contractDate cursor');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}

export function contractDateFromCursor(contractDate: string): Date {
  return new Date(`${contractDate}T00:00:00.000Z`);
}
