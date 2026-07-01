import { ApplicationError } from '../errors/application.error.js';

export type TenantApiKeyCursorPayload = {
  createdAt: string;
  id: string;
};

export function encodeTenantApiKeyCursor(createdAt: Date, id: string): string {
  const payload: TenantApiKeyCursorPayload = {
    createdAt: createdAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeTenantApiKeyCursor(cursor: string): TenantApiKeyCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as TenantApiKeyCursorPayload;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error('invalid cursor shape');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
