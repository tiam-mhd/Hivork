'use client';

import type { RoleResponseDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import { useEffect, useRef } from 'react';

import { PermissionMatrixReadonly } from '@/components/roles/permission-matrix';
import { DATA_SCOPE_HELP, DATA_SCOPE_LABELS } from '@/lib/roles/roles.utils';

type SystemRoleDetailModalProps = {
  open: boolean;
  role: RoleResponseDto | null;
  onClose: () => void;
};

function SystemBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
      سیستمی
    </span>
  );
}

export function SystemRoleDetailModal({ open, role, onClose }: SystemRoleDetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!role) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(100%,40rem)] max-h-[90vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="system-role-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="system-role-title" className="text-lg font-semibold text-neutral-900">
            {role.name}
          </h2>
          <SystemBadge />
        </div>

        <p className="text-sm text-neutral-600">
          نقش‌های سیستمی فقط خواندنی هستند و قابل ویرایش یا حذف نیستند.
        </p>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">شناسه</dt>
            <dd className="font-mono text-neutral-900" dir="ltr">
              {role.code}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">محدوده داده</dt>
            <dd className="text-neutral-900">{DATA_SCOPE_LABELS[role.dataScope]}</dd>
            <dd className="text-xs text-neutral-500">{DATA_SCOPE_HELP[role.dataScope]}</dd>
          </div>
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-medium text-neutral-900">مجوزها</h3>
          <PermissionMatrixReadonly permissions={role.permissions} />
        </div>

        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </dialog>
  );
}

type DeleteRoleDialogProps = {
  open: boolean;
  role: RoleResponseDto | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteRoleDialog({
  open,
  role,
  loading = false,
  onClose,
  onConfirm,
}: DeleteRoleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!role) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-[min(100%,28rem)] rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) {
          onClose();
        }
      }}
      aria-labelledby="delete-role-title"
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void onConfirm();
        }}
      >
        <div className="flex flex-col gap-2">
          <h2 id="delete-role-title" className="text-lg font-semibold text-neutral-900">
            حذف نقش
          </h2>
          <p className="text-sm text-neutral-600">آیا از حذف نقش «{role.name}» مطمئن هستید؟</p>
          <p className="text-sm text-amber-800">
            اگر کارمندی این نقش را دارد، حذف امکان‌پذیر نیست.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading ? 'در حال حذف...' : 'حذف نقش'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
