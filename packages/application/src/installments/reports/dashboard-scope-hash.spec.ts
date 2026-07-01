import { describe, expect, it } from 'vitest';

import { buildDashboardScopeHash } from './dashboard-scope-hash.js';

describe('buildDashboardScopeHash', () => {
  it('hashes own scope by staff id', () => {
    expect(buildDashboardScopeHash({ createdByStaffId: 'staff-1' })).toBe('own:staff-1');
  });

  it('hashes branch scope with sorted branch ids', () => {
    expect(buildDashboardScopeHash({ branchIds: ['b-2', 'b-1'] })).toBe('branch:b-1,b-2');
  });

  it('uses all for unrestricted scope', () => {
    expect(buildDashboardScopeHash({})).toBe('all');
  });
});
