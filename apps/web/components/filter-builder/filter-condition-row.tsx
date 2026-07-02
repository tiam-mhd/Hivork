'use client';

import type { FilterCondition, FilterFieldDef } from '@hivork/contracts/ui';
import { Button } from '@hivork/ui';

import { FilterFieldSelect, FilterOperatorSelect } from './filter-field-select';
import { FilterValueInput } from './filter-value-input';

import {
  findFieldDef,
  getInitialOperatorForField,
} from '@/lib/filter/filter-ast.utils';
import { getDefaultOperatorForField } from '@/lib/filter/filter-operators';


type FilterConditionRowProps = {
  fields: FilterFieldDef[];
  condition: FilterCondition;
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
};

export function FilterConditionRow({
  fields,
  condition,
  onChange,
  onRemove,
  canRemove,
  disabled = false,
}: FilterConditionRowProps) {
  const field = findFieldDef(fields, condition.field);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <FilterFieldSelect
          fields={fields}
          value={condition.field}
          disabled={disabled}
          onChange={(fieldId) => {
            const nextField = findFieldDef(fields, fieldId);
            onChange({
              ...condition,
              field: fieldId,
              operator: nextField
                ? getDefaultOperatorForField(nextField)
                : getInitialOperatorForField(undefined),
              value: undefined,
            });
          }}
        />

        <FilterOperatorSelect
          fields={fields}
          fieldId={condition.field}
          value={condition.operator}
          disabled={disabled}
          onChange={(operator) => onChange({ ...condition, operator, value: undefined })}
        />

        <FilterValueInput
          field={field}
          operator={condition.operator}
          value={condition.value}
          disabled={disabled}
          onChange={(value) => onChange({ ...condition, value })}
        />
      </div>

      {canRemove ? (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}>
            حذف شرط
          </Button>
        </div>
      ) : null}
    </div>
  );
}
