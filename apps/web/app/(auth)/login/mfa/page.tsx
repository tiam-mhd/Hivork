'use client';

import type { BranchListResponseDto, MfaVerifySessionResponseDto } from '@hivork/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hivork/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { MfaVerifyForm } from '@/components/auth/mfa-verify-form';
import { apiFetch } from '@/lib/api/client';
import { setAccessToken, setActiveBranchId } from '@/lib/auth/auth-token';
import { setNewIpAlertPending } from '@/lib/auth/new-ip-alert';
import { setStaffSessionMarker } from '@/lib/auth/session-marker';

export default function LoginMfaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mfaToken = searchParams.get('token')?.trim() ?? '';

  const methods = useMemo(() => {
    const raw = searchParams.get('methods');
    if (!raw) {
      return ['otp', 'totp'] as const;
    }
    const parsed = raw
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is 'otp' | 'totp' => value === 'otp' || value === 'totp');
    return parsed.length > 0 ? parsed : (['otp', 'totp'] as const);
  }, [searchParams]);

  const redirectAfterLogin = useCallback(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  const completeSession = useCallback(
    async (session: MfaVerifySessionResponseDto) => {
      if (session.newIpAlert) {
        setNewIpAlertPending(true);
      }

      setAccessToken(session.accessToken);
      setStaffSessionMarker();

      const branches = await apiFetch<BranchListResponseDto>('/branches?limit=50');
      const activeBranches = branches.data.filter((branch) => branch.isActive);

      if (activeBranches.length === 1) {
        const branchId = activeBranches[0]!.id;
        await apiFetch('/staff/me/active-branch', {
          method: 'PATCH',
          body: JSON.stringify({ branchId }),
        });
        setActiveBranchId(branchId);
        redirectAfterLogin();
        return;
      }

      redirectAfterLogin();
    },
    [redirectAfterLogin],
  );

  if (!mfaToken) {
    return (
      <Card className="app-card w-full">
        <CardHeader>
          <CardTitle>تأیید هویت دو مرحله‌ای</CardTitle>
          <CardDescription>نشست تأیید منقضی شده یا لینک نامعتبر است.</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => router.replace('/login')}
          >
            بازگشت به ورود
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="app-card w-full">
      <CardHeader>
        <CardTitle>تأیید هویت دو مرحله‌ای</CardTitle>
        <CardDescription>برای تکمیل ورود، هویت خود را تأیید کنید.</CardDescription>
      </CardHeader>
      <CardContent>
        <MfaVerifyForm
          mfaToken={mfaToken}
          methods={[...methods]}
          onSession={completeSession}
        />
      </CardContent>
    </Card>
  );
}
