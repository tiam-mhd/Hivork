'use client';

import { Button } from '@hivork/ui';

import { useRealtime } from '@/components/providers/realtime-provider';
import { getRealtimeEventTitle } from '@/lib/realtime/event-titles';

type NotificationPanelProps = {
  onClose: () => void;
};

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, status } = useRealtime();

  return (
    <div
      role="dialog"
      aria-label="پنل اعلان‌ها"
      className="absolute end-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-border bg-card shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-sm font-semibold">اعلان‌ها</p>
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            aria-label={`وضعیت اتصال: ${status}`}
            title={`وضعیت اتصال: ${status}`}
            data-status={status}
            style={{
              backgroundColor:
                status === 'connected'
                  ? 'var(--color-success, #16a34a)'
                  : status === 'connecting'
                    ? 'var(--color-warning, #ca8a04)'
                    : 'var(--color-muted-foreground, #9ca3af)',
            }}
          />
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>

      <ul className="max-h-80 overflow-y-auto py-1">
        {notifications.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            اعلان جدیدی ندارید
          </li>
        ) : (
          notifications.map((item) => (
            <li
              key={item.id}
              className="border-b border-border px-3 py-2 text-sm last:border-b-0"
            >
              <p className="font-medium">{getRealtimeEventTitle(item.type)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatEventTime(item.createdAt)}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
