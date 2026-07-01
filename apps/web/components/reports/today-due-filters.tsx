'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useState } from 'react';

import type { TodayDueReportFiltersState } from '@/lib/reports/today-due-report.utils';

type TodayDueFiltersProps = {
  value: TodayDueReportFiltersState;
  branches: BranchListItemDto[];
  onChange: (next: TodayDueReportFiltersState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
};

export function TodayDueFilters({
  value,
  branches,
  onChange,
  onClear,
  hasActiveFilters,
  disabled = false,
}: TodayDueFiltersProps) {
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="flex min-w-44 flex-col gap-1">
          <Label htmlFor="today-due-branch-filter">شعبه</Label>
          <select
            id="today-due-branch-filter"
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

        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label htmlFor="today-due-customer-search">مشتری</Label>
          <Input
            id="today-due-customer-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="جستجو نام یا شماره مشتری..."
            disabled={disabled}
            autoComplete="off"
          />
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
