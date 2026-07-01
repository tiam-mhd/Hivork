'use client';

import type { RoleResponseDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ImpactWarningDialog } from '@/components/roles/impact-warning-dialog';
import { OwnerRolesGuard } from '@/components/roles/owner-role-guard';
import { RoleForm } from '@/components/roles/role-form';
import { useRoleDetail, useRoleMutation } from '@/hooks/use-roles';
import type { RoleFormValues } from '@/lib/roles/role-form.schema';

export default function EditRolePage() {
  return (
    <OwnerRolesGuard>
      <EditRolePageContent />
    </OwnerRolesGuard>
  );
}

function EditRolePageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roleId = params.id;

  const { role, loading, error, forbidden, refetch } = useRoleDetail(roleId);
  const { saving, fieldErrors, toast, updateRole, clearToast, clearFieldErrors } = useRoleMutation();

  const [pendingValues, setPendingValues] = useState<RoleFormValues | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5_000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  useEffect(() => {
    if (role?.isSystem) {
      router.replace('/admin/roles');
    }
  }, [role, router]);

  function handleSubmit(values: RoleFormValues) {
    setPendingValues(values);
    setWarningOpen(true);
  }

  async function handleConfirmSave() {
    if (!pendingValues || !roleId) {
      return;
    }

    const updated = await updateRole(roleId, pendingValues);
    if (updated) {
      setWarningOpen(false);
      setPendingValues(null);
      router.push('/admin/roles');
    }
  }

  if (forbidden) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        دسترسی به این صفحه فقط برای مالک مجاز است.
      </div>
    );
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-neutral-100" aria-busy="true" />;
  }

  if (error || !role) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm text-red-700">خطا در بارگذاری نقش</p>
        <p className="text-sm text-neutral-600">{error ?? 'نقش یافت نشد.'}</p>
        <Button type="button" onClick={() => void refetch()}>
          تلاش مجدد
        </Button>
      </div>
    );
  }

  return (
    <EditRoleForm
      role={role}
      saving={saving}
      fieldErrors={fieldErrors}
      toast={toast}
      warningOpen={warningOpen}
      pendingValues={pendingValues}
      onSubmit={handleSubmit}
      onConfirmSave={handleConfirmSave}
      onCloseWarning={() => {
        if (!saving) {
          setWarningOpen(false);
        }
      }}
      onCancel={() => router.push('/admin/roles')}
      onClearFieldErrors={clearFieldErrors}
    />
  );
}

function EditRoleForm({
  role,
  saving,
  fieldErrors,
  toast,
  warningOpen,
  pendingValues,
  onSubmit,
  onConfirmSave,
  onCloseWarning,
  onCancel,
  onClearFieldErrors,
}: {
  role: RoleResponseDto;
  saving: boolean;
  fieldErrors: ReturnType<typeof useRoleMutation>['fieldErrors'];
  toast: string | null;
  warningOpen: boolean;
  pendingValues: RoleFormValues | null;
  onSubmit: (values: RoleFormValues) => void;
  onConfirmSave: () => Promise<void>;
  onCloseWarning: () => void;
  onCancel: () => void;
  onClearFieldErrors: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" size="sm" className="w-fit" asChild>
          <Link href="/admin/roles">← بازگشت به نقش‌ها</Link>
        </Button>
        <h1 className="text-2xl font-bold">ویرایش نقش</h1>
        <p className="text-sm text-neutral-600">{role.name}</p>
      </div>

      {toast ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {toast}
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <RoleForm
          mode="edit"
          initialRole={role}
          loading={saving}
          fieldErrors={fieldErrors}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onClearFieldErrors={onClearFieldErrors}
        />
      </div>

      <ImpactWarningDialog
        open={warningOpen}
        roleName={pendingValues?.name ?? role.name}
        staffCount={role.assignedStaffCount ?? 0}
        loading={saving}
        onClose={onCloseWarning}
        onConfirm={onConfirmSave}
      />
    </div>
  );
}
