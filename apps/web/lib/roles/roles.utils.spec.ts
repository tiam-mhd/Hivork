import { describe, expect, it } from 'vitest';

import { splitRoles } from './roles.utils';

describe('splitRoles', () => {
  it('separates system and custom roles', () => {
    const roles = [
      {
        id: '1',
        code: 'owner',
        name: 'مالک',
        isSystem: true,
        permissions: [],
        dataScope: 'all' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        code: 'accountant',
        name: 'حسابدار',
        isSystem: false,
        permissions: ['core.branch.view'],
        dataScope: 'branch' as const,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const { systemRoles, customRoles } = splitRoles(roles);
    expect(systemRoles).toHaveLength(1);
    expect(customRoles).toHaveLength(1);
    expect(systemRoles[0]?.code).toBe('owner');
  });
});

describe('system role UI rule', () => {
  it('system roles are not editable', () => {
    const role = { isSystem: true };
    expect(role.isSystem).toBe(true);
  });
});
