'use client';

import type { ThemeColorMode } from '@hivork/contracts/theme';
import type { ReactNode } from 'react';

import { MustChangePasswordGate } from '@/components/auth/must-change-password-gate';
import { AdminShell } from '@/components/layout/admin-shell';
import { QueryProvider } from '@/components/providers/query-provider';
import { StaffAuthProvider } from '@/lib/auth/staff-auth-context';
import { AdminSessionProvider } from '@/lib/layout/admin-session-context';

type AdminLayoutClientProps = {
  children: ReactNode;
  initialThemeId: string;
  initialColorMode: ThemeColorMode;
};

export function AdminLayoutClient({
  children,
  initialThemeId,
  initialColorMode,
}: AdminLayoutClientProps) {
  return (
    <QueryProvider>
      <StaffAuthProvider>
        <AdminSessionProvider>
          <MustChangePasswordGate>
            <AdminShell initialThemeId={initialThemeId} initialColorMode={initialColorMode}>
              {children}
            </AdminShell>
          </MustChangePasswordGate>
        </AdminSessionProvider>
      </StaffAuthProvider>
    </QueryProvider>
  );
}
