'use client';

import type { BranchListItemDto } from '@hivork/contracts/core';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useState } from 'react';

import type { StaffListFilters, StaffStatusFilter } from '@/lib/staff/staff.utils';

type StaffFiltersProps = {
  value: StaffListFilters;
  branches: BranchListItemDto[];
  onChange: (next: StaffListFilters) => void;
  disabled?: boolean;
};

const STATUS_OPTIONS: Array<{ value: StaffStatusFilter; label: string }> = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'active', label: 'فعال' },
  { value: 'suspended', label: 'غیرفعال' },
];

export function StaffFilters({ value, branches, onChange, disabled = false }: StaffFiltersProps) {
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
  }, [onChange, searchDraft, value]);

  const hasActiveFilters =
    value.search.trim().length > 0 || value.status !== 'all' || value.branchId.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="staff-search">جستجو</Label>
          <Input
            id="staff-search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="جستجو نام یا شماره..."
            disabled={disabled}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="staff-status">وضعیت</Label>
          <select
            id="staff-status"
            className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm"
            value={value.status}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, status: event.target.value as StaffStatusFilter })
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="staff-branch">شعبه</Label>
          <select
            id="staff-branch"
            className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm"
            value={value.branchId}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, branchId: event.target.value })}
          >
            <option value="">همه شعب</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange({ search: '', status: 'all', branchId: '' })}
          >
            پاک کردن فیلترها
          </Button>
        </div>
      ) : null}
    </div>
  );
}
