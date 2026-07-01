'use client';

import type { FilterFieldDef, FilterOperator } from '@hivork/contracts/ui';
import { operatorRequiresRangeValue, operatorRequiresValue } from '@hivork/contracts/ui';
import { Checkbox, Input, Label } from '@hivork/ui';

import { findFieldDef } from '@/lib/filter/filter-ast.utils';

type FilterValueInputProps = {
  field: FilterFieldDef | undefined;
  operator: FilterOperator;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
};

export function FilterValueInput({
  field,
  operator,
  value,
  onChange,
  disabled = false,
}: FilterValueInputProps) {
  if (!field || !operatorRequiresValue(operator)) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-xs text-muted-foreground">مقدار</Label>
        <Input disabled value="" placeholder="—" aria-label="مقدار فیلتر" />
      </div>
    );
  }

  if (operatorRequiresRangeValue(operator)) {
    const range = (value as { from?: string; to?: string } | undefined) ?? {};
    return (
      <div className="flex min-w-0 flex-[2] flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">از</Label>
          <Input
            type={field.type === 'date' ? 'date' : field.type === 'money_rial' ? 'text' : 'number'}
            inputMode={field.type === 'money_rial' ? 'numeric' : undefined}
            dir={field.type === 'money_rial' ? 'ltr' : undefined}
            value={range.from ?? ''}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...range, from: event.target.value || undefined })
            }
            aria-label="مقدار از"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">تا</Label>
          <Input
            type={field.type === 'date' ? 'date' : field.type === 'money_rial' ? 'text' : 'number'}
            inputMode={field.type === 'money_rial' ? 'numeric' : undefined}
            dir={field.type === 'money_rial' ? 'ltr' : undefined}
            value={range.to ?? ''}
            disabled={disabled}
            onChange={(event) => onChange({ ...range, to: event.target.value || undefined })}
            aria-label="مقدار تا"
          />
        </div>
      </div>
    );
  }

  if (field.type === 'enum' && field.enumOptions) {
    const selected = Array.isArray(value) ? value : value ? [String(value)] : [];
    const multi = operator === 'in' || operator === 'not_in';

    if (multi) {
      return (
        <div className="flex min-w-0 flex-[2] flex-col gap-2">
          <Label className="text-xs text-muted-foreground">مقدار</Label>
          <div className="flex flex-wrap gap-3">
            {field.enumOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selected.includes(option.value)}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, option.value]
                      : selected.filter((item) => item !== option.value);
                    onChange(next);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-xs text-muted-foreground">مقدار</Label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label="مقدار فیلتر"
        >
          <option value="">انتخاب</option>
          {field.enumOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-xs text-muted-foreground">مقدار</Label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={value === true ? 'true' : value === false ? 'false' : ''}
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value === 'true') {
              onChange(true);
              return;
            }
            if (event.target.value === 'false') {
              onChange(false);
              return;
            }
            onChange(undefined);
          }}
          aria-label="مقدار بولین"
        >
          <option value="">انتخاب</option>
          <option value="true">بله</option>
          <option value="false">خیر</option>
        </select>
      </div>
    );
  }

  const inputType =
    field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'money_rial' ? 'text' : 'text';

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Label className="text-xs text-muted-foreground">مقدار</Label>
      <Input
        type={inputType}
        inputMode={field.type === 'money_rial' ? 'numeric' : undefined}
        dir={field.type === 'money_rial' || field.type === 'uuid' ? 'ltr' : undefined}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label="مقدار فیلتر"
      />
    </div>
  );
}

export function getFieldFromCatalog(fields: FilterFieldDef[], fieldId: string) {
  return findFieldDef(fields, fieldId);
}
