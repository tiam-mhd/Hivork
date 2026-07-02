'use client';

import type { ThemeColorMode, ThemeModePreference } from '@hivork/contracts/theme';
import { ThemeProvider as BaseThemeProvider } from '@hivork/theme/react';
import type { ReactNode } from 'react';

import { useTenantThemeSync } from '@/hooks/use-tenant-theme-sync';

export type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeModePreference;
  /** @deprecated Use defaultTheme */
  defaultColorMode?: ThemeColorMode;
  themeId?: string;
  tenantThemeId?: string | null;
};

export function ThemeProvider({
  children,
  defaultTheme,
  defaultColorMode,
  themeId,
  tenantThemeId,
}: ThemeProviderProps) {
  return (
    <BaseThemeProvider
      initialThemeId={themeId}
      initialThemeMode={defaultTheme}
      initialColorMode={defaultColorMode}
    >
      <TenantThemeSync tenantThemeId={tenantThemeId} />
      {children}
    </BaseThemeProvider>
  );
}

function TenantThemeSync({ tenantThemeId }: { tenantThemeId?: string | null }) {
  useTenantThemeSync(tenantThemeId);
  return null;
}
