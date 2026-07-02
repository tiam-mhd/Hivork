'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import { Button, Checkbox, Input, Label, Select } from '@hivork/ui';
import { useCallback, useEffect, useId, useState } from 'react';

import { JalaliDatePicker } from '@/components/form/jalali-date-picker';
import {
  SALE_STATUS_OPTIONS,
  type SaleListSort,
  type SaleStatusFilter,
} from '@/lib/sales/sales-list.utils';

export type SaleListFiltersState = {
  search: string;
  statuses: SaleStatusFilter[];
  from: string;
  to: string;
  branchId: string;
  sort: SaleListSort;
  limit: number;
};

type SaleListFiltersProps = {
  value: SaleListFiltersState;
  branches: BranchListItemDto[];
  onChange: (next: SaleListFiltersState) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
};

const STATUS_LABELS: Record<SaleStatusFilter, string> = {
  active: 'فعال',
  completed: 'تکمیل‌شده',
  cancelled: 'لغو‌شده',
};

function countActiveFilters(value: SaleListFiltersState, hasActiveFilters: boolean): number {
  if (!hasActiveFilters) {
    return 0;
  }
  let count = 0;
  if (value.search.trim()) count += 1;
  if (value.statuses.length > 0) count += 1;
  if (value.branchId) count += 1;
  return count;
}

export function SaleListFilters({
  value,
  branches,
  onChange,
  onClear,
  hasActiveFilters,
  disabled = false,
}: SaleListFiltersProps) {
  const panelId = useId();
  const [searchDraft, setSearchDraft] = useState(value.search);
  const [expanded, setExpanded] = useState(false);

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

  const toggleStatus = useCallback(
    (status: SaleStatusFilter, checked: boolean) => {
      const selected = checked
        ? [...value.statuses, status]
        : value.statuses.filter((item) => item !== status);
      onChange({ ...value, statuses: selected });
    },
    [onChange, value],
  );

  const activeCount = countActiveFilters(value, hasActiveFilters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Label htmlFor="sale-customer-search" className="sr-only">
            مشتری
          </Label>
          <Input
            id="sale-customer-search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="جستجو نام یا شماره مشتری..."
            disabled={disabled}
            autoComplete="off"
            className="pe-10"
            aria-label="مشتری"
          />
          <span
            className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-muted-foreground"
            aria-hidden
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-1.5"
            disabled={disabled}
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((open) => !open)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            فیلترها
            {activeCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </Button>

          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-10" onClick={onClear} disabled={disabled}>
              پاک کردن
            </Button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div
          id={panelId}
          className="rounded-xl border border-border bg-card/60 p-4 shadow-sm"
        >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <fieldset className="flex flex-col gap-2 sm:col-span-2 lg:col-span-1" disabled={disabled}>
            <legend className="text-sm font-medium text-foreground">وضعیت</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {SALE_STATUS_OPTIONS.map((status) => (
                <label key={status} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={value.statuses.includes(status)}
                    onCheckedChange={(checked) => toggleStatus(status, checked === true)}
                  />
                  <span>{STATUS_LABELS[status]}</span>
                </label>
              ))}
            </div>
            {value.statuses.length === 0 ? (
              <p className="text-xs text-muted-foreground">همه وضعیت‌ها</p>
            ) : null}
          </fieldset>

          <JalaliDatePicker
            id="sale-from-date"
            label="از تاریخ قرارداد"
            value={value.from ?? ''}
            onChange={(from) => onChange({ ...value, from })}
            disabled={disabled}
            compact
            showHelp={false}
          />

          <JalaliDatePicker
            id="sale-to-date"
            label="تا تاریخ قرارداد"
            value={value.to ?? ''}
            onChange={(to) => onChange({ ...value, to })}
            disabled={disabled}
            compact
            showHelp={false}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sale-branch-filter">شعبه</Label>
            <Select
              id="sale-branch-filter"
              value={value.branchId}
              onChange={(e) => onChange({ ...value, branchId: e.target.value })}
              disabled={disabled}
            >
              <option value="">همه شعبه‌ها</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
