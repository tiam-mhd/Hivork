'use client';

import type { FilterAst, FilterFieldDef } from '@hivork/contracts/ui';
import type { ReactNode } from 'react';

import { FilterGroupEditor } from './filter-group';

type FilterBuilderProps = {
  fields: FilterFieldDef[];
  value: FilterAst;
  onChange: (value: FilterAst) => void;
  quickFilters?: ReactNode;
  disabled?: boolean;
  validationMessage?: string | null;
};

export function FilterBuilder({
  fields,
  value,
  onChange,
  quickFilters,
  disabled = false,
  validationMessage,
}: FilterBuilderProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        چند شرط را با «و» یا «یا» ترکیب کنید. حداکثر یک سطح گروه تو در تو مجاز است.
      </p>

      {quickFilters ? <div className="flex flex-col gap-2">{quickFilters}</div> : null}

      <FilterGroupEditor
        fields={fields}
        group={value.root}
        disabled={disabled}
        onChange={(root) => onChange({ root })}
      />

      {validationMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {validationMessage}
        </p>
      ) : null}
    </div>
  );
}
