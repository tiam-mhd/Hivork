'use client';

import { Suspense } from 'react';

import { MfaSettingsPanel } from '@/components/settings/security/mfa-settings-panel';

export default function MfaSettingsPage() {
  return (
    <Suspense fallback={<MfaSettingsSkeleton />}>
      <MfaSettingsPanel />
    </Suspense>
  );
}

function MfaSettingsSkeleton() {
  return (
    <div className="mx-auto h-48 max-w-2xl animate-pulse rounded-xl bg-neutral-100" />
  );
}
