'use client';

import { Button } from '@hivork/ui';

type OptimisticLockDialogProps = {
  open: boolean;
  loading?: boolean;
  onReload: () => void;
  onClose: () => void;
};

export function OptimisticLockDialog({
  open,
  loading = false,
  onReload,
  onClose,
}: OptimisticLockDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-labelledby="optimistic-lock-title"
      aria-describedby="optimistic-lock-description"
    >
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
        <h2 id="optimistic-lock-title" className="text-lg font-semibold text-foreground">
          تداخل در به‌روزرسانی
        </h2>
        <p id="optimistic-lock-description" className="mt-2 text-sm text-muted-foreground">
          اطلاعات این مشتری توسط شخص دیگری تغییر کرده است. برای ادامه، آخرین نسخه را بارگذاری
          کنید.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" disabled={loading} onClick={onReload}>
            {loading ? 'در حال بارگذاری…' : 'بارگذاری مجدد'}
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            انصراف
          </Button>
        </div>
      </div>
    </dialog>
  );
}
