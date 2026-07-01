'use client';

import type {
  FilterCondition,
  FilterFieldDef,
  FilterGroup,
} from '@hivork/contracts/ui';
import { Button, cn } from '@hivork/ui';

import { createEmptyCondition, createEmptyGroup } from '@/lib/filter/filter-ast.utils';

import { FilterConditionRow } from './filter-condition-row';

type FilterGroupEditorProps = {
  fields: FilterFieldDef[];
  group: FilterGroup;
  onChange: (group: FilterGroup) => void;
  onRemove?: () => void;
  depth?: number;
  allowNestedGroups?: boolean;
  disabled?: boolean;
};

export function FilterGroupEditor({
  fields,
  group,
  onChange,
  onRemove,
  depth = 1,
  allowNestedGroups = true,
  disabled = false,
}: FilterGroupEditorProps) {
  const canAddNestedGroup = allowNestedGroups && depth < 2;

  const updateChild = (index: number, nextChild: FilterCondition | FilterGroup) => {
    const children = [...group.children];
    children[index] = nextChild;
    onChange({ ...group, children });
  };

  const removeChild = (index: number) => {
    if (group.children.length <= 1) {
      return;
    }
    onChange({
      ...group,
      children: group.children.filter((_, childIndex) => childIndex !== index),
    });
  };

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border p-3',
        depth > 1 && 'bg-muted/20',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">ترکیب با</span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(['and', 'or'] as const).map((logic) => (
              <button
                key={logic}
                type="button"
                disabled={disabled}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  group.logic === logic
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
                onClick={() => onChange({ ...group, logic })}
              >
                {logic === 'and' ? 'و' : 'یا'}
              </button>
            ))}
          </div>
        </div>

        {onRemove ? (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
            حذف گروه
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        {group.children.map((child, index) =>
          child.type === 'group' ? (
            <FilterGroupEditor
              key={`group-${index}`}
              fields={fields}
              group={child}
              depth={depth + 1}
              allowNestedGroups={allowNestedGroups}
              disabled={disabled}
              onChange={(nextGroup) => updateChild(index, nextGroup)}
              onRemove={() => removeChild(index)}
            />
          ) : (
            <FilterConditionRow
              key={`condition-${index}`}
              fields={fields}
              condition={child}
              disabled={disabled}
              canRemove={group.children.length > 1}
              onChange={(nextCondition) => updateChild(index, nextCondition)}
              onRemove={() => removeChild(index)}
            />
          ),
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onChange({
              ...group,
              children: [...group.children, createEmptyCondition(fields[0]?.id ?? '')],
            })
          }
        >
          ＋ شرط
        </Button>
        {canAddNestedGroup ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() =>
              onChange({
                ...group,
                children: [...group.children, createEmptyGroup(group.logic)],
              })
            }
          >
            ＋ گروه
          </Button>
        ) : null}
      </div>
    </div>
  );
}
