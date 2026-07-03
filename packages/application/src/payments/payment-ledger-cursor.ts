import { ApplicationError } from '../errors/application.error.js';

export type PaymentLedgerCursorPayload = {
  id: string;
  occurredAt: string;
};

export function encodePaymentLedgerCursor(occurredAt: Date, id: string): string {
  const payload: PaymentLedgerCursorPayload = {
    id,
    occurredAt: occurredAt.toISOString(),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodePaymentLedgerCursor(cursor: string): PaymentLedgerCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as PaymentLedgerCursorPayload;

    if (typeof parsed.id !== 'string' || !parsed.occurredAt) {
      throw new Error('invalid cursor shape');
    }

    if (Number.isNaN(Date.parse(parsed.occurredAt))) {
      throw new Error('invalid occurredAt cursor');
    }

    return parsed;
  } catch {
    throw new ApplicationError('CURSOR_INVALID', 'Pagination cursor is invalid.', 400);
  }
}
