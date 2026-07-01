'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import { cn, Select } from '@hivork/ui';

type BranchSwitcherProps = {
  branches: BranchListItemDto[];
  activeBranchId: string | null;
  activeBranchName: string | null;
  loading: boolean;
  disabled?: boolean;
  onChange: (branchId: string) => void;
  className?: string;
};

export function BranchSwitcher({
  branches,
  activeBranchId,
  activeBranchName,
  loading,
  disabled = false,
  onChange,
  className,
}: BranchSwitcherProps) {
  if (branches.length <= 1) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        {activeBranchName ?? 'شعبه پیش‌فرض'}
      </span>
    );
  }

  return (
    <label className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="sr-only">شعبه فعال</span>
      <Select
        aria-label="انتخاب شعبه فعال"
        className="max-w-[10rem] truncate disabled:opacity-60"
        value={activeBranchId ?? ''}
        disabled={disabled || loading || branches.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </Select>
      {loading ? <span className="text-xs text-muted-foreground">…</span> : null}
    </label>
  );
}
