import { describe, expect, it } from 'vitest';

import { Role } from './role.vo.js';

describe('Role', () => {
  it('soft deletes custom tenant role', () => {
    const role = new Role('role-1', 'tenant-1', false, 'حسابدار');

    role.softDelete('staff-1');
    expect(role.isDeleted).toBe(true);
    expect(role.deletedById).toBe('staff-1');

    role.restore();
    expect(role.isDeleted).toBe(false);
  });

  it('forbids soft delete on template role', () => {
    const role = new Role('role-1', null, true, 'مالک');

    expect(() => role.softDelete('staff-1')).toThrow(
      expect.objectContaining({ code: 'DELETE_FORBIDDEN' }),
    );
  });
});
