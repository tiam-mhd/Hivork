import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FilterFieldDef } from '@hivork/contracts/ui';

import { createEmptyFilterAst } from '@/lib/filter/filter-ast.utils';

import { FilterBuilder } from './filter-builder';

const FIELDS: FilterFieldDef[] = [
  { id: 'name', label: 'نام', type: 'string' },
  { id: 'status', label: 'وضعیت', type: 'enum', enumOptions: [{ value: 'active', label: 'فعال' }] },
];

afterEach(() => {
  cleanup();
});

describe('FilterBuilder', () => {
  it('adds a condition', () => {
    const onChange = vi.fn();
    const value = createEmptyFilterAst('name');

    render(<FilterBuilder fields={FIELDS} value={value} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '＋ شرط' }));
    expect(onChange).toHaveBeenCalled();
  });
  it('removes a condition when multiple exist', () => {
    const onChange = vi.fn();
    const withTwoConditions = createEmptyFilterAst('name');
    withTwoConditions.root.children = [
      { type: 'condition', field: 'name', operator: 'contains', value: 'a' },
      { type: 'condition', field: 'status', operator: 'eq', value: 'active' },
    ];

    render(<FilterBuilder fields={FIELDS} value={withTwoConditions} onChange={onChange} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'حذف شرط' })[0]!);
    expect(onChange).toHaveBeenCalled();
  });

  it('toggles group logic between AND and OR', () => {
    const onChange = vi.fn();
    const value = createEmptyFilterAst('name');

    render(<FilterBuilder fields={FIELDS} value={value} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'یا' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        root: expect.objectContaining({ logic: 'or' }),
      }),
    );
  });
});
