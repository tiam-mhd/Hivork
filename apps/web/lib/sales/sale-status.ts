import type { SaleStatusDto } from '@hivork/contracts/installments';

export type SaleStatus = SaleStatusDto;

type SaleStatusPresentation = {
  label: string;
  className: string;
  emoji: string;
};

const SALE_STATUS_PRESENTATION: Record<SaleStatus, SaleStatusPresentation> = {
  active: {
    label: 'فعال',
    className:
      'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
    emoji: '🟢',
  },
  completed: {
    label: 'تکمیل‌شده',
    className: 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300',
    emoji: '✅',
  },
  cancelled: {
    label: 'لغو‌شده',
    className: 'bg-muted text-muted-foreground ring-border',
    emoji: '⚫',
  },
  terminated: {
    label: 'مختومه',
    className: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
    emoji: '⛔',
  },
  closed: {
    label: 'بسته‌شده',
    className: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/25 dark:text-indigo-300',
    emoji: '📦',
  },
  archived: {
    label: 'بایگانی',
    className: 'bg-stone-500/10 text-stone-700 ring-stone-500/25 dark:text-stone-300',
    emoji: '🗄️',
  },
};

export function getSaleStatusPresentation(status: SaleStatus): SaleStatusPresentation {
  return SALE_STATUS_PRESENTATION[status];
}
