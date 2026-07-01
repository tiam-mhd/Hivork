'use client';

import type { StaffMfaStatusResponseDto } from '@hivork/contracts';
import Link from 'next/link';

import { SecurityCard, SecurityCardLink, SecurityStatusBadge } from '@/components/settings/security/security-card';

type MfaCardProps = {
  status: StaffMfaStatusResponseDto | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function MfaCard({ status, loading, error, onRetry }: MfaCardProps) {
  return (
    <SecurityCard
      title="احراز هویت دو مرحله‌ای (2FA)"
      description="ورود امن‌تر با اپلیکیشن Authenticator."
      badge={
        loading ? (
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">…</span>
        ) : status ? (
          <SecurityStatusBadge active={status.totpEnabled} />
        ) : null
      }
      footer={
        <SecurityCardLink href="/admin/settings/security/mfa" label="مدیریت 2FA" />
      }
    >
      {loading ? (
        <div className="h-4 w-48 animate-pulse rounded bg-neutral-200" />
      ) : error ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            className="text-sm text-primary underline-offset-4 hover:underline"
            onClick={onRetry}
          >
            تلاش مجدد
          </button>
        </div>
      ) : status ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">TOTP</dt>
            <dd className="font-medium">{status.totpEnabled ? 'فعال' : 'غیرفعال'}</dd>
          </div>
          {status.totpEnabled ? (
            <div>
              <dt className="text-muted-foreground">کدهای پشتیبان باقی‌مانده</dt>
              <dd className="font-medium">{status.backupCodesRemaining}</dd>
            </div>
          ) : (
            <div>
              <dt className="text-muted-foreground">OTP ورود</dt>
              <dd className="font-medium">{status.otpStepUpEnabled ? 'فعال' : 'غیرفعال'}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">
          وضعیت 2FA در دسترس نیست.{' '}
          <Link href="/admin/settings/security/mfa" className="text-primary underline-offset-4 hover:underline">
            تنظیمات 2FA
          </Link>
        </p>
      )}
    </SecurityCard>
  );
}
