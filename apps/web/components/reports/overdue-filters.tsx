'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import { useCallback, useEffect, useState } from 'react';

import { TomanInput } from '@/components/form/toman-input';
import {
  OVERDUE_REPORT_SORT_OPTIONS,
  OVERDUE_SORT_LABELS,
  type OverdueReportFiltersState,
} from '@/lib/reports/overdue-report.utils';

type OverdueFiltersProps = {
  value: OverdueReportFiltersState;
  branches: BranchListItemDto[];
  onChange: (next: OverdueReportFiltersState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
};

export function OverdueFilters({
  value,
  branches,
  onChange,
  onClear,
  hasActiveFilters,
  disabled = false,
}: OverdueFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(value.search);

  useEffect(() => {
    setSearchDraft(value.search);
  }, [value.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== value.search) {
        onChange({ ...value, search: searchDraft });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchDraft, value, onChange]);

  const handleOverdueDaysChange = useCallback(
    (field: 'overdueDaysMin' | 'overdueDaysMax', raw: string) => {
      const digits = raw.replace(/\D/g, '');
      onChange({ ...value, [field]: digits });
    },
    [onChange, value],
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex min-w-44 flex-col gap-1">
          <Label htmlFor="overdue-branch-filter">شعبه</Label>
          <select
            id="overdue-branch-filter"
            value={value.branchId}
            onChange={(e) => onChange({ ...value, branchId: e.target.value })}
            disabled={disabled}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">همه شعبه‌ها</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label>روز معوق</Label>
          <div className="flex items-center gap-2">
            <Input
              id="overdue-days-min"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={value.overdueDaysMin}
              onChange={(e) => handleOverdueDaysChange('overdueDaysMin', e.target.value)}
              placeholder="از"
              disabled={disabled}
              className="w-20"
              aria-label="حداقل روز معوق"
            />
            <span className="text-neutral-400" aria-hidden>
              —
            </span>
            <Input
              id="overdue-days-max"
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={value.overdueDaysMax}
              onChange={(e) => handleOverdueDaysChange('overdueDaysMax', e.target.value)}
              placeholder="تا"
              disabled={disabled}
              className="w-20"
              aria-label="حداکثر روز معوق"
            />
          </div>
        </div>

        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label htmlFor="overdue-customer-search">مشتری</Label>
          <Input
            id="overdue-customer-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="جستجو نام یا شماره مشتری..."
            disabled={disabled}
            autoComplete="off"
          />
        </div>

        <div className="min-w-44 flex-1 sm:max-w-xs">
          <TomanInput
            id="overdue-min-amount"
            label="حداقل مبلغ"
            value={value.minAmountRial}
            onChange={(minAmountRial) => onChange({ ...value, minAmountRial })}
            disabled={disabled}
          />
        </div>

        <div className="flex min-w-44 flex-col gap-1">
          <Label htmlFor="overdue-sort">مرتب‌سازی</Label>
          <select
            id="overdue-sort"
            value={value.sort}
            onChange={(e) =>
              onChange({
                ...value,
                sort: e.target.value as OverdueReportFiltersState['sort'],
              })
            }
            disabled={disabled}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            {OVERDUE_REPORT_SORT_OPTIONS.map((sort) => (
              <option key={sort} value={sort}>
                {OVERDUE_SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters ? (
          <Button type="button" variant="outline" onClick={onClear} disabled={disabled}>
            پاک کردن فیلتر
          </Button>
        ) : null}
      </div>
    </div>
  );
}
