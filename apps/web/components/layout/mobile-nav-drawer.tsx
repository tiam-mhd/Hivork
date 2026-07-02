'use client';

import { useEffect, useRef } from 'react';

import { AdminSidebar } from './admin-sidebar';

import { BrandMark } from '@/components/brand/brand-mark';
import { ADMIN_SHELL_VERSION } from '@/lib/navigation/admin-menu';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    function handleClose() {
      onClose();
    }

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="layout-drawer layout-glass-panel fixed start-0 top-0 m-0 h-full max-h-none w-drawer max-w-none border p-0 shadow-[var(--layout-drawer-shadow)] open:animate-in"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-drawer-border px-4 py-3">
          <BrandMark subtitle="منو" logoSize={28} compact />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="بستن منو"
            className="flex size-10 items-center justify-center rounded-md hover:bg-drawer-close-hover"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <AdminSidebar className="border-0" onNavigate={onClose} />

        <div className="layout-glass-footer border-t border-footer-border px-4 py-3 text-xs text-footer-foreground">
          {ADMIN_SHELL_VERSION}
        </div>
      </div>
    </dialog>
  );
}
