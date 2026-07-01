'use client';

import type { ReactNode } from 'react';

import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { usePermission } from '@/hooks/use-permission';
import { useAdminSession } from '@/lib/layout/admin-session-context';

type RequirePermissionProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { isLoading } = useAdminSession();
  const allowed = usePermission(permission);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="h-32 animate-pulse rounded bg-neutral-100" />
      </div>
    );
  }

  if (!allowed) {
    return fallback ?? <NoPermissionPage required={permission} />;
  }

  return children;
}
