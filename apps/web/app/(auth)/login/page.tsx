'use client';

import type { AuthResponseDto, BranchListResponseDto, OtpRequestResponseDto, PasswordLoginResponseDto } from '@hivork/contracts';
import { ErrorCodes } from '@hivork/contracts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hivork/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useReducer, useRef, useState } from 'react';

import { BranchSelectStep } from '@/components/auth/branch-select-step';
import { LoginTabs, type LoginTab } from '@/components/auth/login-tabs';
import { OtpStep } from '@/components/auth/otp-step';
import { PasswordLoginForm } from '@/components/auth/password-login-form';
import { PhoneStep } from '@/components/auth/phone-step';
import { TenantSelectStep } from '@/components/auth/tenant-select-step';
import { apiFetch, ApiClientError } from '@/lib/api/client';
import { setAccessToken, setActiveBranchId } from '@/lib/auth/auth-token';
import {
  initialLoginFlowState,
  loginFlowReducer,
} from '@/lib/auth/login-flow';
import { setNewIpAlertPending } from '@/lib/auth/new-ip-alert';
import { parseTenantOptions } from '@/lib/auth/parse-tenant-options';
import { setStaffSessionMarker } from '@/lib/auth/session-marker';
import { useCountdown } from '@/lib/auth/use-countdown';

