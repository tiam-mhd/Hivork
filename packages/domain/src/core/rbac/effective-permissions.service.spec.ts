import { describe, expect, it } from 'vitest';

import { hasPermission, resolveEffectivePermissions } from './effective-permissions.service.js';

describe('resolveEffectivePermissions', () => {
  const seedPermissions = {
    a: 'installments.sale.view',
    b: 'core.customer.delete',
    restore: 'core.customer.restore',
    recycle: 'core.recycle.view',
  };

  it('grants role permission when no overrides', () => {
    const effective = resolveEffectivePermissions({
      rolePermissions: [seedPermissions.a],
      grants: [],
      denies: [],
    });

    expect(hasPermission(effective, seedPermissions.a)).toBe(true);
  });

  it('deny override blocks role permission', () => {
    const effective = resolveEffectivePermissions({
      rolePermissions: [seedPermissions.a],
      grants: [],
      denies: [seedPermissions.a],
    });

    expect(hasPermission(effective, seedPermissions.a)).toBe(false);
  });

  it('grant override adds permission without role', () => {
    const effective = resolveEffectivePermissions({
      rolePermissions: [],
      grants: [seedPermissions.b],
      denies: [],
    });

    expect(hasPermission(effective, seedPermissions.b)).toBe(true);
  });

  it('deny wins over grant for same permission', () => {
    const effective = resolveEffectivePermissions({
      rolePermissions: [seedPermissions.a],
      grants: [seedPermissions.b],
      denies: [seedPermissions.b],
    });

    expect(hasPermission(effective, seedPermissions.b)).toBe(false);
  });

  it('includes seed extras core.customer.restore and core.recycle.view', () => {
    const effective = resolveEffectivePermissions({
      rolePermissions: [seedPermissions.restore, seedPermissions.recycle],
      grants: [],
      denies: [],
    });

    expect(hasPermission(effective, 'core.customer.restore')).toBe(true);
    expect(hasPermission(effective, 'core.recycle.view')).toBe(true);
  });

  it('ignores expired overrides', () => {
    const expiredAt = new Date('2020-01-01T00:00:00.000Z');
    const now = new Date('2025-01-01T00:00:00.000Z');

    const effective = resolveEffectivePermissions({
      rolePermissions: [],
      overrides: [
        { permission: seedPermissions.b, effect: 'grant', expiresAt: expiredAt },
        { permission: seedPermissions.a, effect: 'deny', expiresAt: expiredAt },
      ],
      now,
    });

    expect(hasPermission(effective, seedPermissions.b)).toBe(false);
    expect(hasPermission(effective, seedPermissions.a)).toBe(false);
  });

  it('applies non-expired overrides with deny precedence', () => {
    const now = new Date('2025-01-01T00:00:00.000Z');
    const future = new Date('2026-01-01T00:00:00.000Z');

    const effective = resolveEffectivePermissions({
      rolePermissions: [seedPermissions.a],
      overrides: [
        { permission: seedPermissions.b, effect: 'grant', expiresAt: future },
        { permission: seedPermissions.b, effect: 'deny', expiresAt: future },
      ],
      now,
    });

    expect(hasPermission(effective, seedPermissions.a)).toBe(true);
    expect(hasPermission(effective, seedPermissions.b)).toBe(false);
  });
});
