'use client';

import type { BranchListItemDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import { useEffect, useState } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { BranchFormModal } from '@/components/branches/branch-form-modal';
import { BranchesTable, BranchesTableSkeleton } from '@/components/branches/branches-table';
import { DeleteBranchDialog } from '@/components/branches/delete-branch-dialog';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { useBranches } from '@/hooks/use-branches';
import { usePermission } from '@/hooks/use-permission';
import {
  BRANCH_CREATE_PERMISSION,
  BRANCH_DELETE_PERMISSION,
  BRANCH_UPDATE_PERMISSION,
  BRANCH_VIEW_PERMISSION,
} from '@/lib/branches/branches.utils';

export default function BranchesPage() {
  return (
    <RequirePermission permission={BRANCH_VIEW_PERMISSION}>
      <BranchesPageContent />
    </RequirePermission>
  );
}

function BranchesEmptyState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-white p-12 text-center">
      <p className="text-lg font-medium text-neutral-900">هنوز شعبه‌ای ثبت نشده</p>
      <p className="text-sm text-neutral-600">برای شروع، اولین شعبه فروشگاه را ثبت کنید.</p>
      {canCreate ? (
        <Button type="button" onClick={onCreate}>
          ＋ شعبه جدید
        </Button>
      ) : null}
    </div>
  );
}

function BranchesPageContent() {
  const canCreate = usePermission(BRANCH_CREATE_PERMISSION);
  const canUpdate = usePermission(BRANCH_UPDATE_PERMISSION);
  const canDelete = usePermission(BRANCH_DELETE_PERMISSION);

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
    search,
    fieldErrors,
    setSearch,
    loadMore,
    retry,
    createBranch,
    updateBranch,
    deleteBranch,
    clearToast,
    clearFieldErrors,
  } = useBranches();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingBranch, setEditingBranch] = useState<BranchListItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchListItemDto | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5_000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  function openCreateModal() {
    setFormMode('create');
    setEditingBranch(null);
    clearFieldErrors();
    setFormOpen(true);
  }

  function openEditModal(branch: BranchListItemDto) {
    setFormMode('edit');
    setEditingBranch(branch);
    clearFieldErrors();
    setFormOpen(true);
  }

  async function handleFormSubmit(values: Parameters<typeof createBranch>[0]) {
    const success =
      formMode === 'create'
        ? await createBranch(values)
        : editingBranch
          ? await updateBranch(editingBranch.id, values)
          : false;

    if (success) {
      setFormOpen(false);
      setEditingBranch(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const success = await deleteBranch(deleteTarget);
    if (success) {
      setDeleteTarget(null);
    }
  }

  if (forbidden) {
    return <NoPermissionPage required={BRANCH_VIEW_PERMISSION} />;
  }

  const isEmpty = !loading && !error && items.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">شعب</h1>
          <p className="text-sm text-neutral-600">مدیریت شعب فروشگاه و اطلاعات تماس</p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={openCreateModal} disabled={loading}>
            ＋ شعبه جدید
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

      {loading ? (
        <BranchesTableSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری شعب</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : isEmpty ? (
        <BranchesEmptyState canCreate={canCreate} onCreate={openCreateModal} />
      ) : (
        <>
          <BranchesTable
            items={items}
            search={search}
            onSearchChange={setSearch}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onEdit={openEditModal}
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

      <BranchFormModal
        open={formOpen}
        mode={formMode}
        branch={editingBranch}
        loading={saving}
        fieldErrors={fieldErrors}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditingBranch(null);
          }
        }}
        onSubmit={handleFormSubmit}
        onClearFieldErrors={clearFieldErrors}
      />

      <DeleteBranchDialog
        open={Boolean(deleteTarget)}
        branch={deleteTarget}
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
