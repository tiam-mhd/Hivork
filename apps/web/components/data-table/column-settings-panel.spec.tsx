import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildDefaultColumnState } from '@/lib/data-table/column-personalization.utils';

import { ColumnSettingsPanel } from './column-settings-panel';
import type { DataTableColumnDef } from './types';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KeyboardSensor: class {},
  PointerSensor: class {},
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: () => [],
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

const COLUMNS: DataTableColumnDef<{ id: string }>[] = [
  { id: 'name', header: 'نام' },
  { id: 'phone', header: 'شماره' },
  { id: 'actions', header: 'عملیات', enableHiding: false },
];

afterEach(() => {
  cleanup();
});

describe('ColumnSettingsPanel', () => {
  it('calls onChange when toggling visibility', () => {
    const onChange = vi.fn();
    const state = buildDefaultColumnState(COLUMNS);

    render(
      <ColumnSettingsPanel
        columns={COLUMNS}
        columnState={state}
        onColumnStateChange={onChange}
        onReset={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('نمایش ستون شماره'));
    expect(onChange).toHaveBeenCalled();
  });

  it('disables checkbox for the last hideable visible column', () => {
    const onlyNameVisible = {
      ...buildDefaultColumnState(COLUMNS),
      visibility: { name: true, phone: false, actions: true },
    };

    render(
      <ColumnSettingsPanel
        columns={COLUMNS}
        columnState={onlyNameVisible}
        onColumnStateChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const nameCheckbox = screen.getByLabelText('نمایش ستون نام');
    expect(nameCheckbox).toHaveProperty('disabled', true);
  });

  it('resets to defaults', () => {
    const onReset = vi.fn();

    render(
      <ColumnSettingsPanel
        columns={COLUMNS}
        columnState={buildDefaultColumnState(COLUMNS)}
        onColumnStateChange={vi.fn()}
        onReset={onReset}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'بازنشانی به پیش‌فرض' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
