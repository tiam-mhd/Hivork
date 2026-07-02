import { ApplicationError } from '../errors/application.error.js';
import type { CustomerNoteRecord } from '../ports/customer-note.repository.port.js';

export const CUSTOMER_NOTE_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function assertCanUpdateCustomerNote(params: {
  note: CustomerNoteRecord;
  actorId: string;
  canUpdateAny: boolean;
  now?: Date;
}): void {
  if (params.canUpdateAny) {
    return;
  }

  if (params.note.authorStaffId !== params.actorId) {
    throw new ApplicationError(
      'PERMISSION_DENIED',
      'You can only edit your own notes.',
      403,
    );
  }

  const now = params.now ?? new Date();
  if (now.getTime() - params.note.createdAt.getTime() > CUSTOMER_NOTE_EDIT_WINDOW_MS) {
    throw new ApplicationError(
      'NOTE_EDIT_WINDOW_EXPIRED',
      'The edit window for this note has expired.',
      403,
    );
  }
}

export function assertCanDeleteCustomerNote(params: {
  note: CustomerNoteRecord;
  actorId: string;
  canDeleteAny: boolean;
  now?: Date;
}): void {
  if (params.canDeleteAny) {
    return;
  }

  if (params.note.authorStaffId !== params.actorId) {
    throw new ApplicationError(
      'PERMISSION_DENIED',
      'You can only delete your own notes.',
      403,
    );
  }

  const now = params.now ?? new Date();
  if (now.getTime() - params.note.createdAt.getTime() > CUSTOMER_NOTE_EDIT_WINDOW_MS) {
    throw new ApplicationError(
      'NOTE_EDIT_WINDOW_EXPIRED',
      'The delete window for this note has expired.',
      403,
    );
  }
}
