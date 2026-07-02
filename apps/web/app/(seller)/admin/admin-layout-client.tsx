'use client';

import type { ReactNode } from 'react';

import { MustChangePasswordGate } from '@/components/auth/must-change-password-gate';
import { AdminShell } from '@/components/layout/admin-shell';
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { RealtimeProvider } from '@/components/providers/realtime-provider';
import { StaffAuthProvider } from '@/lib/auth/staff-auth-context';
import { AdminSessionProvider } from '@/lib/layout/admin-session-context';
import { UndoProvider } from '@/lib/undo/undo-manager';

type AdminLayoutClientProps = {
  children: ReactNode;
  initialThemeId: string;
  initialThemeMode: 'light' | 'dark' | 'system';
};

export function AdminLayoutClient({
  children,
  initialThemeId,
  initialThemeMode,
}: AdminLayoutClientProps) {
  return (
    <QueryProvider>
      <StaffAuthProvider>
        <UndoProvider>
          <KeyboardShortcutsProvider>
            <RealtimeProvider>
              <AdminSessionProvider>
                <MustChangePasswordGate>
                  <AdminShell initialThemeId={initialThemeId} initialThemeMode={initialThemeMode}>
                    {children}
                  </AdminShell>
                </MustChangePasswordGate>
              </AdminSessionProvider>
            </RealtimeProvider>
          </KeyboardShortcutsProvider>
        </UndoProvider>
      </StaffAuthProvider>
    </QueryProvider>
  );
}
