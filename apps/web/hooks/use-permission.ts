'use client';

import { useMemo } from 'react';

import { useAdminSession } from '@/lib/layout/admin-session-context';
import {
  ADMIN_MENU,
  filterMenuByPermissions,
  hasAnyPermission,
  hasPermission,
  permissionSetFromList,
  type NavItem,
} from '@/lib/navigation/admin-menu';

export function usePermissions(): Set<string> {
  const { staff } = useAdminSession();
  return useMemo(() => permissionSetFromList(staff?.permissions ?? []), [staff?.permissions]);
}

export function usePermission(code: string): boolean {
  const permissions = usePermissions();
  const { isLoading } = useAdminSession();
  if (isLoading) {
    return false;
  }
  return hasPermission(permissions, code);
}

export function useAnyPermission(codes: string[]): boolean {
  const permissions = usePermissions();
  const { isLoading } = useAdminSession();
  if (isLoading) {
    return false;
  }
  return hasAnyPermission(permissions, codes);
}

export function useFilteredAdminMenu(): NavItem[] {
  const { staff, isLoading } = useAdminSession();

  return useMemo(() => {
    if (isLoading || !staff) {
      return [];
    }
    return filterMenuByPermissions(ADMIN_MENU, staff.permissions);
  }, [isLoading, staff]);
}
