import {
  COLOR_MODE_COOKIE_NAME,
  resolveThemeModePreference,
  resolveThemeId,
  THEME_COOKIE_NAME,
  THEME_MODE_COOKIE_NAME,
} from '@hivork/theme';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { AdminLayoutClient } from './admin-layout-client';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const initialThemeId = resolveThemeId(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const initialThemeMode = resolveThemeModePreference(
    cookieStore.get(THEME_MODE_COOKIE_NAME)?.value ?? cookieStore.get(COLOR_MODE_COOKIE_NAME)?.value,
  );

  return (
    <AdminLayoutClient initialThemeId={initialThemeId} initialThemeMode={initialThemeMode}>
      {children}
    </AdminLayoutClient>
  );
}
