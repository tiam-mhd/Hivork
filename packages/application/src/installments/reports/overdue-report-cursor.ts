import { ApplicationError } from '../../errors/application.error.js';
import type { OverdueReportSort } from '../../ports/overdue-report.repository.port.js';

export type OverdueReportCursorPayload = {
  sort: OverdueReportSort;
  customerId: string;
  totalOverdueRial?: string;
  oldestDueDate?: string;
  displayName?: string | null;
};

export function encodeOverdueReportCursor(payload: OverdueReportCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeOverdueReportCursor(
  cursor: string,
  expectedSort: OverdueReportSort,
): OverdueReportCursorPayload {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as OverdueReportCursorPayload;

    if (parsed.sort !== expectedSort || !parsed.customerId) {
      throw new Error('Invalid cursor payload');
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Cursor is invalid or expired.', 400);
  }
}
