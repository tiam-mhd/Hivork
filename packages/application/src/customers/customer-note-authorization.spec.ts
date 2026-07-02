import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../errors/application.error.js';
import {
  assertCanDeleteCustomerNote,
  assertCanUpdateCustomerNote,
  CUSTOMER_NOTE_EDIT_WINDOW_MS,
} from './customer-note-authorization.js';
import type { CustomerNoteRecord } from '../ports/customer-note.repository.port.js';

function buildNote(overrides: Partial<CustomerNoteRecord> = {}): CustomerNoteRecord {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    tenantId: '00000000-0000-4000-8000-000000000010',
    tenantCustomerId: '00000000-0000-4000-8000-000000000020',
    body: 'test note',
    isPinned: false,
    authorStaffId: '00000000-0000-4000-8000-000000000030',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: '00000000-0000-4000-8000-000000000030',
    updatedById: null,
    deletedAt: null,
    deletedById: null,
    deleteReason: null,
    version: 1,
    metadata: null,
    ...overrides,
  };
}

function expectAuthError(fn: () => void, code: string): void {
  try {
    fn();
    expect.fail(`expected ApplicationError with code ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ApplicationError);
    expect((error as ApplicationError).code).toBe(code);
  }
}

describe('customer note authorization', () => {
  it('allows author to update within 24h', () => {
    expect(() =>
      assertCanUpdateCustomerNote({
        note: buildNote(),
        actorId: '00000000-0000-4000-8000-000000000030',
        canUpdateAny: false,
      }),
    ).not.toThrow();
  });

  it('denies other staff without elevated permission', () => {
    expectAuthError(
      () =>
        assertCanUpdateCustomerNote({
          note: buildNote(),
          actorId: '00000000-0000-4000-8000-000000000099',
          canUpdateAny: false,
        }),
      'PERMISSION_DENIED',
    );
  });

  it('denies author after edit window expires', () => {
    const oldCreatedAt = new Date(Date.now() - CUSTOMER_NOTE_EDIT_WINDOW_MS - 1_000);

    expectAuthError(
      () =>
        assertCanUpdateCustomerNote({
          note: buildNote({ createdAt: oldCreatedAt }),
          actorId: '00000000-0000-4000-8000-000000000030',
          canUpdateAny: false,
        }),
      'NOTE_EDIT_WINDOW_EXPIRED',
    );
  });

  it('allows delete any permission to bypass window', () => {
    const oldCreatedAt = new Date(Date.now() - CUSTOMER_NOTE_EDIT_WINDOW_MS - 1_000);

    expect(() =>
      assertCanDeleteCustomerNote({
        note: buildNote({ createdAt: oldCreatedAt }),
        actorId: '00000000-0000-4000-8000-000000000099',
        canDeleteAny: true,
      }),
    ).not.toThrow();
  });
});
