'use client';

import type { ReactNode } from 'react';

import { RequirePermission } from '@/components/auth/require-permission';
import { NoPermissionPage } from '@/components/layout/no-permission-page';
import { ROLE_PAGE_PERMISSION } from '@/lib/roles/roles.utils';

type OwnerRolesGuardProps = {
  children: ReactNode;
};

function OwnerOnlyNoPermission() {
  return (
    <NoPermissionPage
      required={ROLE_PAGE_PERMISSION}
      backHref="/admin/dashboard"
    />
  );
}

export function OwnerRolesGuard({ children }: OwnerRolesGuardProps) {
  return (
    <RequirePermission permission={ROLE_PAGE_PERMISSION} fallback={<OwnerOnlyNoPermission />}>
      {children}
    </RequirePermission>
  );
}
