import { ApplicationError } from '../errors/application.error.js';

export type CustomerPaymentCursorPayload = {
  sortAt: string;
  id: string;
};

export function encodeCustomerPaymentCursor(item: { sortAt: Date; id: string }): string {
  const payload: CustomerPaymentCursorPayload = {
    sortAt: item.sortAt.toISOString(),
    id: item.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCustomerPaymentCursor(cursor: string): CustomerPaymentCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as CustomerPaymentCursorPayload;

    if (typeof parsed.id !== 'string' || typeof parsed.sortAt !== 'string') {
      throw new Error('invalid cursor shape');
    }

    if (Number.isNaN(Date.parse(parsed.sortAt))) {
      throw new Error('invalid sortAt cursor');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
