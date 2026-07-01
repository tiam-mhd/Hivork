'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';

import { fetchAccountSecurity } from '@/lib/auth/change-password';
import { useAdminSession } from '@/lib/layout/admin-session-context';

const CHANGE_PASSWORD_PATH = '/auth/change-password';

export function MustChangePasswordGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, staff } = useAdminSession();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !staff) {
      return;
    }

    if (pathname.startsWith(CHANGE_PASSWORD_PATH)) {
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const security = await fetchAccountSecurity();
        if (!cancelled && security.mustChangePassword) {
          router.replace(CHANGE_PASSWORD_PATH);
        } else {
          checkedRef.current = true;
        }
      } catch {
        checkedRef.current = true;
      }
    }

    if (!checkedRef.current) {
      void check();
    }

    return () => {
      cancelled = true;
    };
  }, [isLoading, pathname, router, staff]);

  return children;
}
