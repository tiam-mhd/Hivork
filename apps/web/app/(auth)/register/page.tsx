'use client';

import type { AuthResponseDto, BranchListResponseDto, OtpRequestResponseDto, VerifiedTokenResponseDto } from '@hivork/contracts';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@hivork/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { apiFetch, ApiClientError } from '../../../lib/api/client';
import { setAccessToken, setActiveBranchId } from '../../../lib/auth/session';
import { setStaffSessionMarker } from '../../../lib/auth/session-marker';

import { CaptchaWidget, type CaptchaWidgetHandle } from '@/components/auth/captcha-widget';
import { CAPTCHA_I18N, isCaptchaEnabledClient } from '@/lib/auth/captcha-config';

type Step = 'otp-request' | 'otp-verify' | 'register';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('otp-request');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [code, setCode] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetHandle>(null);

  async function requestOtp() {
    setError(null);
    if (isCaptchaEnabledClient() && !captchaToken) {
      setError(CAPTCHA_I18N.required);
      return;
    }
    setLoading(true);
    try {
      await apiFetch<OtpRequestResponseDto>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({
          phone: ownerPhone,
          actor: 'staff',
          intent: 'register',
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });
      setStep('otp-verify');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'خطا در ارسال کد');
      if (
        err instanceof ApiClientError &&
        (err.code === 'AUTH_CAPTCHA_INVALID' || err.code === 'AUTH_CAPTCHA_REQUIRED')
      ) {
        captchaRef.current?.reset();
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<VerifiedTokenResponseDto>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          phone: ownerPhone,
          code,
          actor: 'staff',
          intent: 'register',
        }),
      });
      setVerifiedToken(result.verifiedToken);
      setStep('register');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'کد تأیید نامعتبر است');
    } finally {
      setLoading(false);
    }
  }

  async function registerTenant() {
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<AuthResponseDto>('/tenants/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          ownerName,
          ownerPhone,
          verifiedToken,
        }),
      });

      if (!result.accessToken) {
        throw new Error('توکن دسترسی دریافت نشد');
      }

      setAccessToken(result.accessToken);
      setStaffSessionMarker();

      const branches = await apiFetch<BranchListResponseDto>('/branches?limit=50');
      const activeBranches = branches.data.filter((branch) => branch.isActive);
      if (activeBranches.length > 0) {
        const branchId =
          activeBranches.find((branch) => branch.isDefault)?.id ?? activeBranches[0]!.id;
        await apiFetch('/staff/me/active-branch', {
          method: 'PATCH',
          body: JSON.stringify({ branchId }),
        });
        setActiveBranchId(branchId);
      }

      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'ثبت‌نام فروشگاه ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="app-card w-full">
      <CardHeader>
        <CardTitle>ثبت‌نام فروشگاه جدید</CardTitle>
        <CardDescription>
          حساب دارید؟{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            ورود
          </Link>
          {' · '}
          مرحله {step === 'otp-request' ? 1 : step === 'otp-verify' ? 2 : 3} از ۳
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
          {step === 'otp-request' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-phone">شماره موبایل</Label>
                <Input
                  id="owner-phone"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="09123456789"
                />
              </div>
              <CaptchaWidget ref={captchaRef} onTokenChange={setCaptchaToken} disabled={loading} />
              <Button type="button" disabled={loading || !ownerPhone} onClick={requestOtp}>
                {loading ? 'در حال ارسال...' : 'دریافت کد تأیید'}
              </Button>
            </>
          )}

          {step === 'otp-verify' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="otp-code">کد ۵ رقمی</Label>
                <Input
                  id="otp-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="12345"
                  maxLength={5}
                />
              </div>
              <Button type="button" disabled={loading || code.length !== 5} onClick={verifyOtp}>
                {loading ? 'در حال بررسی...' : 'تأیید کد'}
              </Button>
            </>
          )}

          {step === 'register' && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shop-name">نام فروشگاه</Label>
                <Input id="shop-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="shop-slug">شناسه (slug)</Label>
                <Input
                  id="shop-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-shop"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="owner-name">نام مالک</Label>
                <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
              <Button
                type="button"
                disabled={loading || !name || !slug || !ownerName}
                onClick={registerTenant}
              >
                {loading ? 'در حال ثبت...' : 'ایجاد فروشگاه'}
              </Button>
            </>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
