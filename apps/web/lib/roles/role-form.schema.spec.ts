import { describe, expect, it } from 'vitest';

import {
  moduleSelectionState,
  toggleModulePermissions,
  togglePermission,
  validateRoleForm,
} from './role-form.schema';
import { slugifyRoleCode } from './roles.utils';

describe('slugifyRoleCode', () => {
  it('creates slug from Persian name transliteration fallback', () => {
    expect(slugifyRoleCode('Accountant')).toBe('accountant');
  });
});

describe('validateRoleForm', () => {
  it('requires at least one permission', () => {
    const errors = validateRoleForm(
      {
        name: 'حسابدار',
        code: 'accountant',
        dataScope: 'all',
        permissions: [],
      },
      'create',
    );

    expect(errors.permissions).toBeTruthy();
  });
});

describe('permission matrix helpers', () => {
  it('toggles individual permission', () => {
    expect(togglePermission([], 'core.branch.view', true)).toEqual(['core.branch.view']);
    expect(togglePermission(['core.branch.view'], 'core.branch.view', false)).toEqual([]);
  });

  it('selects all module permissions', () => {
    const codes = ['core.branch.view', 'core.staff.view'];
    expect(moduleSelectionState(['core.branch.view'], codes)).toBe('partial');
    expect(toggleModulePermissions([], codes, true)).toEqual(codes);
  });
});
