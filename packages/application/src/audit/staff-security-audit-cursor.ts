import { ApplicationError } from '../errors/application.error.js';

export type StaffSecurityAuditCursorPayload = {
  createdAt: string;
  id: string;
};

export function encodeStaffSecurityAuditCursor(createdAt: Date, id: string): string {
  const payload: StaffSecurityAuditCursorPayload = {
    createdAt: createdAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeStaffSecurityAuditCursor(cursor: string): StaffSecurityAuditCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as StaffSecurityAuditCursorPayload;

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
