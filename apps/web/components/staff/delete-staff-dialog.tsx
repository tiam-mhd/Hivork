'use client';

import type { StaffListItemDto } from '@hivork/contracts/core';
import { Button } from '@hivork/ui';

type DeleteStaffDialogProps = {
  open: boolean;
  staff: StaffListItemDto | null;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DeleteStaffDialog({
  open,
  staff,
  loading = false,
  onClose,
  onConfirm,
}: DeleteStaffDialogProps) {
  if (!open || !staff) {
    return null;
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-auto w-[min(100%,28rem)] rounded-lg border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      aria-labelledby="delete-staff-title"
    >
      <form
        method="dialog"
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void onConfirm();
        }}
      >
        <div className="flex flex-col gap-2">
          <h2 id="delete-staff-title" className="text-lg font-semibold text-neutral-900">
            حذف کارمند
          </h2>
          <p className="text-sm text-neutral-600">
            آیا از حذف «{staff.name}» مطمئن هستید؟
          </p>
          <p className="text-sm text-amber-800">
            کارمند از لیست حذف می‌شود و دیگر نمی‌تواند وارد شود.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading ? 'در حال حذف...' : 'حذف کارمند'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
