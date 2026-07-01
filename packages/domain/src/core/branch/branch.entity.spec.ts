import { describe, expect, it } from 'vitest';

import { DomainError } from '../../errors/domain.error.js';

import { Branch } from './branch.entity.js';

describe('Branch', () => {
  it('creates default branch for tenant', () => {
    const branch = Branch.createDefault('tenant-1');

    expect(branch.tenantId).toBe('tenant-1');
    expect(branch.name).toBe('شعبه اصلی');
    expect(branch.isDefault).toBe(true);
    expect(branch.isActive).toBe(true);
    expect(branch.isDeleted).toBe(false);
  });

  it('renames branch when name is valid', () => {
    const branch = Branch.createDefault('tenant-1');
    branch.rename('  شعبه شمال  ');

    expect(branch.name).toBe('شعبه شمال');
  });

  it('rejects rename with short name', () => {
    const branch = Branch.createDefault('tenant-1');

    expect(() => branch.rename('a')).toThrow(
      expect.objectContaining({ code: 'INVALID_BRANCH_NAME' }),
    );
  });

  it('cannot deactivate default branch', () => {
    const branch = Branch.createDefault('tenant-1');

    expect(() => branch.deactivate()).toThrow(
      expect.objectContaining({ code: 'CANNOT_DEACTIVATE_DEFAULT_BRANCH' }),
    );
  });

  it('cannot soft delete default branch', () => {
    const branch = Branch.createDefault('tenant-1');

    expect(() => branch.softDelete('staff-1')).toThrow(
      expect.objectContaining({ code: 'DELETE_FORBIDDEN' }),
    );
  });

  it('soft deletes and restores non-default branch', () => {
    const branch = new Branch('b-1', 'tenant-1', 'شعبه دوم', null, false, true);

    branch.softDelete('staff-1');
    expect(branch.isDeleted).toBe(true);
    expect(branch.isActive).toBe(false);

    branch.restore();
    expect(branch.isDeleted).toBe(false);
    expect(branch.isActive).toBe(true);
  });

  it('throws on double soft delete', () => {
    const branch = new Branch('b-1', 'tenant-1', 'شعبه دوم', null, false, true);
    branch.softDelete('staff-1');

    expect(() => branch.softDelete('staff-2')).toThrow(
      expect.objectContaining({ code: 'ALREADY_DELETED' }),
    );
  });

  it('throws restore when not deleted', () => {
    const branch = new Branch('b-1', 'tenant-1', 'شعبه دوم', null, false, true);

    expect(() => branch.restore()).toThrow(
      expect.objectContaining({ code: 'NOT_DELETED' }),
    );
  });

  it('deactivates non-default branch', () => {
    const branch = new Branch('b-1', 'tenant-1', 'شعبه دوم', null, false, true);
    branch.deactivate();

    expect(branch.isActive).toBe(false);
  });
});