const RATE_LIMIT_MS = 60_000;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passwordResetSuccess = searchParams.get('reset') === '1';
  const [activeTab, setActiveTab] = useState<LoginTab>('otp');
  const [state, dispatch] = useReducer(loginFlowReducer, initialLoginFlowState);
  const rateLimitSeconds = useCountdown(state.rateLimitUntil);
  const resendSeconds = useCountdown(state.resendUntil);
  const verifyInFlightRef = useRef(false);

  const redirectAfterLogin = useCallback(() => {
    const next = searchParams.get('next');
    router.replace(next?.startsWith('/admin') ? next : '/admin/dashboard');
  }, [router, searchParams]);

  const completeLogin = useCallback(
    async (auth: AuthResponseDto) => {
      if (auth.newIpAlert) {
        setNewIpAlertPending(true);
      }

      setAccessToken(auth.accessToken);
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

      dispatch({
        type: 'GO_BRANCH',
        branches: activeBranches,
        branchId: activeBranches.find((b) => b.isDefault)?.id ?? activeBranches[0]?.id,
      });
    },
    [redirectAfterLogin],
  );

  const completePasswordSession = useCallback(
    async (session: Extract<PasswordLoginResponseDto, { kind: 'session' }>) => {
      await completeLogin({
        accessToken: session.accessToken,
        expiresIn: session.expiresIn,
        staff: session.staff,
        tenant: session.tenant,
      });
    },
    [completeLogin],
  );

  const verifyOtp = useCallback(
    async (tenantSlug?: string, codeOverride?: string) => {
      const otpCode = codeOverride ?? state.otpCode;
      if (otpCode.length !== 5 || verifyInFlightRef.current) {
        return;
      }

      verifyInFlightRef.current = true;
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });

      try {
        const result = await apiFetch<AuthResponseDto>('/auth/otp/verify', {
          method: 'POST',
          body: JSON.stringify({
            phone: state.phone,
            code: otpCode,
            actor: 'staff',
            intent: 'login',
            ...(tenantSlug ? { tenantSlug } : {}),
            rememberMe: state.rememberMe,
          }),
        });

        await completeLogin(result);
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.code === 'NEED_TENANT_SLUG' && err.httpStatus === 409) {
            const tenants = parseTenantOptions(err.details);
            if (tenants.length > 0) {
              dispatch({ type: 'NEED_TENANT', tenants });
              return;
            }
          }

          if (err.code === ErrorCodes.OTP_INVALID || err.code === ErrorCodes.OTP_EXPIRED) {
            dispatch({ type: 'OTP_INVALID' });
            return;
          }

          if (err.code === ErrorCodes.STAFF_SUSPENDED) {
            dispatch({
              type: 'SET_ERROR',
              error: 'حساب کاربری غیرفعال است. با پشتیبانی تماس بگیرید.',
            });
            return;
          }

          dispatch({ type: 'SET_ERROR', error: err.message });
          return;
        }

        dispatch({ type: 'SET_ERROR', error: 'خطا در ارتباط با سرور. دوباره تلاش کنید.' });
      } finally {
        verifyInFlightRef.current = false;
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [state.phone, state.otpCode, state.rememberMe, completeLogin],
  );

  async function requestOtp(phone: string, captchaToken?: string) {
    dispatch({ type: 'SET_PHONE', phone });
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      await apiFetch<OtpRequestResponseDto>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          actor: 'staff',
          intent: 'login',
          ...(captchaToken ? { captchaToken } : {}),
        }),
      });
      dispatch({ type: 'OTP_SENT' });
    } catch (err) {
      if (err instanceof ApiClientError && err.httpStatus === 429) {
        const retryAfter =
          typeof err.details?.retryAfter === 'number' ? err.details.retryAfter * 1000 : RATE_LIMIT_MS;
        dispatch({ type: 'RATE_LIMITED', until: Date.now() + retryAfter });
        return;
      }

      dispatch({
        type: 'SET_ERROR',
        error: err instanceof ApiClientError ? err.message : 'خطا در ارسال کد',
      });
    }
  }

  async function handleBranchSubmit() {
    if (!state.selectedBranchId) {
      return;
    }

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      await apiFetch('/staff/me/active-branch', {
        method: 'PATCH',
        body: JSON.stringify({ branchId: state.selectedBranchId }),
      });
      setActiveBranchId(state.selectedBranchId);
      redirectAfterLogin();
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof ApiClientError ? err.message : 'انتخاب شعبه ناموفق بود',
      });
    }
  }

  const otpFlowActive = activeTab === 'otp' && state.step !== 'phone';
  const tabDisabled = state.loading;

  return (
    <Card className="app-card w-full">
      <CardHeader>
        <CardTitle>ورود پرسنل</CardTitle>
        <CardDescription>
          فروشگاه جدید؟{' '}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            ثبت‌نام
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {passwordResetSuccess ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            رمز عبور با موفقیت تغییر کرد. اکنون با رمز جدید وارد شوید.
          </div>
        ) : null}
        <LoginTabs
          value={activeTab}
          onChange={setActiveTab}
          disabled={tabDisabled && otpFlowActive}
        />

        {activeTab === 'password' ? (
          <PasswordLoginForm onSession={completePasswordSession} />
        ) : null}

        {activeTab === 'otp' && state.step === 'phone' ? (
          <div id="login-panel-otp" role="tabpanel" aria-labelledby="login-tab-otp">
            <PhoneStep
              defaultPhone={state.phone}
              rememberMe={state.rememberMe}
              loading={state.loading}
              rateLimitSeconds={rateLimitSeconds}
              error={state.error}
              onRememberMeChange={(rememberMe) =>
                dispatch({ type: 'SET_REMEMBER_ME', rememberMe })
              }
              onSubmit={(phone, captchaToken) => void requestOtp(phone, captchaToken)}
            />
          </div>
        ) : null}

        {activeTab === 'otp' && state.step === 'otp' ? (
          <div id="login-panel-otp" role="tabpanel" aria-labelledby="login-tab-otp">
            <OtpStep
              phone={state.phone}
              code={state.otpCode}
              loading={state.loading}
              error={state.error}
              shake={state.otpShake}
              resendSeconds={resendSeconds}
              onCodeChange={(code) => dispatch({ type: 'SET_OTP', code })}
              onSubmit={(code) => void verifyOtp(undefined, code)}
              onResend={() => {
                const token = undefined;
                void requestOtp(state.phone, token);
              }}
              onBack={() => dispatch({ type: 'BACK' })}
            />
          </div>
        ) : null}

        {activeTab === 'otp' && state.step === 'tenant' ? (
          <div id="login-panel-otp" role="tabpanel" aria-labelledby="login-tab-otp">
            <TenantSelectStep
              tenants={state.tenants}
              selectedSlug={state.selectedTenantSlug}
              loading={state.loading}
              error={state.error}
              onSelect={(slug) => dispatch({ type: 'SELECT_TENANT', slug })}
              onSubmit={() => {
                if (state.selectedTenantSlug) {
                  void verifyOtp(state.selectedTenantSlug);
                }
              }}
              onBack={() => dispatch({ type: 'BACK' })}
            />
          </div>
        ) : null}

        {activeTab === 'otp' && state.step === 'branch' ? (
          <div id="login-panel-otp" role="tabpanel" aria-labelledby="login-tab-otp">
            <BranchSelectStep
              branches={state.branches}
              selectedBranchId={state.selectedBranchId}
              loading={state.loading}
              error={state.error}
              onSelect={(branchId) => dispatch({ type: 'SELECT_BRANCH', branchId })}
              onSubmit={() => void handleBranchSubmit()}
              onBack={() => dispatch({ type: 'BACK' })}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
