'use client';

import type { RoleResponseDto } from '@hivork/contracts/core';
import { Label } from '@hivork/ui';

import { DATA_SCOPE_HELP, DATA_SCOPE_LABELS } from '@/lib/roles/roles.utils';

type DataScopeSelectorProps = {
  value: RoleResponseDto['dataScope'];
  onChange: (value: RoleResponseDto['dataScope']) => void;
  disabled?: boolean;
};

const OPTIONS: RoleResponseDto['dataScope'][] = ['all', 'branch', 'own'];

export function DataScopeSelector({ value, onChange, disabled = false }: DataScopeSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="text-sm font-medium text-neutral-900">محدوده داده (Data Scope)</legend>
      {OPTIONS.map((scope) => {
        const inputId = `data-scope-${scope}`;
        return (
          <label
            key={scope}
            htmlFor={inputId}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-neutral-200 p-3 hover:bg-neutral-50"
          >
            <input
              id={inputId}
              type="radio"
              name="data-scope"
              className="mt-1 size-4"
              checked={value === scope}
              onChange={() => onChange(scope)}
            />
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium text-neutral-900">{DATA_SCOPE_LABELS[scope]}</span>
              <span className="text-xs text-neutral-500">{DATA_SCOPE_HELP[scope]}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function DataScopeReadonly({ value }: { value: RoleResponseDto['dataScope'] }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>محدوده داده</Label>
      <p className="text-sm font-medium text-neutral-900">{DATA_SCOPE_LABELS[value]}</p>
      <p className="text-xs text-neutral-500">{DATA_SCOPE_HELP[value]}</p>
    </div>
  );
}
