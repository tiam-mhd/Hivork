'use client';

import type { RoleResponseDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import { useEffect, useState } from 'react';

import { OwnerRolesGuard } from '@/components/roles/owner-role-guard';
import { DeleteRoleDialog, SystemRoleDetailModal } from '@/components/roles/role-dialogs';
import { RolesList, RolesListSkeleton } from '@/components/roles/roles-list';
import { usePermission } from '@/hooks/use-permission';
import { useRolesList } from '@/hooks/use-roles';
import {
  ROLE_CREATE_PERMISSION,
  ROLE_DELETE_PERMISSION,
  ROLE_UPDATE_PERMISSION,
  splitRoles,
} from '@/lib/roles/roles.utils';

export default function RolesPage() {
  return (
    <OwnerRolesGuard>
      <RolesPageContent />
    </OwnerRolesGuard>
  );
}

function RolesPageContent() {
  const canCreate = usePermission(ROLE_CREATE_PERMISSION);
  const canUpdate = usePermission(ROLE_UPDATE_PERMISSION);
  const canDelete = usePermission(ROLE_DELETE_PERMISSION);

  const { items, loading, error, toast, deleting, retry, deleteRole, clearToast } = useRolesList();

  const [systemDetail, setSystemDetail] = useState<RoleResponseDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleResponseDto | null>(null);

  const { systemRoles, customRoles } = splitRoles(items);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5_000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return;
    }

    const success = await deleteRole(deleteTarget);
    if (success) {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">نقش‌ها</h1>
          <p className="text-sm text-neutral-600">مدیریت نقش‌ها و مجوزهای دسترسی — فقط مالک</p>
        </div>
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
        <RolesListSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-700">خطا در بارگذاری نقش‌ها</p>
          <p className="text-sm text-neutral-600">{error}</p>
          <Button type="button" onClick={retry}>
            تلاش مجدد
          </Button>
        </div>
      ) : (
        <RolesList
          systemRoles={systemRoles}
          customRoles={customRoles}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onViewSystem={setSystemDetail}
          onDelete={setDeleteTarget}
          disabled={deleting}
        />
      )}

      <SystemRoleDetailModal
        open={Boolean(systemDetail)}
        role={systemDetail}
        onClose={() => setSystemDetail(null)}
      />

      <DeleteRoleDialog
        open={Boolean(deleteTarget)}
        role={deleteTarget}
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
