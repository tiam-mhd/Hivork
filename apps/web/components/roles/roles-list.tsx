'use client';

import type { RoleResponseDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import Link from 'next/link';

import { DATA_SCOPE_LABELS } from '@/lib/roles/roles.utils';

type RolesListProps = {
  systemRoles: RoleResponseDto[];
  customRoles: RoleResponseDto[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onViewSystem: (role: RoleResponseDto) => void;
  onDelete: (role: RoleResponseDto) => void;
  disabled?: boolean;
};

function SystemBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
      سیستمی
    </span>
  );
}

function RoleCard({
  role,
  canUpdate,
  canDelete,
  onView,
  onDelete,
  disabled,
}: {
  role: RoleResponseDto;
  canUpdate: boolean;
  canDelete: boolean;
  onView?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-neutral-900">{role.name}</h3>
        {role.isSystem ? <SystemBadge /> : null}
      </div>

      <dl className="grid gap-2 text-sm text-neutral-700">
        <div>
          <dt className="text-neutral-500">شناسه</dt>
          <dd className="font-mono" dir="ltr">
            {role.code}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500">محدوده داده</dt>
          <dd>{DATA_SCOPE_LABELS[role.dataScope]}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">تعداد مجوزها</dt>
          <dd>{role.permissions.length}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        {role.isSystem ? (
          <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onView}>
            مشاهده جزئیات
          </Button>
        ) : (
          <>
            {canUpdate ? (
              <Button type="button" variant="outline" size="sm" disabled={disabled} asChild>
                <Link href={`/admin/roles/${role.id}`}>ویرایش</Link>
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={disabled}
                onClick={onDelete}
              >
                حذف
              </Button>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

export function RolesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="در حال بارگذاری نقش‌ها">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}

export function RolesList({
  systemRoles,
  customRoles,
  canCreate,
  canUpdate,
  canDelete,
  onViewSystem,
  onDelete,
  disabled = false,
}: RolesListProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">نقش‌های سیستمی</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {systemRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              canUpdate={false}
              canDelete={false}
              onView={() => onViewSystem(role)}
              disabled={disabled}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900">نقش‌های سفارشی</h2>
          {canCreate ? (
            <Button type="button" size="sm" disabled={disabled} asChild>
              <Link href="/admin/roles/new">＋ نقش جدید</Link>
            </Button>
          ) : null}
        </div>

        {customRoles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-sm text-neutral-600">
            هنوز نقش سفارشی ثبت نشده است.
            {canCreate ? (
              <div className="mt-3">
                <Button type="button" variant="outline" asChild>
                  <Link href="/admin/roles/new">ایجاد اولین نقش سفارشی</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {customRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onDelete={() => onDelete(role)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
