import { ApplicationError } from '../errors/application.error.js';

export type StaffSessionCursorPayload = {
  lastActiveAt: string;
  id: string;
};

export function encodeStaffSessionCursor(lastActiveAt: Date, id: string): string {
  const payload: StaffSessionCursorPayload = {
    lastActiveAt: lastActiveAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeStaffSessionCursor(cursor: string): StaffSessionCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as StaffSessionCursorPayload;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.lastActiveAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.lastActiveAt))
    ) {
      throw new Error('invalid cursor shape');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
