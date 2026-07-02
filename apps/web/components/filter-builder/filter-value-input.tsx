'use client';

import type { FilterFieldDef, FilterOperator } from '@hivork/contracts/ui';
import { operatorRequiresRangeValue, operatorRequiresValue } from '@hivork/contracts/ui';
import { Checkbox, Input, Label } from '@hivork/ui';
import { useTranslations } from 'next-intl';

import { DatePicker } from '@/components/date-picker';
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
  const t = useTranslations('filter');
  const tCommon = useTranslations('common');

  if (!field || !operatorRequiresValue(operator)) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label className="text-xs text-muted-foreground">{t('valueLabel')}</Label>
        <Input disabled value="" placeholder="—" aria-label={t('valueLabel')} />
      </div>
    );
  }

  if (operatorRequiresRangeValue(operator)) {
    const range = (value as { from?: string; to?: string } | undefined) ?? {};

    if (field.type === 'date') {
      return (
        <div className="flex min-w-0 flex-[2] flex-col gap-1">
          <DatePicker
            mode="range"
            rangeValue={range}
            onRangeChange={(next) => onChange(next)}
            disabled={disabled}
            compact
            showHelp={false}
          />
        </div>
      );
    }

    return (
      <div className="flex min-w-0 flex-[2] flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{tCommon('from')}</Label>
          <Input
            type={field.type === 'money_rial' ? 'text' : 'number'}
            inputMode={field.type === 'money_rial' ? 'numeric' : undefined}
            dir={field.type === 'money_rial' ? 'ltr' : undefined}
            value={range.from ?? ''}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...range, from: event.target.value || undefined })
            }
            aria-label={t('fromValue')}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">{tCommon('to')}</Label>
          <Input
            type={field.type === 'money_rial' ? 'text' : 'number'}
            inputMode={field.type === 'money_rial' ? 'numeric' : undefined}
            dir={field.type === 'money_rial' ? 'ltr' : undefined}
            value={range.to ?? ''}
            disabled={disabled}
            onChange={(event) => onChange({ ...range, to: event.target.value || undefined })}
            aria-label={t('toValue')}
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
          <Label className="text-xs text-muted-foreground">{t('valueLabel')}</Label>
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
        <Label className="text-xs text-muted-foreground">{t('valueLabel')}</Label>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label={t('valueLabel')}
        >
          <option value="">{tCommon('select')}</option>
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
        <Label className="text-xs text-muted-foreground">{t('valueLabel')}</Label>
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
          aria-label={t('valueLabel')}
        >
          <option value="">{tCommon('select')}</option>
          <option value="true">{tCommon('yes')}</option>
          <option value="false">{tCommon('no')}</option>
        </select>
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <DatePicker
          mode="single"
          value={typeof value === 'string' ? value : undefined}
          onChange={(next) => onChange(next)}
          disabled={disabled}
          compact
          showHelp={false}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{t('valueLabel')}</Label>
      <Input
        type={field.type === 'number' || field.type === 'money_rial' ? 'text' : 'text'}
        inputMode={field.type === 'money_rial' ? 'numeric' : undefined}
        dir={field.type === 'money_rial' || field.type === 'uuid' ? 'ltr' : undefined}
        value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t('valueLabel')}
      />
    </div>
  );
}

export function getFieldFromCatalog(fields: FilterFieldDef[], fieldId: string) {
  return findFieldDef(fields, fieldId);
}
