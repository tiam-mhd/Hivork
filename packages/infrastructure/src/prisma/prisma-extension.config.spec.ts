import { describe, expect, it } from 'vitest';

import { applyDataScopeToWhere, mergeWhere } from './prisma-extension.config.js';

describe('mergeWhere', () => {
  it('returns extra when where is empty', () => {
    expect(mergeWhere(undefined, { tenantId: 't-1' })).toEqual({ tenantId: 't-1' });
  });

  it('combines predicates with AND', () => {
    expect(mergeWhere({ status: 'active' }, { tenantId: 't-1' })).toEqual({
      AND: [{ status: 'active' }, { tenantId: 't-1' }],
    });
  });
});

describe('applyDataScopeToWhere', () => {
  it('maps branchId to defaultBranchId for tenant customers', () => {
    expect(
      applyDataScopeToWhere('TenantCustomer', undefined, {
        branchId: { in: ['branch-1'] },
      }),
    ).toEqual({
      defaultBranchId: { in: ['branch-1'] },
    });
  });

  it('maps createdById to createdByStaffId on Sale', () => {
    expect(
      applyDataScopeToWhere('Sale', { tenantId: 't-1' }, {
        createdById: 'staff-1',
      }),
    ).toEqual({
      AND: [{ tenantId: 't-1' }, { createdByStaffId: 'staff-1' }],
    });
  });

  it('does not apply createdById on TenantCustomer (scoped in repository)', () => {
    expect(
      applyDataScopeToWhere('TenantCustomer', { tenantId: 't-1' }, {
        createdById: 'staff-1',
      }),
    ).toEqual({ tenantId: 't-1' });
  });

  it('does not apply branchId on Branch model (uses id, not branchId)', () => {
    expect(
      applyDataScopeToWhere('Branch', { tenantId: 't-1' }, {
        branchId: { in: ['branch-1'] },
      }),
    ).toEqual({ tenantId: 't-1' });
  });

  it('applies branchId on Sale for branch data scope', () => {
    expect(
      applyDataScopeToWhere('Sale', { tenantId: 't-1' }, {
        branchId: { in: ['branch-1'] },
      }),
    ).toEqual({
      AND: [{ tenantId: 't-1' }, { branchId: { in: ['branch-1'] } }],
    });
  });
});
