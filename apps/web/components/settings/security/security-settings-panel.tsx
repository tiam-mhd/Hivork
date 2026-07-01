'use client';

import type { StaffMfaStatusResponseDto } from '@hivork/contracts';
import { useCallback, useEffect, useState } from 'react';

import { ApiKeysCard } from '@/components/settings/security/api-keys-card';
import { IpAllowlistCard } from '@/components/settings/security/ip-allowlist-card';
import { MfaCard } from '@/components/settings/security/mfa-card';
import { PasswordCard, PhoneCard } from '@/components/settings/security/password-phone-cards';
import { SessionsCard } from '@/components/settings/security/sessions-card';
import { fetchMfaStatus, isMfaSettingsApiError } from '@/lib/auth/mfa-settings';
import { getErrorMessageFa } from '@/lib/i18n/error-messages.fa';

export function SecuritySettingsPanel() {
  const [mfaStatus, setMfaStatus] = useState<StaffMfaStatusResponseDto | null>(null);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const loadMfa = useCallback(async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const status = await fetchMfaStatus();
      setMfaStatus(status);
    } catch (err) {
      if (isMfaSettingsApiError(err)) {
        setMfaError(getErrorMessageFa(err.code, err.message));
      } else {
        setMfaError('بارگذاری وضعیت 2FA ناموفق بود.');
      }
      setMfaStatus(null);
    } finally {
      setMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMfa();
  }, [loadMfa]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">امنیت</h1>
        <p className="text-sm text-muted-foreground">
          رمز عبور، احراز هویت دو مرحله‌ای، نشست‌ها و تنظیمات IP ورود staff.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <PasswordCard />
        <MfaCard
          status={mfaStatus}
          loading={mfaLoading}
          error={mfaError}
          onRetry={() => void loadMfa()}
        />
        <SessionsCard />
        <PhoneCard />
        <ApiKeysCard />
        <div className="lg:col-span-2">
          <IpAllowlistCard />
        </div>
      </div>
    </div>
  );
}

export function SecuritySettingsPanelSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
