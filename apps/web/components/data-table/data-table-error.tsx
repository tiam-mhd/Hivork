'use client';

import { cn } from '@hivork/ui';

type DataTableErrorProps = {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function DataTableError({
  message = 'خطا در بارگذاری',
  onRetry,
  retryLabel = 'تلاش مجدد',
}: DataTableErrorProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium',
            'transition-colors hover:bg-muted',
          )}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
