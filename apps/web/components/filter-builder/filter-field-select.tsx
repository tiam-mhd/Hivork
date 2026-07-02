'use client';

import type { FilterFieldDef, FilterOperator } from '@hivork/contracts/ui';
import { Label, Select } from '@hivork/ui';

import { findFieldDef } from '@/lib/filter/filter-ast.utils';
import {
  FILTER_OPERATOR_LABELS_FA,
  getOperatorsForField,
} from '@/lib/filter/filter-operators';

type FilterFieldSelectProps = {
  fields: FilterFieldDef[];
  value: string;
  onChange: (fieldId: string) => void;
  disabled?: boolean;
};

export function FilterFieldSelect({
  fields,
  value,
  onChange,
  disabled = false,
}: FilterFieldSelectProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Label className="text-xs text-muted-foreground">فیلد</Label>
      <Select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label="فیلد فیلتر"
      >
        <option value="">انتخاب فیلد</option>
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

type FilterOperatorSelectProps = {
  fields: FilterFieldDef[];
  fieldId: string;
  value: FilterOperator;
  onChange: (operator: FilterOperator) => void;
  disabled?: boolean;
};

export function FilterOperatorSelect({
  fields,
  fieldId,
  value,
  onChange,
  disabled = false,
}: FilterOperatorSelectProps) {
  const field = findFieldDef(fields, fieldId);
  const operators = field ? getOperatorsForField(field) : [];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Label className="text-xs text-muted-foreground">عملگر</Label>
      <Select
        value={value}
        disabled={disabled || !field}
        onChange={(event) => onChange(event.target.value as FilterOperator)}
        aria-label="عملگر فیلتر"
      >
        {operators.map((operator) => (
          <option key={operator} value={operator}>
            {FILTER_OPERATOR_LABELS_FA[operator]}
          </option>
        ))}
      </Select>
    </div>
  );
}
