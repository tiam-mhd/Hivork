'use client';

import { Button } from '@hivork/ui';
import { useEffect, type ReactNode } from 'react';

type PaymentsSideDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function PaymentsSideDrawer({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: PaymentsSideDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="بستن"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-lg flex-col border-s border-border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payments-drawer-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="payments-drawer-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            بستن
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <div className="border-t border-border p-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
