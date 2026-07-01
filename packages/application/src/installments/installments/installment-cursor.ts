import { ApplicationError } from '../../errors/application.error.js';
import type { InstallmentListSort } from '../../ports/installment.repository.port.js';

export type { InstallmentListSort };

export type InstallmentCursorPayload = {
  id: string;
  dueDate?: string;
  sequenceNumber?: number;
};

function usesDueDateCursor(sort: InstallmentListSort): boolean {
  return sort.startsWith('dueDate') || sort === 'daysOverdue:desc';
}

export function encodeInstallmentCursor(
  sort: InstallmentListSort,
  id: string,
  dueDate: Date,
  sequenceNumber: number,
): string {
  const payload: InstallmentCursorPayload = {
    id,
    ...(usesDueDateCursor(sort) ? { dueDate: dueDate.toISOString(), sequenceNumber } : {}),
    ...(sort === 'sequenceNumber:asc' ? { sequenceNumber } : {}),
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeInstallmentCursor(
  cursor: string,
  sort: InstallmentListSort,
): InstallmentCursorPayload {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as InstallmentCursorPayload;

    if (typeof parsed.id !== 'string') {
      throw new Error('invalid cursor shape');
    }

    if (usesDueDateCursor(sort)) {
      if (!parsed.dueDate || Number.isNaN(Date.parse(parsed.dueDate))) {
        throw new Error('invalid due date cursor');
      }
    }

    if (sort === 'sequenceNumber:asc') {
      if (typeof parsed.sequenceNumber !== 'number' || !Number.isInteger(parsed.sequenceNumber)) {
        throw new Error('invalid sequence cursor');
      }
    }

    return parsed;
  } catch {
    throw new ApplicationError('INVALID_CURSOR', 'Pagination cursor is invalid.', 400);
  }
}
