import { describe, expect, it } from 'vitest';

import { CreateBranchSchema, BranchListQuerySchema } from './branch.schema.js';
import { CreatePermissionOverrideSchema } from './permission-override.schema.js';
import { CreateRoleSchema } from './role.schema.js';
import { CreateStaffSchema } from './staff-admin.schema.js';
import { permissionsArraySchema } from './shared.schema.js';

describe('Core admin contracts', () => {
  it('parses valid create branch payload', () => {
    const dto = CreateBranchSchema.parse({
      name: 'شعبه غرب',
      address: 'تهران',
      phone: '09121234567',
      isActive: true,
    });

    expect(dto.name).toBe('شعبه غرب');
    expect(dto.phone).toBe('09121234567');
  });

  it('parses branch list query with cursor pagination defaults', () => {
    const dto = BranchListQuerySchema.parse({});
    expect(dto.limit).toBe(20);
    expect(dto.sort).toBe('createdAt:desc');
  });

  it('parses valid create staff payload', () => {
    const dto = CreateStaffSchema.parse({
      phone: '09129876543',
      name: 'رضا کریمی',
      dataScope: 'branch',
      assignedBranchIds: ['00000000-0000-4000-8000-000000000001'],
    });

    expect(dto.phone).toBe('09129876543');
    expect(dto.assignedBranchIds).toHaveLength(1);
  });

  it('rejects invalid staff phone', () => {
    expect(() =>
      CreateStaffSchema.parse({
        phone: '12345',
        name: 'رضا کریمی',
        dataScope: 'all',
      }),
    ).toThrow();
  });

  it('parses valid create role payload and dedupes permissions', () => {
    const dto = CreateRoleSchema.parse({
      code: 'accountant',
      name: 'حسابدار',
      permissions: ['core.branch.view', 'core.branch.view', 'installments.report.dashboard'],
      dataScope: 'all',
    });

    expect(dto.permissions).toEqual(['core.branch.view', 'installments.report.dashboard']);
  });

  it('rejects reserved role code', () => {
    expect(() =>
      CreateRoleSchema.parse({
        code: 'owner',
        name: 'مالک جعلی',
        permissions: ['core.branch.view'],
        dataScope: 'all',
      }),
    ).toThrow();
  });

  it('rejects permission override reason shorter than 5 chars', () => {
    expect(() =>
      CreatePermissionOverrideSchema.parse({
        permission: 'installments.sale.cancel',
        effect: 'grant',
        reason: 'abcd',
      }),
    ).toThrow();
  });

  it('parses valid permission override payload', () => {
    const dto = CreatePermissionOverrideSchema.parse({
      permission: 'installments.sale.cancel',
      effect: 'deny',
      reason: 'محدودیت موقت به دلیل تخلف',
      expiresAt: '2025-03-01T00:00:00.000Z',
    });

    expect(dto.effect).toBe('deny');
  });

  it('rejects invalid permission code format', () => {
    expect(() => permissionsArraySchema.parse(['INVALID'])).toThrow();
  });
});
