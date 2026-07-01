'use client';

import type { BranchListItemDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';
import { useEffect, useRef } from 'react';

type DeleteBranchDialogProps = {
  open: boolean;
  branch: BranchListItemDto | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteBranchDialog({
  open,
  branch,
  loading = false,
  onClose,
  onConfirm,
}: DeleteBranchDialogProps) {
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

  function handleClose() {
    if (loading) {
      return;
    }
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-lg border border-neutral-200 p-0 backdrop:bg-black/30"
      onClose={handleClose}
      onCancel={(event) => {
        if (loading) {
          event.preventDefault();
        }
      }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">حذف شعبه</h2>
          <p className="text-sm text-neutral-700">
            آیا از حذف شعبه «{branch?.name ?? '—'}» مطمئنید؟
          </p>
          <p className="text-sm text-amber-800">
            شعبه از لیست حذف می‌شود و دیگر در انتخاب شعبه نمایش داده نمی‌شود.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            انصراف
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => void onConfirm()}
          >
            {loading ? 'در حال حذف...' : 'حذف شعبه'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
