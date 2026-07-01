'use client';

import type { BranchListItemDto } from '@hivork/contracts/core';
import { Button, Input, Label } from '@hivork/ui';

import { canDeleteBranch } from '@/lib/branches/branch-form.schema';
import { filterBranchesBySearch } from '@/lib/branches/branches.utils';

type BranchesTableProps = {
  items: BranchListItemDto[];
  search: string;
  onSearchChange: (value: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (branch: BranchListItemDto) => void;
  onDelete: (branch: BranchListItemDto) => void;
  disabled?: boolean;
};

function DefaultBranchBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200">
      شعبه پیش‌فرض
    </span>
  );
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
        فعال
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200">
      غیرفعال
    </span>
  );
}

function BranchActions({
  branch,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  disabled,
}: {
  branch: BranchListItemDto;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (branch: BranchListItemDto) => void;
  onDelete: (branch: BranchListItemDto) => void;
  disabled?: boolean;
}) {
  const deleteAllowed = canDelete && canDeleteBranch(branch);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canUpdate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onEdit(branch)}
        >
          ویرایش
        </Button>
      ) : null}
      {canDelete ? (
        <span title={deleteAllowed ? undefined : 'شعبه پیش‌فرض قابل حذف نیست'}>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={disabled || !deleteAllowed}
            onClick={() => onDelete(branch)}
          >
            حذف
          </Button>
        </span>
      ) : null}
    </div>
  );
}

export function BranchesTableSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="در حال بارگذاری شعب">
      <div className="h-10 w-full max-w-sm animate-pulse rounded bg-neutral-100" />
      <div className="hidden h-64 animate-pulse rounded-lg bg-neutral-100 md:block" />
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

export function BranchesTable({
  items,
  search,
  onSearchChange,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  disabled = false,
}: BranchesTableProps) {
  const filteredItems = filterBranchesBySearch(items, search);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-md flex-col gap-1">
        <Label htmlFor="branch-search">جستجو</Label>
        <Input
          id="branch-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جستجو نام، آدرس یا تلفن..."
          disabled={disabled}
          autoComplete="off"
        />
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[48rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-start text-neutral-600">
              <th className="px-2 py-2 font-medium">نام</th>
              <th className="px-2 py-2 font-medium">آدرس</th>
              <th className="px-2 py-2 font-medium">تلفن</th>
              <th className="px-2 py-2 font-medium">وضعیت</th>
              <th className="px-2 py-2 font-medium">
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((branch) => (
              <tr key={branch.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-2 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">{branch.name}</span>
                    {branch.isDefault ? <DefaultBranchBadge /> : null}
                  </div>
                </td>
                <td className="px-2 py-2 text-neutral-700">{branch.address?.trim() || '—'}</td>
                <td className="px-2 py-2 font-mono text-neutral-700" dir="ltr">
                  {branch.phone ?? '—'}
                </td>
                <td className="px-2 py-2">
                  <ActiveStatusBadge isActive={branch.isActive} />
                </td>
                <td className="px-2 py-2">
                  <BranchActions
                    branch={branch}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    disabled={disabled}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {filteredItems.map((branch) => (
          <article
            key={branch.id}
            className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium text-neutral-900">{branch.name}</h3>
              {branch.isDefault ? <DefaultBranchBadge /> : null}
              <ActiveStatusBadge isActive={branch.isActive} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm text-neutral-700">
              <div>
                <dt className="text-neutral-500">آدرس</dt>
                <dd>{branch.address?.trim() || '—'}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">تلفن</dt>
                <dd dir="ltr" className="font-mono">
                  {branch.phone ?? '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <BranchActions
                branch={branch}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={onEdit}
                onDelete={onDelete}
                disabled={disabled}
              />
            </div>
          </article>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-600">نتیجه‌ای یافت نشد.</p>
      ) : null}
    </div>
  );
}
