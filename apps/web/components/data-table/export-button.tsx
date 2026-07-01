'use client';

import type { ExportCustomersRequestDto } from '@hivork/contracts/customers';
import type { CreatePrintSnapshotDto, ExportFormatDto } from '@hivork/contracts/core';
import { Button, cn } from '@hivork/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePermission } from '@/hooks/use-permission';
import { apiFetch } from '@/lib/api/client';
import { apiDownload, ApiClientError, triggerBrowserDownload } from '@/lib/api/download';

type ExportButtonProps = {
  permission: string;
  buildRequest: () => Omit<ExportCustomersRequestDto, 'format'>;
  printResourceKey?: 'customers';
  disabled?: boolean;
  className?: string;
  onToast?: (message: string) => void;
};

type ExportAction = 'xlsx' | 'pdf' | 'print';

const ACTION_LABELS: Record<ExportAction, string> = {
  xlsx: 'Excel',
  pdf: 'PDF',
  print: 'چاپ',
};

export function ExportButton({
  permission,
  buildRequest,
  printResourceKey = 'customers',
  disabled = false,
  className,
  onToast,
}: ExportButtonProps) {
  const canExport = usePermission(permission);
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ExportAction | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const runExport = useCallback(
    async (action: ExportAction) => {
      setOpen(false);
      setActiveAction(action);

      if (action === 'print') {
        onToast?.('در حال آماده‌سازی پیش‌نمایش چاپ…');
        try {
          const body: CreatePrintSnapshotDto = {
            resourceKey: printResourceKey,
            orientation: 'portrait',
            ...buildRequest(),
          };
          const created = await apiFetch<{ token: string; expiresAt: string }>('/print-snapshots', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          const printUrl = `/print/${printResourceKey}?token=${created.token}`;
          window.open(printUrl, '_blank', 'noopener,noreferrer');
          onToast?.('پیش‌نمایش چاپ در تب جدید باز شد');
        } catch (error) {
          if (error instanceof ApiClientError && error.code === 'PDF_ROW_LIMIT') {
            onToast?.('تعداد ردیف‌ها برای چاپ زیاد است. فیلترها را محدودتر کنید یا Excel بگیرید.');
            return;
          }
          if (error instanceof ApiClientError && error.code === 'RATE_LIMIT_EXCEEDED') {
            onToast?.('درخواست‌های خروجی زیاد است. یک دقیقه صبر کنید.');
            return;
          }
          onToast?.(error instanceof Error ? error.message : 'خطا در آماده‌سازی چاپ');
        } finally {
          setActiveAction(null);
        }
        return;
      }

      const format: ExportFormatDto = action;
      const toastLabel = action === 'pdf' ? 'PDF' : 'Excel';
      onToast?.(`در حال آماده‌سازی فایل ${toastLabel}…`);

      try {
        const result = await apiDownload('/customers/export', {
          method: 'POST',
          body: JSON.stringify({
            ...buildRequest(),
            format,
          }),
        });

        const defaultName =
          action === 'pdf' ? 'customers-export.pdf' : 'customers-export.xlsx';
        triggerBrowserDownload(result.blob, result.filename ?? defaultName);

        if (result.rowCount === 0) {
          onToast?.('داده‌ای برای خروجی نیست');
        } else {
          onToast?.(`دانلود فایل ${toastLabel} آغاز شد`);
        }
      } catch (error) {
        if (error instanceof ApiClientError && error.code === 'EXPORT_LIMIT_EXCEEDED') {
          onToast?.('تعداد ردیف‌ها از حد مجاز Excel بیشتر است. فیلترها را محدودتر کنید.');
          return;
        }
        if (error instanceof ApiClientError && error.code === 'PDF_ROW_LIMIT') {
          onToast?.('تعداد ردیف‌ها برای PDF زیاد است. فیلترها را محدودتر کنید یا Excel بگیرید.');
          return;
        }
        if (error instanceof ApiClientError && error.code === 'RATE_LIMIT_EXCEEDED') {
          onToast?.('درخواست‌های خروجی زیاد است. یک دقیقه صبر کنید.');
          return;
        }
        if (error instanceof ApiClientError && error.code === 'PDF_GENERATION_FAILED') {
          onToast?.('ساخت PDF ناموفق بود. دوباره تلاش کنید.');
          return;
        }
        onToast?.(error instanceof Error ? error.message : `خطا در خروجی ${toastLabel}`);
      } finally {
        setActiveAction(null);
      }
    },
    [buildRequest, onToast, printResourceKey],
  );

  if (!canExport) {
    return null;
  }

  const busy = activeAction !== null;

  return (
    <div ref={panelRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-10 gap-1.5"
        disabled={disabled || busy}
        aria-busy={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        {busy ? 'در حال آماده‌سازی…' : 'خروجی'}
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 z-40 mt-2 min-w-36 rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {(['xlsx', 'pdf', 'print'] as const).map((action) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className="flex w-full items-center rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
              disabled={busy}
              onClick={() => void runExport(action)}
            >
              {ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
