'use client';

import type { BranchListItemDto } from '@hivork/contracts';
import { Button, Label } from '@hivork/ui';

type BranchSelectStepProps = {
  branches: BranchListItemDto[];
  selectedBranchId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (branchId: string) => void;
  onSubmit: () => void;
  onBack: () => void;
};

export function BranchSelectStep({
  branches,
  selectedBranchId,
  loading,
  error,
  onSelect,
  onSubmit,
  onBack,
}: BranchSelectStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-neutral-600">مرحله ۴ از ۴: انتخاب شعبه فعال</p>
      <p className="text-xs text-neutral-500">شعبه‌ای که می‌خواهید با آن کار کنید را انتخاب کنید.</p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="active-branch">شعبه فعال</Label>
        <select
          id="active-branch"
          className="min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base"
          value={selectedBranchId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading}
        >
          <option value="" disabled>
            انتخاب شعبه…
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
              {branch.isDefault ? ' (پیش‌فرض)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button
        type="button"
        className="min-h-11 w-full"
        disabled={loading || !selectedBranchId}
        onClick={onSubmit}
      >
        {loading ? 'در حال ورود…' : 'ورود به پنل →'}
      </Button>
      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onBack}>
        بازگشت
      </Button>
    </div>
  );
}
