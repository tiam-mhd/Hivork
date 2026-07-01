import { ApplicationError } from '../errors/application.error.js';
import type { StaffListSort } from '../ports/staff.repository.port.js';

export type StaffCursorPayload = {
  createdAt: string;
  id: string;
  name?: string;
};

export function encodeStaffCursor(
  sort: StaffListSort,
  createdAt: Date,
  id: string,
  name?: string | null,
): string {
  const payload: StaffCursorPayload = {
    createdAt: createdAt.toISOString(),
    id,
    ...(sort.startsWith('name:') ? { name: name ?? '' } : {}),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeStaffCursor(cursor: string, sort: StaffListSort): StaffCursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as StaffCursorPayload;

    if (
      typeof parsed.id !== 'string' ||
      typeof parsed.createdAt !== 'string' ||
      Number.isNaN(Date.parse(parsed.createdAt))
    ) {
      throw new Error('invalid cursor shape');
    }

    if (sort.startsWith('name:') && typeof parsed.name !== 'string') {
      throw new Error('invalid name cursor');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
