'use client';

import { Button } from '@hivork/ui';
import { useEffect, useRef } from 'react';

type ImpactWarningDialogProps = {
  open: boolean;
  roleName: string;
  staffCount: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ImpactWarningDialog({
  open,
  roleName,
  staffCount,
  loading = false,
  onClose,
  onConfirm,
}: ImpactWarningDialogProps) {
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

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[60] m-auto w-[min(100%,28rem)] rounded-lg border border-amber-200 bg-white p-0 shadow-xl backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) {
          onClose();
        }
      }}
      aria-labelledby="impact-warning-title"
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void onConfirm();
        }}
      >
        <div className="flex flex-col gap-2">
          <h2 id="impact-warning-title" className="text-lg font-semibold text-amber-900">
            ⚠️ تأثیر تغییرات
          </h2>
          <p className="text-sm text-neutral-700">
            این تغییرات بلافاصله روی{' '}
            <span className="font-semibold">{staffCount}</span> کارمند با نقش «
            <span className="font-semibold">{roleName}</span>» اعمال می‌شود.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'در حال ذخیره...' : 'تأیید و ذخیره'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
