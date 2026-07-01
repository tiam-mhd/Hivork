'use client';

import type { TenantResponseDto } from '@hivork/contracts';
import { cn } from '@hivork/ui';

type TenantBadgeProps = {
  tenant: TenantResponseDto;
  className?: string;
};

export function TenantBadge({ tenant, className }: TenantBadgeProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {tenant.logoUrl ? (
        <span
          className="size-8 shrink-0 rounded-md bg-cover bg-center"
          style={{ backgroundImage: `url(${tenant.logoUrl})` }}
          role="img"
          aria-label={tenant.name}
        />
      ) : (
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground"
        >
          {tenant.name.slice(0, 1)}
        </span>
      )}
      <span className="truncate text-sm font-semibold text-header-foreground">{tenant.name}</span>
    </div>
  );
}
