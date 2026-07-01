'use client';

import type { RoleResponseDto, StaffListItemDto } from '@hivork/contracts/core';
import { formatIsoDateAsJalali } from '@hivork/i18n';
import { Button } from '@hivork/ui';

import { BranchChips, RoleBadges } from '@/components/staff/role-badges';
import { maskPhone } from '@/lib/auth/phone-utils';
import {
  canDeleteStaff,
  filterStaffBySearch,
  resolveBranchLabels,
  resolveRoleEmbeds,
  rolesByIdMap,
} from '@/lib/staff/staff.utils';

type StaffTableProps = {
  items: StaffListItemDto[];
  search: string;
  roles: RoleResponseDto[];
  branchesById: Map<string, string>;
  currentStaffId?: string;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (staff: StaffListItemDto) => void;
  onDelete: (staff: StaffListItemDto) => void;
  disabled?: boolean;
};

function StaffStatusBadge({ status }: { status: StaffListItemDto['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
        فعال
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      غیرفعال
    </span>
  );
}

function formatLastLogin(lastLoginAt: string | null): string {
  if (!lastLoginAt) {
    return '—';
  }
  return formatIsoDateAsJalali(lastLoginAt.slice(0, 10));
}

function StaffAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0) || '؟';

  return (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700"
    >
      {initial}
    </span>
  );
}

function StaffActions({
  staff,
  rolesById,
  currentStaffId,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  disabled,
}: {
  staff: StaffListItemDto;
  rolesById: Map<string, RoleResponseDto>;
  currentStaffId?: string;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (staff: StaffListItemDto) => void;
  onDelete: (staff: StaffListItemDto) => void;
  disabled?: boolean;
}) {
  const deleteAllowed = canDelete && canDeleteStaff(staff.id, staff.roleIds, rolesById, currentStaffId);
  const deleteTooltip =
    staff.id === currentStaffId
      ? 'نمی‌توانید حساب خود را حذف کنید'
      : 'مالک tenant قابل حذف نیست';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canUpdate ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onEdit(staff)}
        >
          ویرایش
        </Button>
      ) : null}
      {canDelete ? (
        <span title={deleteAllowed ? undefined : deleteTooltip}>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={disabled || !deleteAllowed}
            onClick={() => onDelete(staff)}
          >
            حذف
          </Button>
        </span>
      ) : null}
    </div>
  );
}

export function StaffTableSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="در حال بارگذاری کارمندان">
      <div className="h-28 animate-pulse rounded-lg bg-neutral-100" />
      <div className="hidden h-64 animate-pulse rounded-lg bg-neutral-100 md:block" />
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}

export function StaffTable({
  items,
  search,
  roles,
  branchesById,
  currentStaffId,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  disabled = false,
}: StaffTableProps) {
  const rolesById = rolesByIdMap(roles);
  const filteredItems = filterStaffBySearch(items, search);

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-start text-neutral-600">
              <th className="px-2 py-2 font-medium">کارمند</th>
              <th className="px-2 py-2 font-medium">شماره</th>
              <th className="px-2 py-2 font-medium">نقش</th>
              <th className="px-2 py-2 font-medium">شعب</th>
              <th className="px-2 py-2 font-medium">وضعیت</th>
              <th className="px-2 py-2 font-medium">آخرین ورود</th>
              <th className="px-2 py-2 font-medium">
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((staff) => (
              <tr key={staff.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-3">
                    <StaffAvatar name={staff.name} />
                    <span className="font-medium text-neutral-900">{staff.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2 font-mono text-neutral-700" dir="ltr">
                  {maskPhone(staff.phone)}
                </td>
                <td className="px-2 py-2">
                  <RoleBadges roles={resolveRoleEmbeds(staff.roleIds, rolesById)} />
                </td>
                <td className="px-2 py-2">
                  <BranchChips labels={resolveBranchLabels(staff.assignedBranchIds, branchesById)} />
                </td>
                <td className="px-2 py-2">
                  <StaffStatusBadge status={staff.status} />
                </td>
                <td className="px-2 py-2 text-neutral-700">{formatLastLogin(staff.lastLoginAt)}</td>
                <td className="px-2 py-2">
                  <StaffActions
                    staff={staff}
                    rolesById={rolesById}
                    currentStaffId={currentStaffId}
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
        {filteredItems.map((staff) => (
          <article
            key={staff.id}
            className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <StaffAvatar name={staff.name} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="font-medium text-neutral-900">{staff.name}</h3>
                <p className="font-mono text-sm text-neutral-700" dir="ltr">
                  {maskPhone(staff.phone)}
                </p>
              </div>
              <StaffStatusBadge status={staff.status} />
            </div>

            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-neutral-500">نقش</dt>
                <dd className="mt-1">
                  <RoleBadges roles={resolveRoleEmbeds(staff.roleIds, rolesById)} />
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">شعب</dt>
                <dd className="mt-1">
                  <BranchChips labels={resolveBranchLabels(staff.assignedBranchIds, branchesById)} />
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">آخرین ورود</dt>
                <dd className="text-neutral-700">{formatLastLogin(staff.lastLoginAt)}</dd>
              </div>
            </dl>

            <div className="mt-4">
              <StaffActions
                staff={staff}
                rolesById={rolesById}
                currentStaffId={currentStaffId}
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
