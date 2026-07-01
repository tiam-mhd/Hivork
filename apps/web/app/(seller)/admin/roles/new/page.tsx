'use client';

import { Button } from '@hivork/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ImpactWarningDialog } from '@/components/roles/impact-warning-dialog';
import { OwnerRolesGuard } from '@/components/roles/owner-role-guard';
import { RoleForm } from '@/components/roles/role-form';
import { useRoleMutation } from '@/hooks/use-roles';
import type { RoleFormValues } from '@/lib/roles/role-form.schema';

export default function NewRolePage() {
  return (
    <OwnerRolesGuard>
      <NewRolePageContent />
    </OwnerRolesGuard>
  );
}

function NewRolePageContent() {
  const router = useRouter();
  const { saving, fieldErrors, toast, createRole, clearToast, clearFieldErrors } = useRoleMutation();
  const [pendingValues, setPendingValues] = useState<RoleFormValues | null>(null);
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => clearToast(), 5_000);
    return () => clearTimeout(timer);
  }, [clearToast, toast]);

  function handleSubmit(values: RoleFormValues) {
    setPendingValues(values);
    setWarningOpen(true);
  }

  async function handleConfirmSave() {
    if (!pendingValues) {
      return;
    }

    const created = await createRole(pendingValues);
    if (created) {
      setWarningOpen(false);
      setPendingValues(null);
      router.push('/admin/roles');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Button type="button" variant="outline" size="sm" className="w-fit" asChild>
          <Link href="/admin/roles">← بازگشت به نقش‌ها</Link>
        </Button>
        <h1 className="text-2xl font-bold">نقش جدید</h1>
        <p className="text-sm text-neutral-600">ایجاد نقش سفارشی با مجوزهای دلخواه</p>
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
          mode="create"
          loading={saving}
          fieldErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/admin/roles')}
          onClearFieldErrors={clearFieldErrors}
        />
      </div>

      <ImpactWarningDialog
        open={warningOpen}
        roleName={pendingValues?.name ?? ''}
        staffCount={0}
        loading={saving}
        onClose={() => {
          if (!saving) {
            setWarningOpen(false);
          }
        }}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}
