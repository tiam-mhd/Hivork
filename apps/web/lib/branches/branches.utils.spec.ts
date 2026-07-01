import { describe, expect, it } from 'vitest';

import { canDeleteBranch } from './branch-form.schema';
import { filterBranchesBySearch } from './branches.utils';

describe('canDeleteBranch', () => {
  it('disables delete for default branch', () => {
    expect(canDeleteBranch({ isDefault: true })).toBe(false);
  });

  it('allows delete for non-default branch', () => {
    expect(canDeleteBranch({ isDefault: false })).toBe(true);
  });
});

describe('filterBranchesBySearch', () => {
  const items = [
    { id: '1', name: 'شعبه شمال', address: 'تهران', phone: '09121234567', isDefault: true, isActive: true, createdAt: '' },
    { id: '2', name: 'شعبه جنوب', address: null, phone: null, isDefault: false, isActive: true, createdAt: '' },
  ];

  it('filters by name', () => {
    expect(filterBranchesBySearch(items, 'شمال')).toHaveLength(1);
  });

  it('returns all when search empty', () => {
    expect(filterBranchesBySearch(items, '')).toHaveLength(2);
  });
});
