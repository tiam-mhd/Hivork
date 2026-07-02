import { describe, expect, it } from 'vitest';

import { CustomerNote } from './customer-note.entity.js';

describe('CustomerNote', () => {
  it('creates note with trimmed body', () => {
    const note = CustomerNote.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      body: '  تماس گرفت — پیگیری شود  ',
      authorStaffId: 'staff-1',
      isPinned: true,
    });

    expect(note.body).toBe('تماس گرفت — پیگیری شود');
    expect(note.authorStaffId).toBe('staff-1');
    expect(note.isPinned).toBe(true);
  });

  it('rejects empty body', () => {
    expect(() =>
      CustomerNote.create({
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
        body: '   ',
        authorStaffId: 'staff-1',
      }),
    ).toThrow(expect.objectContaining({ code: 'FIELD_REQUIRED' }));
  });

  it('rejects body longer than 5000 characters', () => {
    expect(() =>
      CustomerNote.create({
        tenantId: 'tenant-1',
        tenantCustomerId: 'customer-1',
        body: 'a'.repeat(5001),
        authorStaffId: 'staff-1',
      }),
    ).toThrow(expect.objectContaining({ code: 'FIELD_TOO_LONG' }));
  });

  it('clears pin on soft delete', () => {
    const note = CustomerNote.create({
      tenantId: 'tenant-1',
      tenantCustomerId: 'customer-1',
      body: 'یادداشت',
      authorStaffId: 'staff-1',
      isPinned: true,
    });

    note.softDelete('staff-2');
    expect(note.isPinned).toBe(false);
    expect(note.isDeleted).toBe(true);
  });
});
