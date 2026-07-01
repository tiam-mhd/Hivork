'use client';

import { Suspense } from 'react';

import {
  SecuritySettingsPanel,
  SecuritySettingsPanelSkeleton,
} from '@/components/settings/security/security-settings-panel';

export default function SecuritySettingsPage() {
  return (
    <Suspense fallback={<SecuritySettingsPanelSkeleton />}>
      <SecuritySettingsPanel />
    </Suspense>
  );
}
