'use client';

import type { StaffListItemDto, StaffResponseDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import { useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { DeleteStaffDialog } from '@/components/staff/delete-staff-dialog';
import { StaffFilters } from '@/components/staff/staff-filters';
import { StaffFormModal } from '@/components/staff/staff-form-modal';
import { StaffTable, StaffTableSkeleton } from '@/components/staff/staff-table';
import { usePermission } from '@/hooks/use-permission';
import { useStaff } from '@/hooks/use-staff';
import { useAdminSession } from '@/lib/layout/admin-session-context';
import type { StaffFormValues } from '@/lib/staff/staff-form.schema';
import { isStaffOwner, rolesByIdMap } from '@/lib/staff/staff.utils';
import {
  STAFF_CREATE_PERMISSION,
  STAFF_DELETE_PERMISSION,
  STAFF_UPDATE_PERMISSION,
  STAFF_VIEW_PERMISSION,
} from '@/lib/staff/staff.utils';

export default function StaffPage() {
  return (
    <RequirePermission permission={STAFF_VIEW_PERMISSION}>
      <StaffPageContent />
    </RequirePermission>
  );
}

function StaffEmptyState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-white p-12 text-center">
      <p className="text-lg font-medium text-neutral-900">هنوز کارمندی ثبت نشده</p>
      <p className="text-sm text-neutral-600">
        برای شروع، اولین کارمند را ثبت کنید. پس از ثبت می‌تواند با OTP وارد شود.
      </p>
      {canCreate ? (
        <Button type="button" onClick={onCreate}>
          ＋ کارمند جدید
        </Button>
      ) : null}
    </div>
  );
}

function StaffPageContent() {
  const { staff: currentStaff } = useAdminSession();
  const canCreate = usePermission(STAFF_CREATE_PERMISSION);
  const canUpdate = usePermission(STAFF_UPDATE_PERMISSION);
  const canDelete = usePermission(STAFF_DELETE_PERMISSION);

  const {
    items,
    hasMore,
    loading,
    loadingMore,
    saving,
    deleting,
    error,
    forbidden,
    toast,
    filters,
    fieldErrors,
    roles,
    branches,
    branchesById,
    lookupsLoading,
    lookupsError,
    setFilters,
    loadMore,
    retry,
    fetchStaffDetail,
    createStaff,
    updateStaff,
    deleteStaff,
    clearToast,
    clearFieldErrors,
    refetchLookups,
  } = useStaff(currentStaff?.id);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingStaff, setEditingStaff] = useState<StaffResponseDto | null>(null);
  const [editingListItem, setEditingListItem] = useState<StaffListItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffListItemDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5_000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  function openCreateModal() {
    setFormMode('create');
    setEditingStaff(null);
    setEditingListItem(null);
    clearFieldErrors();
    setFormOpen(true);
  }

  async function openEditModal(listItem: StaffListItemDto) {
    setFormMode('edit');
    setEditingListItem(listItem);
    clearFieldErrors();
    setDetailLoading(true);
    setFormOpen(true);

    const detail = await fetchStaffDetail(listItem.id);
    setEditingStaff(detail);
    setDetailLoading(false);

    if (!detail) {
      setFormOpen(false);
    }
  }

  async function handleFormSubmit(values: StaffFormValues) {
    const success =
      formMode === 'create'
        ? await createStaff(values)
        : editingStaff && editingListItem
          ? await updateStaff(
              editingStaff.id,
              values,
              editingStaff.roles.map((role) => role.id).filter((id): id is string => Boolean(id)),
              isStaffOwner(
                editingListItem.roleIds,
                rolesByIdMap(roles),
              ),
            )
          : false;

    if (success) {
      setFormOpen(false);
      setEditingStaff(null);
      setEditingListItem(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const success = await deleteStaff(deleteTarget);
    if (success) {
      setDeleteTarget(null);
    }
  }

  if (forbidden) {
    return <NoPermissionPage required={STAFF_VIEW_PERMISSION} />;
  }

  const isEmpty = !loading && !error && items.length === 0;
  const pageBusy = loading || lookupsLoading;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">کارمندان</h1>
          <p className="text-sm text-neutral-600">مدیریت تیم، نقش‌ها و دسترسی شعب</p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={openCreateModal} disabled={pageBusy}>
            ＋ کارمند جدید
          </Button>
        ) : null}
      </div>

      {toast ? (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {lookupsError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>بارگذاری نقش‌ها یا شعب ناموفق بود: {lookupsError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetchLookups()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <StaffFilters
        value={filters}
        branches={branches}
        onChange={setFilters}
        disabled={pageBusy || saving || deleting}
      />

      {pageBusy ? (
        <StaffTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری کارمندان</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <StaffEmptyState canCreate={canCreate} onCreate={openCreateModal} />
      ) : (
        <>
          <StaffTable
            items={items}
            search={filters.search}
            roles={roles}
            branchesById={branchesById}
            currentStaffId={currentStaff?.id}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={(staff) => void openEditModal(staff)}
            onDelete={setDeleteTarget}
            disabled={saving || deleting}
          />

          {hasMore ? (
            <div className="flex justify-center">
              <Button type="button" variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'در حال بارگذاری...' : 'بارگذاری بیشتر →'}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <StaffFormModal
        open={formOpen}
        mode={formMode}
        staff={editingStaff}
        roles={roles}
        branches={branches}
        loading={saving || detailLoading}
        fieldErrors={fieldErrors}
        onClose={() => {
          if (!saving && !detailLoading) {
            setFormOpen(false);
            setEditingStaff(null);
            setEditingListItem(null);
          }
        }}
        onSubmit={handleFormSubmit}
        onClearFieldErrors={clearFieldErrors}
      />

      <DeleteStaffDialog
        open={Boolean(deleteTarget)}
        staff={deleteTarget}
        loading={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
