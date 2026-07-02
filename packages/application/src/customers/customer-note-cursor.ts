import { ApplicationError } from '../errors/application.error.js';

export type CustomerNoteCursorPayload = {
  isPinned: boolean;
  createdAt: string;
  id: string;
};

export function encodeCustomerNoteCursor(item: {
  isPinned: boolean;
  createdAt: Date;
  id: string;
}): string {
  const payload: CustomerNoteCursorPayload = {
    isPinned: item.isPinned,
    createdAt: item.createdAt.toISOString(),
    id: item.id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCustomerNoteCursor(cursor: string): CustomerNoteCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as CustomerNoteCursorPayload;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      typeof parsed.isPinned !== 'boolean'
    ) {
      throw new Error('invalid cursor shape');
    }

    if (Number.isNaN(Date.parse(parsed.createdAt))) {
      throw new Error('invalid createdAt cursor');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
