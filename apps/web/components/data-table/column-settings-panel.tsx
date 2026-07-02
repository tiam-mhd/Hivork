'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnPersonalization } from '@hivork/contracts/ui';
import { Button, Checkbox, cn } from '@hivork/ui';

import type { DataTableColumnDef } from './types';

import {
  getColumnSettingsItems,
  reorderColumns,
  toggleColumnVisibility,
} from '@/lib/data-table/column-personalization.utils';

type ColumnSettingsPanelProps<T> = {
  columns: DataTableColumnDef<T>[];
  columnState: ColumnPersonalization;
  onColumnStateChange: (state: ColumnPersonalization) => void;
  onReset: () => void;
  onClose?: () => void;
  className?: string;
};

type SortableColumnItemProps = {
  id: string;
  label: string;
  visible: boolean;
  canHide: boolean;
  locked: boolean;
  onToggle: () => void;
};

function SortableColumnItem({
  id,
  label,
  visible,
  canHide,
  locked,
  onToggle,
}: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-transparent px-2 py-2',
        isDragging && 'border-border bg-muted/60 shadow-sm',
      )}
    >
      <button
        type="button"
        className={cn(
          'flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground',
          'touch-none hover:bg-muted hover:text-foreground active:cursor-grabbing',
        )}
        aria-label={`جابجایی ستون ${label}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden className="text-base leading-none">
          ≡
        </span>
      </button>

      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{label}</span>

      {locked ? (
        <span
          className="text-xs text-muted-foreground"
          title="این ستون قابل مخفی‌سازی نیست"
        >
          ثابت
        </span>
      ) : (
        <Checkbox
          checked={visible}
          disabled={visible && !canHide}
          onCheckedChange={() => onToggle()}
          aria-label={`نمایش ستون ${label}`}
        />
      )}
    </div>
  );
}

export function ColumnSettingsPanel<T>({
  columns,
  columnState,
  onColumnStateChange,
  onReset,
  onClose,
  className,
}: ColumnSettingsPanelProps<T>) {
  const items = getColumnSettingsItems(columns, columnState);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    onColumnStateChange(
      reorderColumns(columnState, String(active.id), String(over.id)),
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-lg',
        className,
      )}
      role="dialog"
      aria-label="تنظیم ستون‌ها"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">تنظیم ستون‌ها</h2>
        {onClose ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            بستن
          </Button>
        ) : null}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {items.map((item) => (
              <SortableColumnItem
                key={item.id}
                id={item.id}
                label={item.label}
                visible={item.visible}
                canHide={item.canHide}
                locked={item.locked}
                onToggle={() =>
                  onColumnStateChange(toggleColumnVisibility(columnState, item.id, columns))
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onReset}>
        بازنشانی به پیش‌فرض
      </Button>
    </div>
  );
}
