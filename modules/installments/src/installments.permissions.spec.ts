import { describe, expect, it } from 'vitest';

import {
  INSTALLMENTS_PERMISSION_CODES,
  INSTALLMENTS_PERMISSION_DESCRIPTIONS,
  INSTALLMENTS_PERMISSIONS,
} from './installments.permissions.js';

const PERMISSION_CODE_REGEX = /^installments\.[a-z_]+\.[a-z_]+$/;

/** Matches `docs/02-architecture/rbac.md` § Installments (19 permissions). */
const RBAC_INSTALLMENTS_PERMISSION_COUNT = 19;

describe('INSTALLMENTS_PERMISSIONS', () => {
  it('lists all installments permissions from rbac.md', () => {
    expect(INSTALLMENTS_PERMISSION_CODES).toHaveLength(RBAC_INSTALLMENTS_PERMISSION_COUNT);
    expect(INSTALLMENTS_PERMISSIONS).toHaveLength(RBAC_INSTALLMENTS_PERMISSION_COUNT);
  });

  it('every code matches installments permission naming convention', () => {
    for (const code of INSTALLMENTS_PERMISSION_CODES) {
      expect(code).toMatch(PERMISSION_CODE_REGEX);
    }
  });

  it('has a Persian description for every permission code', () => {
    for (const code of INSTALLMENTS_PERMISSION_CODES) {
      const description = INSTALLMENTS_PERMISSION_DESCRIPTIONS[code];
      expect(description).toBeTruthy();
      expect(description).not.toBe(code);
    }
  });

  it('maps permissions to module installments via toPermissionDefinition', () => {
    for (const perm of INSTALLMENTS_PERMISSIONS) {
      expect(perm.module).toBe('installments');
      expect(perm.code).toMatch(PERMISSION_CODE_REGEX);
      expect(perm.resource.length).toBeGreaterThan(0);
      expect(perm.action.length).toBeGreaterThan(0);
    }
  });
});
