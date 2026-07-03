'use client';

import { Button } from '@hivork/ui';
import { useEffect, useRef, type ReactNode } from 'react';

type OperationDialogProps = {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function OperationDialog({
  open,
  title,
  description,
  loading = false,
  onClose,
  children,
}: OperationDialogProps) {
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
      className="w-[min(100%,32rem)] rounded-xl border border-border bg-background p-0 shadow-xl backdrop:bg-black/40"
      onClose={() => {
        if (!loading) {
          onClose();
        }
      }}
    >
      <form method="dialog" className="flex flex-col gap-4 p-5" onSubmit={(event) => event.preventDefault()}>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </dialog>
  );
}
