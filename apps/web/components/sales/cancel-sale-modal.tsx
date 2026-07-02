'use client';

import type { SaleDetailEnterpriseDto } from '@hivork/contracts/installments';
import { Button, Input, Label } from '@hivork/ui';
import { useEffect, useId, useRef, useState } from 'react';

import { formatSaleDisplayTitle } from '@/lib/sales/sale-cancel.utils';

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

type CancelSaleModalProps = {
  open: boolean;
  sale: SaleDetailEnterpriseDto;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function CancelSaleModal({
  open,
  sale,
  loading = false,
  onClose,
  onConfirm,
}: CancelSaleModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  function handleClose() {
    if (loading) {
      return;
    }
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();

    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(`دلیل لغو باید حداقل ${MIN_REASON_LENGTH} کاراکتر باشد.`);
      return;
    }

    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(`دلیل لغو نباید بیشتر از ${MAX_REASON_LENGTH} کاراکتر باشد.`);
      return;
    }

    setError(null);
    await onConfirm(trimmed);
  }

  const saleLabel = formatSaleDisplayTitle(sale);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50"
      onClose={handleClose}
      onCancel={(event) => {
        if (loading) {
          event.preventDefault();
        }
      }}
    >
      <form className="flex flex-col gap-4 p-5" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">لغو فروش</h2>
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200" role="note">
            ⚠ این عمل قابل بازگشت نیست.
          </p>
          <p className="text-sm text-muted-foreground">
            آیا از لغو فروش {saleLabel} مطمئنید؟
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={reasonId}>
            دلیل لغو <span className="text-red-600">*</span>
          </Label>
          <Input
            id={reasonId}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            placeholder="مثال: مشتری پشیمان شد"
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={`${reasonId}-help`}
          />
          <p id={`${reasonId}-help`} className="text-xs text-muted-foreground">
            این دلیل در گزارش audit ثبت می‌شود.
          </p>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            انصراف
          </Button>
          <Button type="submit" variant="destructive" disabled={loading}>
            {loading ? 'در حال لغو...' : 'لغو فروش'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
