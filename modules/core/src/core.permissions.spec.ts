import { describe, expect, it } from 'vitest';

import { CORE_PERMISSION_CODES, CORE_PERMISSIONS, toPermissionDefinition } from './core.permissions.js';

describe('CORE_PERMISSIONS', () => {
  it('lists all core permissions from rbac.md', () => {
    expect(CORE_PERMISSION_CODES).toHaveLength(14);
    expect(CORE_PERMISSIONS).toHaveLength(14);
  });

  it('parses permission code into module/resource/action', () => {
    expect(toPermissionDefinition('core.branch.view')).toEqual({
      code: 'core.branch.view',
      module: 'core',
      resource: 'branch',
      action: 'view',
    });
  });
});
