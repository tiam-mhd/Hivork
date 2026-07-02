import { ApplicationError } from '../errors/application.error.js';

export type CustomerTimelineCursorPayload = {
  occurredAt: string;
  id: string;
};

export function encodeCustomerTimelineCursor(item: { occurredAt: Date; id: string }): string {
  const payload: CustomerTimelineCursorPayload = {
    occurredAt: item.occurredAt.toISOString(),
    id: item.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCustomerTimelineCursor(cursor: string): CustomerTimelineCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as CustomerTimelineCursorPayload;

    if (typeof parsed.id !== 'string' || typeof parsed.occurredAt !== 'string') {
      throw new Error('invalid cursor shape');
    }

    if (Number.isNaN(Date.parse(parsed.occurredAt))) {
      throw new Error('invalid occurredAt cursor');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
