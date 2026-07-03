import type { CheckStatusDto, CheckTypeDto } from '@hivork/contracts/payments';

export const CHECK_STATUS_LABELS: Record<CheckStatusDto, string> = {
  registered: 'ثبت‌شده',
  due: 'سررسید',
  collected: 'وصول‌شده',
  bounced: 'برگشتی',
  transferred: 'منتقل‌شده',
  cancelled: 'لغوشده',
};

export const CHECK_TYPE_LABELS: Record<CheckTypeDto, string> = {
  received: 'دریافتی',
  payable: 'پرداختی',
};

export type CheckStatusTone = 'neutral' | 'warning' | 'success' | 'destructive' | 'info';

export function checkStatusTone(status: CheckStatusDto, dueDateIso?: string): CheckStatusTone {
  if (status === 'collected') return 'success';
  if (status === 'bounced') return 'destructive';
  if (status === 'transferred') return 'info';
  if (status === 'due' || status === 'registered') {
    if (dueDateIso && isDueWithinDays(dueDateIso, 3)) {
      return 'warning';
    }
    return status === 'due' ? 'warning' : 'neutral';
  }
  return 'neutral';
}

export function checkStatusBadgeClass(tone: CheckStatusTone): string {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'destructive':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
    case 'warning':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100';
    case 'info':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function isDueWithinDays(dueDateIso: string, days: number): boolean {
  const due = new Date(dueDateIso).getTime();
  const now = Date.now();
  const limit = days * 24 * 60 * 60 * 1000;
  return due >= now && due - now <= limit;
}

export const CHECK_TRACKING_ACTION_LABELS: Record<string, string> = {
  'check.register': 'ثبت چک',
  'check.register.payable': 'ثبت چک پرداختی',
  'check.collect': 'وصول چک',
  'check.bounce': 'برگشت چک',
  'check.transfer': 'انتقال چک',
  'check.tracking.note': 'یادداشت پیگیری',
  'check.tracking.image': 'آپلود تصویر',
};

export function checkTrackingActionLabel(action: string): string {
  return CHECK_TRACKING_ACTION_LABELS[action] ?? action;
}
