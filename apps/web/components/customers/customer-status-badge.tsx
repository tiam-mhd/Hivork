'use client';

import type { TenantCustomerLinkStatusDto } from '@hivork/contracts/customers';
import { cn } from '@hivork/ui';

const STATUS_LABELS: Record<TenantCustomerLinkStatusDto, string> = {
  active: 'فعال',
  archived: 'بایگانی',
  blacklisted: 'بلک‌لیست',
};

const STATUS_STYLES: Record<TenantCustomerLinkStatusDto, string> = {
  active: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  archived: 'bg-muted text-muted-foreground',
  blacklisted: 'bg-destructive/10 text-destructive',
};

type CustomerStatusBadgeProps = {
  linkStatus?: TenantCustomerLinkStatusDto;
  isBlacklisted?: boolean;
  className?: string;
};

export function CustomerStatusBadge({
  linkStatus,
  isBlacklisted,
  className,
}: CustomerStatusBadgeProps) {
  const status: TenantCustomerLinkStatusDto =
    isBlacklisted || linkStatus === 'blacklisted'
      ? 'blacklisted'
      : linkStatus ?? 'active';

  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
