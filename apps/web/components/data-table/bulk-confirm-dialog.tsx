'use client';

import { formatPersianDigits } from '@hivork/i18n';
import { Button } from '@hivork/ui';

type BulkConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  selectedCount: number;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BulkConfirmDialog({
  open,
  title,
  description,
  selectedCount,
  confirmLabel = 'تأیید',
  loading = false,
  onConfirm,
  onCancel,
}: BulkConfirmDialogProps) {
  if (!open) {
    return null;
  }

  const resolvedTitle = title.includes('{n}')
    ? title.replace('{n}', formatPersianDigits(selectedCount))
    : title;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-labelledby="bulk-confirm-title"
      aria-describedby={description ? 'bulk-confirm-description' : undefined}
    >
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-lg">
        <h2 id="bulk-confirm-title" className="text-lg font-semibold text-foreground">
          {resolvedTitle}
        </h2>
        {description ? (
          <p id="bulk-confirm-description" className="mt-2 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? 'در حال انجام…' : confirmLabel}
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
            انصراف
          </Button>
        </div>
      </div>
    </dialog>
  );
}
